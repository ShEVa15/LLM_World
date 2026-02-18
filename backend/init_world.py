import asyncio
from database import engine, Base, AsyncSessionLocal
import models

INITIAL_AGENTS = [
    {
        "id": "ockham", 
        "name": "Оккам", 
        "role": "Backend Arch", 
        "skills": "Backend, DB, API"
    },
    {
        "id": "christina", 
        "name": "Кристина", 
        "role": "Frontend Lead", 
        "skills": "React, UI/UX"
    },
    {
        "id": "darius", 
        "name": "Дариус", 
        "role": "DevOps", 
        "skills": "CI/CD, Security"
    }
]

async def init_db():
    print("🚀 Синхронизация ЛОРа под 'Толстый клиент'...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        for data in INITIAL_AGENTS:
            agent = models.Agent(**data)
            db.add(agent)
        await db.commit()
    print("✅ База agents.db обновлена. Теперь ID — строки!")

if __name__ == "__main__":
    asyncio.run(init_db())