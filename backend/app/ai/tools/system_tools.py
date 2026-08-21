"""
Computer-assistant tools: search files, list directories, read files, open files,
and execute terminal/PowerShell commands.

Safety model:
- All filesystem access is confined to `settings.TITAN_FS_ROOT` (defaults to the backend's
  working directory). Paths that resolve outside of it are rejected.
- Shell commands are classified as "safe" or "destructive" via `_is_destructive_command`.
  Destructive commands are NEVER executed automatically - the tool returns
  `{"requires_confirmation": True, ...}` instead, and only runs once the caller
  re-invokes the tool with `confirm=True` (the assistant must surface this to the user
  and get explicit approval first; this is enforced in `app.ai.prompts`).
- `settings.TITAN_ALLOW_SHELL_TOOL` is a hard kill-switch for the run_command tool.
"""
import os
import platform
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict, List

from app.core.config import settings

# Command prefixes / patterns that are always treated as destructive and require confirmation.
_DESTRUCTIVE_PATTERNS = [
    r"\brm\b", r"\bdel\b", r"\berase\b", r"\bformat\b", r"\bmkfs\b", r"\bdd\b",
    r"\bshutdown\b", r"\breboot\b", r"\bhalt\b", r"\bpoweroff\b",
    r"remove-item", r"\bri\b", r"clear-disk", r"format-volume",
    r"drop\s+table", r"drop\s+database", r"truncate\s+table", r"delete\s+from",
    r">\s*/dev/", r":(){:", r"chmod\s+-R", r"chown\s+-R",
    r"git\s+push\s+.*--force", r"git\s+reset\s+--hard", r"git\s+clean\s+-[a-z]*f",
    r"kill\s+-9", r"taskkill", r"\bstop-process\b",
    r"\bnet\s+user\b", r"\breg\s+delete\b", r"\bfdisk\b", r"\bdiskpart\b",
]
_DESTRUCTIVE_RE = re.compile("|".join(_DESTRUCTIVE_PATTERNS), re.IGNORECASE)


def _is_destructive_command(command: str) -> bool:
    return bool(_DESTRUCTIVE_RE.search(command))


def _resolve_safe_path(relative_path: str) -> Path:
    """Resolve a user-supplied path against TITAN_FS_ROOT and ensure it stays inside it."""
    root = Path(settings.TITAN_FS_ROOT).resolve()
    candidate = (root / (relative_path or ".")).resolve()
    if root != candidate and root not in candidate.parents:
        raise PermissionError(
            f"Access denied: '{relative_path}' resolves outside the allowed TITAN workspace ({root})."
        )
    return candidate


def list_directory(path: str = ".") -> Dict[str, Any]:
    target = _resolve_safe_path(path)
    if not target.exists():
        return {"success": False, "error": f"Path not found: {path}"}
    if not target.is_dir():
        return {"success": False, "error": f"Not a directory: {path}"}

    entries: List[Dict[str, Any]] = []
    for item in sorted(target.iterdir(), key=lambda p: (p.is_file(), p.name.lower())):
        try:
            stat = item.stat()
            entries.append({
                "name": item.name,
                "type": "directory" if item.is_dir() else "file",
                "size_bytes": stat.st_size if item.is_file() else None,
            })
        except OSError:
            continue

    return {
        "success": True,
        "path": str(target),
        "count": len(entries),
        "entries": entries[:200],
    }


def search_files(query: str, path: str = ".", max_results: int = 20) -> Dict[str, Any]:
    if not query or not query.strip():
        return {"success": False, "error": "A search query is required."}

    target = _resolve_safe_path(path)
    if not target.exists():
        return {"success": False, "error": f"Path not found: {path}"}

    query_lower = query.strip().lower()
    matches: List[str] = []
    for dirpath, dirnames, filenames in os.walk(target):
        # skip common noise directories
        dirnames[:] = [d for d in dirnames if d not in (".git", "node_modules", "__pycache__", ".venv")]
        for fname in filenames:
            if query_lower in fname.lower():
                matches.append(str(Path(dirpath) / fname))
                if len(matches) >= max_results:
                    return {"success": True, "count": len(matches), "matches": matches}
    return {"success": True, "count": len(matches), "matches": matches}


def read_file(path: str, max_bytes: int = 20000) -> Dict[str, Any]:
    target = _resolve_safe_path(path)
    if not target.exists() or not target.is_file():
        return {"success": False, "error": f"File not found: {path}"}

    try:
        raw = target.read_bytes()[: max(1, int(max_bytes))]
        text = raw.decode("utf-8", errors="replace")
    except Exception as e:
        return {"success": False, "error": f"Could not read file: {e}"}

    return {
        "success": True,
        "path": str(target),
        "truncated": target.stat().st_size > max_bytes,
        "content": text,
    }


def open_file(path: str) -> Dict[str, Any]:
    """Best-effort: opens a file with the host OS's default application.
    Only works when the backend runs on the user's own machine (desktop context)."""
    target = _resolve_safe_path(path)
    if not target.exists():
        return {"success": False, "error": f"Path not found: {path}"}

    system = platform.system()
    try:
        if system == "Windows":
            os.startfile(str(target))  # type: ignore[attr-defined]
        elif system == "Darwin":
            subprocess.Popen(["open", str(target)])
        else:
            opener = shutil.which("xdg-open")
            if not opener:
                return {"success": False, "error": "No file opener (xdg-open) available on this system."}
            subprocess.Popen([opener, str(target)])
        return {"success": True, "action": "file_opened", "path": str(target)}
    except Exception as e:
        return {"success": False, "error": f"Could not open file: {e}"}


def run_command(command: str, confirm: bool = False, timeout_seconds: int = 20) -> Dict[str, Any]:
    if not settings.TITAN_ALLOW_SHELL_TOOL:
        return {"success": False, "error": "Command execution is disabled by server configuration (TITAN_ALLOW_SHELL_TOOL=false)."}
    if not command or not command.strip():
        return {"success": False, "error": "No command provided."}

    if _is_destructive_command(command) and not confirm:
        return {
            "success": False,
            "requires_confirmation": True,
            "command": command,
            "message": (
                "This command looks destructive/irreversible. Ask the user to explicitly confirm, "
                "then re-run this tool with confirm=true."
            ),
        }

    root = Path(settings.TITAN_FS_ROOT).resolve()
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=str(root),
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )
        return {
            "success": result.returncode == 0,
            "action": "command_executed",
            "command": command,
            "cwd": str(root),
            "exit_code": result.returncode,
            "stdout": result.stdout[-8000:],
            "stderr": result.stderr[-4000:],
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": f"Command timed out after {timeout_seconds}s."}
    except Exception as e:
        return {"success": False, "error": str(e)}
