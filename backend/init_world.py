import asyncio
from database import engine, Base, AsyncSessionLocal
import models

INITIAL_AGENTS = [
    {"name": "Max", "role": "DevOps", "skills": "Docker, Kubernetes, Linux", "coord_x": 10, "coord_y": 10},
    {"name": "Rin", "role": "Frontend", "skills": "React, Tailwind, TypeScript", "coord_x": 80, "coord_y": 20},
    {"name": "Kira", "role": "Backend", "skills": "Python, FastAPI, SQL", "coord_x": 50, "coord_y": 50},
    {"name": "Alex", "role": "Product Owner", "skills": "Jira, Agile", "coord_x": 30, "coord_y": 80},
]

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        for data in INITIAL_AGENTS:
            agent = models.Agent(
                name=data["name"],
                role=data["role"],
                skills=data["skills"],
                coord_x=data["coord_x"],
                coord_y=data["coord_y"],
                stress=0,
                current_activity="Готов к работе"
            )
            db.add(agent)
        await db.commit()
        print("✅ Мир инициализирован!")

if __name__ == "__main__":
    asyncio.run(init_db())