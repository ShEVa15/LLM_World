import asyncio
import random
from contextlib import asynccontextmanager
from typing import List, AsyncGenerator
from datetime import datetime

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import AsyncSessionLocal, engine, Base
import models
import schemas
import memory 

# --- НАСТРОЙКИ ---
SIMULATION_CONFIG = {
    "time_speed": 1.0,
    "is_running": True
}

RECENT_CHATS = []

# --- ЛОГИКА СИМУЛЯЦИИ ---

async def trigger_random_event(db: AsyncSession):
    """Случайные события"""
    events = [
        ("🍕 Доставили пиццу", 0.3, "RESTING", "Ест пиццу на кухне"),   
        ("🔦 Отключили свет", -0.2, "IDLE", "Ищет фонарик в темноте"),      
        ("🔥 УПАЛ ПРОД", -0.5, "INCIDENT", "Паникует и тушит пожар"),      
        ("💰 Пришла зарплата", 0.5, "WORKING", "Считает деньги"),   
        ("💃 Корпоратив", 0.4, "RESTING", "Танцует на столе"),       
        ("🐛 Критический баг", -0.3, "ERROR", "Дебажит страшный код"),   
        ("💤 Обед", 0.1, "RESTING", "Спит на пуфике")
    ]
    
    event_name, mood_impact, new_status, activity_text = random.choice(events)
    
    result = await db.execute(select(models.Agent))
    agents = result.scalars().all()
    
    for agent in agents:
        agent.current_mood_score = max(0.0, min(1.0, agent.current_mood_score + mood_impact))
        
        if new_status: 
            agent.status = new_status
            agent.current_activity = activity_text
            # Запоминаем событие в векторной базе!
            memory.add_memory(str(agent.id), f"Произошло событие: {event_name}. Мое состояние: {activity_text}")
            
            if new_status in ["INCIDENT", "RESTING", "IDLE"]:
                 agent.current_task_id = None

    await db.commit()
    print(f"⚡ {event_name}")

async def trigger_social_event(db: AsyncSession):
    """Агенты встречаются"""
    result = await db.execute(select(models.Agent))
    agents = result.scalars().all()
    
    if len(agents) < 2: return 

    a1, a2 = random.sample(agents, 2)
    
    # Определяем тему разговора на основе того, чем они заняты
    topic = "работа"
    if "пиццу" in a1.current_activity or "пиццу" in a2.current_activity:
        topic = "еда, пицца"
    elif "ПРОД" in a1.current_activity or "ПРОД" in a2.current_activity:
        topic = "падение продакшена, паника"
    elif a1.status == "WORKING":
        topic = "текущая задача, код, дедлайн"

    a1.current_activity = f"Болтает с {a2.name}"
    a2.current_activity = f"Слушает {a1.name}"

    # Передаем тему в генератор (он найдет воспоминания по этой теме)
    dialogue = memory.generate_chat(
        a1.name, a1.role, a1.current_mood_score,
        a2.name, a2.role, a2.current_mood_score,
        topic_context=topic
    )
    
    if dialogue:
        if "\n" not in dialogue:
             dialogue = dialogue.replace(f"{a2.name}:", f"\n\n{a2.name}:")
        else:
            dialogue = dialogue.replace("\n", "\n\n")

        print(f"💬 ЧАТ: {a1.name} и {a2.name}")
        
        chat_entry = {
            "agents": [a1.name, a2.name],
            "text": dialogue,
            "time": datetime.now().strftime("%H:%M")
        }
        RECENT_CHATS.insert(0, chat_entry)
        if len(RECENT_CHATS) > 15: RECENT_CHATS.pop()
        
        a1.current_mood_score = min(1.0, a1.current_mood_score + 0.05)
        a2.current_mood_score = min(1.0, a2.current_mood_score + 0.05)
        
        await db.commit()

async def trigger_movement_event(db: AsyncSession):
    """Движение"""
    result = await db.execute(select(models.Agent))
    agents = result.scalars().all()
    
    if not agents: return

    num_to_move = max(1, int(len(agents) * 0.4))
    moving_agents = random.sample(agents, num_to_move)

    for agent in moving_agents:
        agent.coord_x = random.randint(10, 90)
        agent.coord_y = random.randint(10, 90)
        
        if agent.status in ["IDLE", "WORKING"]:
             agent.current_activity = "Прогуливается по офису"

    await db.commit()
    print(f"👣 {len(moving_agents)} агентов переместились")


async def simulation_loop():
    print("🚀 Симуляция запущена!")
    while True:
        if SIMULATION_CONFIG["is_running"]:
            async with AsyncSessionLocal() as db:
                if random.random() < 0.15: 
                    await trigger_random_event(db)
                if random.random() < 0.25:
                     await trigger_social_event(db)
                if random.random() < 0.40:
                    await trigger_movement_event(db)

        await asyncio.sleep(20 / SIMULATION_CONFIG["time_speed"])

# --- ЗАПУСК ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        # Для безопасности данных при смене схемы
        await conn.run_sync(Base.metadata.create_all)
    asyncio.create_task(simulation_loop())
    yield
    await engine.dispose()

app = FastAPI(title="AI World Simulation", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

# --- ЭНДПОИНТЫ ---

@app.get("/chats/")
async def get_chats():
    return RECENT_CHATS

@app.get("/agents/", response_model=List[schemas.AgentResponse])
async def list_agents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Agent))
    return result.scalars().all()

@app.post("/agents/", response_model=schemas.AgentResponse)
async def create_agent(agent: schemas.AgentCreate, db: AsyncSession = Depends(get_db)):
    db_agent = models.Agent(**agent.model_dump())
    db_agent.current_activity = "Только устроился на работу" 
    db.add(db_agent)
    await db.commit()
    await db.refresh(db_agent)
    memory.add_memory(str(db_agent.id), f"Я появился. Навыки: {agent.skills}")
    return db_agent

@app.post("/tasks/", response_model=schemas.TaskResponse)
async def create_task(task: schemas.TaskCreate, db: AsyncSession = Depends(get_db)):
    db_task = models.Task(**task.model_dump())
    db.add(db_task)
    await db.commit()
    await db.refresh(db_task)
    
    if task.assignee_id:
        agent = await db.get(models.Agent, task.assignee_id)
        if agent:
            agent.status = "WORKING"
            agent.current_activity = f"Выполняет: {task.title}"
            
            task_title_lower = task.title.lower()
            is_skill_match = False
            if agent.skills:
                for skill in agent.skills.split(","):
                    if skill.strip().lower() in task_title_lower:
                        is_skill_match = True
                        break
            
            mood_impact = 0.15 if is_skill_match else -0.15
            agent.current_mood_score = max(0.0, min(1.0, agent.current_mood_score + mood_impact))
            
            await db.commit()
            memory.add_memory(str(agent.id), f"Взял задачу: {task.title}")

    return db_task

@app.post("/agents/{agent_id}/teleport")
async def teleport_agent(agent_id: int, db: AsyncSession = Depends(get_db)):
    agent = await db.get(models.Agent, agent_id)
    if not agent: return {"error": "Agent not found"}
    agent.coord_x = random.randint(10, 90)
    agent.coord_y = random.randint(10, 90)
    agent.current_activity = "Телепортировался!"
    await db.commit()
    return {"message": "Teleported!", "new_coords": [agent.coord_x, agent.coord_y]}

@app.post("/simulation/speed/{speed}")
async def set_speed(speed: float):
    SIMULATION_CONFIG["time_speed"] = speed
    return {"speed": speed}