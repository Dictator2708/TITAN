from typing import AsyncGenerator
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationException
from app.core.security import decode_access_token
from app.database.session import get_db
from app.models.user import User
from app.services.auth_service import get_user_by_id

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    if not token:
        raise AuthenticationException("Authentication token is missing")

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise AuthenticationException("Invalid authentication token")

    user_id_str = payload.get("sub")
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise AuthenticationException("Invalid token payload")

    user = await get_user_by_id(db, user_id)
    if not user:
        raise AuthenticationException("User does not exist")
    if not user.is_active:
        raise AuthenticationException("User account is inactive")

    return user
