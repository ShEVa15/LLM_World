from contextlib import asynccontextmanager
from typing import List
import asyncio
import os
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime

from database import AsyncSessionLocal, engine, Base
import models
import schemas

# --- WebSocket менеджер ---
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

# --- Мок агента ---
async def mock_agent_brain(task_description: str):
    await asyncio.sleep(3)
    return {"reply": "Понял, делаю!", "mood_change": -2}

# --- Lifespan ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()

# --- Создание приложения ---
app = FastAPI(lifespan=lifespan)

# --- Монтирование статики фронтенда (если папка dist существует) ---
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# --- Зависимость для получения сессии БД ---
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

# --- Эндпоинты для агентов ---
@app.post("/agents/", response_model=schemas.AgentResponse, status_code=201)
async def create_agent(agent: schemas.AgentCreate, db: AsyncSession = Depends(get_db)):
    db_agent = models.Agent(**agent.model_dump())
    db.add(db_agent)
    await db.commit()
    await db.refresh(db_agent)
    return db_agent

@app.get("/agents/", response_model=List[schemas.AgentResponse])
async def list_agents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Agent))
    return result.scalars().all()

# --- Эндпоинты для задач ---
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

# --- Эндпоинты для сообщений ---
@app.post("/messages/", status_code=202)
async def send_message(
    message: schemas.MessageCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    # Сохраняем сообщение пользователя
    db_message = models.Message(
        content=message.content,
        sender_type="user",
        recipient_id=message.recipient_id,
        timestamp=datetime.utcnow()
    )
    db.add(db_message)
    await db.commit()
    await db.refresh(db_message)

    # Рассылаем через WebSocket
    await manager.broadcast({
        "event": "new_message",
        "id": db_message.id,
        "content": db_message.content,
        "sender_type": "user",
        "sender_id": None,
        "recipient_id": db_message.recipient_id,
        "timestamp": db_message.timestamp.isoformat()
    })

    # Если указан получатель-агент – запускаем ответ
    if message.recipient_id:
        background_tasks.add_task(
            process_user_message,
            message.content,
            message.recipient_id,
            db_message.id
        )

    return {"status": "accepted"}

async def process_user_message(user_content: str, agent_id: int, original_message_id: int):
    result = await mock_agent_brain(user_content)
    async with AsyncSessionLocal() as db:
        agent = await db.get(models.Agent, agent_id)
        if not agent:
            return

        # Обновляем настроение
        agent.current_mood_score += result["mood_change"]
        await db.commit()

        # Сохраняем ответ агента
        reply = models.Message(
            content=result["reply"],
            sender_type="agent",
            sender_id=agent_id,
            recipient_id=None,
            timestamp=datetime.utcnow()
        )
        db.add(reply)
        await db.commit()
        await db.refresh(reply)

        # Рассылаем ответ через WebSocket
        await manager.broadcast({
            "event": "new_message",
            "id": reply.id,
            "content": reply.content,
            "sender_type": "agent",
            "sender_id": agent_id,
            "recipient_id": None,
            "timestamp": reply.timestamp.isoformat()
        })

@app.get("/messages/", response_model=List[schemas.MessageResponse])
async def get_messages(limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.Message)
        .order_by(models.Message.timestamp.desc())
        .limit(limit)
    )
    messages = result.scalars().all()
    return messages[::-1]  # возвращаем в хронологическом порядке

# --- WebSocket ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # просто держим соединение открытым
    except WebSocketDisconnect:
        manager.disconnect(websocket)