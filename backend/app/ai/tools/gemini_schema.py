"""
Converts TITAN's existing OpenAI-format tool definitions (app.ai.tools.definitions.TITAN_TOOLS)
into Gemini function-calling schema, so the tool/function-calling architecture (definitions.py +
executor.py) does not need to be duplicated or rewritten for the new provider.
"""
from typing import Any, Dict, List

from google.genai import types

from app.ai.tools.definitions import TITAN_TOOLS


def _strip_unsupported_schema_keys(schema: Any) -> Any:
    """Gemini's Schema is a JSON-Schema subset; drop keys it doesn't understand
    (e.g. 'additionalProperties') and recurse into nested schemas."""
    if isinstance(schema, dict):
        cleaned = {}
        for key, value in schema.items():
            if key in ("additionalProperties",):
                continue
            if key in ("properties",) and isinstance(value, dict):
                cleaned[key] = {k: _strip_unsupported_schema_keys(v) for k, v in value.items()}
            elif key == "items":
                cleaned[key] = _strip_unsupported_schema_keys(value)
            else:
                cleaned[key] = value
        return cleaned
    return schema


def build_gemini_tools() -> List[types.Tool]:
    """Build the Gemini Tool list from TITAN_TOOLS (used by both the text orchestrator
    and the Gemini Live voice session)."""
    declarations = []
    for entry in TITAN_TOOLS:
        fn = entry.get("function", {})
        params = _strip_unsupported_schema_keys(fn.get("parameters") or {"type": "object", "properties": {}})
        declarations.append(
            types.FunctionDeclaration(
                name=fn["name"],
                description=fn.get("description", ""),
                parameters=params,
            )
        )
    return [types.Tool(function_declarations=declarations)]


def gemini_tool_names() -> List[str]:
    return [entry["function"]["name"] for entry in TITAN_TOOLS]
