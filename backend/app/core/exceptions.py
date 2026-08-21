from typing import Any, Optional, Dict
from fastapi import HTTPException, status


class TitanException(HTTPException):
    def __init__(
        self,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail: Any = None,
        headers: Optional[Dict[str, str]] = None,
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class NotFoundException(TitanException):
    def __init__(self, resource: str, resource_id: Any = None):
        detail = f"{resource} not found"
        if resource_id is not None:
            detail = f"{resource} with identifier '{resource_id}' was not found."
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class AuthenticationException(TitanException):
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class PermissionDeniedException(TitanException):
    def __init__(self, detail: str = "Not authorized to access this resource"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class ValidationException(TitanException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


class MissingServiceCredentialException(TitanException):
    def __init__(self, service_name: str, env_var_name: str):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "missing_credential",
                "service": service_name,
                "environment_variable": env_var_name,
                "message": f"The {service_name} integration is not configured. Please set the {env_var_name} environment variable to enable this feature.",
            },
        )
