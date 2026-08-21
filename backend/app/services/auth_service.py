from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationException, TitanException
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.models.settings import UserSettings
from app.models.activity import ActivityLog
from app.schemas.user import UserCreate, UserUpdate


async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


async def register_user(db: AsyncSession, user_in: UserCreate) -> User:
    existing_user = await get_user_by_email(db, user_in.email)
    if existing_user:
        raise TitanException(status_code=400, detail="A user with this email already exists")

    hashed_pw = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email.lower(),
        hashed_password=hashed_pw,
        full_name=user_in.full_name,
        is_active=True,
    )
    db.add(new_user)
    await db.flush()

    # Create default user settings
    default_settings = UserSettings(
        user_id=new_user.id,
        timezone="UTC",
        theme="dark",
        voice_speed=1.0,
        voice_pitch=1.0,
        notification_enabled=True,
    )
    db.add(default_settings)

    # Log registration activity
    activity = ActivityLog(
        user_id=new_user.id,
        action_type="account_created",
        entity_type="user",
        entity_id=str(new_user.id),
        details={"email": new_user.email},
    )
    db.add(activity)
    await db.commit()
    await db.refresh(new_user)
    return new_user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    user = await get_user_by_email(db, email)
    if not user:
        raise AuthenticationException("Incorrect email or password")
    if not verify_password(password, user.hashed_password):
        raise AuthenticationException("Incorrect email or password")
    if not user.is_active:
        raise AuthenticationException("User account is inactive")
    return user


async def update_user(db: AsyncSession, user_id: int, user_update: UserUpdate) -> User:
    user = await get_user_by_id(db, user_id)
    if not user:
        raise AuthenticationException("User not found")

    if user_update.email is not None and user_update.email.lower() != user.email:
        existing = await get_user_by_email(db, user_update.email)
        if existing:
            raise TitanException(status_code=400, detail="Email is already taken")
        user.email = user_update.email.lower()

    if user_update.full_name is not None:
        user.full_name = user_update.full_name

    if user_update.password is not None and user_update.password.strip():
        user.hashed_password = get_password_hash(user_update.password)

    await db.commit()
    await db.refresh(user)
    return user
