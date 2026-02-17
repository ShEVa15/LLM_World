from contextlib import asynccontextmanager
from typing import List, Optional
import asyncio
from datetime import datetime

from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import AsyncSessionLocal, engine, Base
import models
import schemas


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                await self.disconnect(connection)


manager = ConnectionManager()


async def mock_agent_brain(task_description: str):
    await asyncio.sleep(3)
    return {"reply": "Понял, делаю!", "mood_change": -2}


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(lifespan=lifespan)

# Подключаем CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Монтируем статические файлы фронтенда (если папка dist существует)
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


@app.post("/agents/", response_model=schemas.AgentResponse, status_code=201)
async def create_agent(agent: schemas.AgentCreate, db: AsyncSession = Depends(get_db)):
    db_agent = models.Agent(**agent.model_dump())
    db.add(db_agent)
    await db.commit()
    await db.refresh(db_agent)
    return db_agent


@app.post("/tasks/", response_model=schemas.TaskResponse, status_code=201)
async def create_task(task: schemas.TaskCreate, db: AsyncSession = Depends(get_db)):
    if task.assignee_id:
        agent = await db.get(models.Agent, task.assignee_id)
        if not agent:
            raise HTTPException(404, "Agent not found")
    db_task = models.Task(**task.model_dump())
    db.add(db_task)
    await db.commit()
    await db.refresh(db_task)
    return db_task


@app.get("/agents/", response_model=List[schemas.AgentResponse])
async def list_agents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Agent))
    return result.scalars().all()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.post("/tasks/{task_id}/assign/{agent_id}")
async def assign_task(task_id: int, agent_id: int,
                      background_tasks: BackgroundTasks,
                      db: AsyncSession = Depends(get_db)):
    task = await db.get(models.Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    agent = await db.get(models.Agent, agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")

    background_tasks.add_task(
        process_agent_assignment,
        task_id, agent_id, task.description
    )
    return {"status": "processing"}


async def process_agent_assignment(task_id: int, agent_id: int, task_description: str):
    result = await mock_agent_brain(task_description)

    async with AsyncSessionLocal() as db:
        agent = await db.get(models.Agent, agent_id)
        if agent:
            agent.current_mood_score += result["mood_change"]
            await db.commit()

            await manager.broadcast({
                "event": "agent_action",
                "agent_id": agent_id,
                "message": result["reply"],
                "new_mood": agent.current_mood_score
            })


