from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import AsyncSessionLocal, engine, Base
import models  # noqa: F401 (чтобы модели были зарегистрированы в Base)
import schemas


app = FastAPI(
    title="Agents API",
    description="API для управления агентами, задачами и отношениями",
    version="0.0.1",
    lifespan=lifespan,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Создаём таблицы в БД (если их нет)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

    await engine.dispose()



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True
)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session




@app.post("/agents/", response_model=schemas.AgentResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(agent: schemas.AgentCreate, db: AsyncSession = Depends(get_db)):
    """
    Создаёт нового агента.
    - **name**: имя агента
    - **role**: роль агента
    - **current_mood_score** (опционально): текущее настроение (по умолчанию 0)
    """
    db_agent = models.Agent(
        name=agent.name,
        role=agent.role,
        current_mood_score=agent.current_mood_score
    )
    db.add(db_agent)
    await db.commit()
    await db.refresh(db_agent)
    return db_agent



@app.post("/tasks/", response_model=schemas.TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(task: schemas.TaskCreate, db: AsyncSession = Depends(get_db)):
    """
    Создаёт новую задачу.
    - **description**: описание задачи
    - **status** (опционально): статус (todo, in_progress, done). По умолчанию 'todo'.
    - **assignee_id** (опционально): ID назначенного агента
    """
    if task.assignee_id is not None:
        result = await db.execute(select(models.Agent).where(models.Agent.id == task.assignee_id))
        agent = result.scalar_one_or_none()
        if agent is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Agent with id {task.assignee_id} not found"
            )

    db_task = models.Task(
        description=task.description,
        status=task.status,
        assignee_id=task.assignee_id
    )
    db.add(db_task)
    await db.commit()
    await db.refresh(db_task)
    return db_task



@app.get("/agents/", response_model=List[schemas.AgentResponse])
async def list_agents(db: AsyncSession = Depends(get_db)):

    result = await db.execute(select(models.Agent))
    agents = result.scalars().all()
    return agents