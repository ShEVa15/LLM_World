from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

DATABASE_URL = "sqlite+aiosqlite:///./agents.db?foreign_keys=on"

engine = create_async_engine(
    DATABASE_URL,
    echo=True,  # TODO откладка, после MVP лучше офнуть
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
)

Base = declarative_base()