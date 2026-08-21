import asyncio
import os
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.database.base import Base
from app.database.session import get_db
from app.main import app
from app.models.user import User
from app.models.settings import UserSettings
from app.core.security import create_access_token, get_password_hash

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    future=True,
)

TestAsyncSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
async def prepare_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session() -> AsyncSession:
    async with TestAsyncSessionLocal() as session:
        yield session


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncClient:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def test_user_a(db_session: AsyncSession) -> User:
    user = User(
        email="alex@titan.ai",
        hashed_password=get_password_hash("TitanPassword123!"),
        full_name="Alex Mercer",
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()

    user_settings = UserSettings(
        user_id=user.id,
        timezone="America/New_York",
        theme="dark",
        voice_speed=1.0,
    )
    db_session.add(user_settings)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_user_b(db_session: AsyncSession) -> User:
    user = User(
        email="sarah@titan.ai",
        hashed_password=get_password_hash("TitanPassword456!"),
        full_name="Sarah Connor",
        is_active=True,
    )
    db_session.add(user)
    await db_session.flush()

    user_settings = UserSettings(
        user_id=user.id,
        timezone="Europe/London",
        theme="dark",
        voice_speed=1.0,
    )
    db_session.add(user_settings)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers_a(test_user_a: User) -> dict:
    token = create_access_token(subject=test_user_a.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_b(test_user_b: User) -> dict:
    token = create_access_token(subject=test_user_b.id)
    return {"Authorization": f"Bearer {token}"}
