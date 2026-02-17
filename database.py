from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

# Файл базы данных создастся автоматически в этой же папке (agents.db)
DATABASE_URL = "sqlite+aiosqlite:///./agents.db?foreign_keys=on"

engine = create_async_engine(
    DATABASE_URL,
    echo=True,  # Выводит SQL-запросы в консоль (удобно для отладки)
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
)

Base = declarative_base()