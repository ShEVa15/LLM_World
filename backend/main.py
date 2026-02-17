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

# --- НАСТРОЙКИ СИМУЛЯЦИИ ---
SIMULATION_CONFIG = {
    "time_speed": 1.0,
    "is_running": True
}

RECENT_CHATS = []

# --- ЛОГИКА ИВЕНТОВ (Перенесено с фронта) ---

async def trigger_game_event(db: AsyncSession):
    """Генерирует игровые события: Прод, Пицца, Конфликты"""
    
    # Вероятности событий
    dice = random.random()
    
    # Сценарий 1: УПАЛ ПРОД (Редкое, но мощное)
    if dice < 0.05: 
        event_name = "🔥 УПАЛ ПРОД!"
        result = await db.execute(select(models.Agent).where(models.Agent.role.in_(["DevOps", "Backend", "Team Lead"])))
        target_agents = result.scalars().all()
        
        if target_agents:
            victim = random.choice(target_agents)
            victim.status = "INCIDENT"
            victim.stress = min(100, victim.stress + 40) # Стресс +40
            victim.current_activity = "ЧИНИТ ПРОД (Горит!)"
            victim.current_mood_score = max(0.0, victim.current_mood_score - 0.4)
            
            memory.add_memory(str(victim.id), f"Случился инцидент: {event_name}. У меня паника.")
            print(f"🔥 {event_name} -> {victim.name}")
            await db.commit()

    # Сценарий 2: ПИЦЦА (Снижает стресс всем)
    elif dice < 0.15:
        event_name = "🍕 Пицца в офисе"
        result = await db.execute(select(models.Agent))
        agents = result.scalars().all()
        
        for agent in agents:
            if agent.status != "INCIDENT": # Кто чинит прод, тот не ест
                agent.status = "RESTING"
                agent.stress = max(0, agent.stress - 20) # Стресс -20
                agent.current_activity = "Ест пиццу"
                agent.current_mood_score = min(1.0, agent.current_mood_score + 0.3)
        
        print(f"🍕 {event_name}")
        await db.commit()

    # Сценарий 3: MERGE CONFLICT (Средний стресс)
    elif dice < 0.25:
        event_name = "⚔️ Merge Conflict"
        result = await db.execute(select(models.Agent).where(models.Agent.status == "WORKING"))
        workers = result.scalars().all()
        
        if workers:
            victim = random.choice(workers)
            victim.status = "ERROR"
            victim.stress = min(100, victim.stress + 15)
            victim.current_activity = "Резолвит Git конфликт"
            print(f"⚔️ {event_name} -> {victim.name}")
            await db.commit()

async def simulate_tick(db: AsyncSession):
    """Фоновая симуляция: изменение стресса от работы"""
    result = await db.execute(select(models.Agent))
    agents = result.scalars().all()
    
    for agent in agents:
        # Если работает -> стресс растет
        if agent.status == "WORKING":
            agent.stress = min(100, agent.stress + random.randint(1, 3))
            
        # Если отдыхает -> стресс падает
        elif agent.status == "RESTING":
            agent.stress = max(0, agent.stress - random.randint(2, 5))
            
        # Если перегорел (100 стресса) -> статус ERROR
        if agent.stress >= 100 and agent.status != "INCIDENT":
            agent.status = "ERROR"
            agent.current_activity = "ВЫГОРАНИЕ (Лежит на полу)"
            
        # Восстановление из выгорания (медленное)
        if agent.status == "ERROR" and agent.stress < 50:
            agent.status = "IDLE"
            agent.current_activity = "Пришел в себя"

    await db.commit()

async def trigger_movement_event(db: AsyncSession):
    """Движение агентов (визуализация)"""
    result = await db.execute(select(models.Agent))
    agents = result.scalars().all()
    if not agents: return

    # Двигаем 30% агентов
    num_to_move = max(1, int(len(agents) * 0.3))
    moving_agents = random.sample(agents, num_to_move)

    for agent in moving_agents:
        # Если занят делом, не бегает (кроме паники)
        if agent.status not in ["INCIDENT", "ERROR"]:
            agent.coord_x = random.randint(10, 90)
            agent.coord_y = random.randint(10, 90)
            
            # Меняем активность на "Гуляет", если он ничего не делал
            if agent.status == "IDLE":
                agent.current_activity = "Прогуливается"
    
    await db.commit()

async def simulation_loop():
    print("🚀 Симуляция (Backend Driven) запущена!")
    while True:
        if SIMULATION_CONFIG["is_running"]:
            async with AsyncSessionLocal() as db:
                # 1. Тик симуляции (стресс)
                await simulate_tick(db)
                
                # 2. Случайные события (Прод, Пицца)
                if random.random() < 0.3: # 30% шанс раз в цикл
                    await trigger_game_event(db)
                
                # 3. Движение
                if random.random() < 0.4:
                    await trigger_movement_event(db)

        await asyncio.sleep(5 / SIMULATION_CONFIG["time_speed"]) # Раз в 5 секунд

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ВАЖНО: Пересоздаем таблицы, если схема поменялась
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    asyncio.create_task(simulation_loop())
    yield
    await engine.dispose()

app = FastAPI(title="AI World Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True
)

@app.get("/chats/")
async def get_chats():
    return RECENT_CHATS

@app.get("/agents/", response_model=List[schemas.AgentResponse])
async def list_agents():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(models.Agent))
        return result.scalars().all()