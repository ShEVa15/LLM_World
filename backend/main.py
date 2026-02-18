import json
import asyncio
import random 
from datetime import datetime
from typing import List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from database import AsyncSessionLocal, engine, Base
import models, schemas, memory

app = FastAPI()

app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_methods=["*"], 
    allow_headers=["*"]
)

RECENT_CHATS = []

class WorldState(BaseModel):
    state_json: str



@app.get("/agents/", response_model=List[schemas.AgentResponse])
async def list_agents():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(models.Agent))
        return result.scalars().all()

@app.get("/chats/")
async def get_chats():
    return RECENT_CHATS

@app.post("/save_world")
async def save_world(state: WorldState):
    with open("world_state.json", "w") as f:
        f.write(state.state_json)
    return {"status": "saved"}

@app.get("/load_world")
async def load_world():
    try:
        with open("world_state.json", "r") as f:
            return json.loads(f.read())
    except FileNotFoundError:
        return None

# --- ГЛАВНЫЙ ЦИКЛ WEBSOCKET ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[Socket] Подключено!")
    try:
        while True:
            data = await websocket.receive_text()
            event = json.loads(data)
            
            # ==========================================
            # ВАРИАНТ 1: СИСТЕМНОЕ СОБЫТИЕ (Кнопки)
            # ==========================================
            if event.get("type") == "ASK_LLM":
                p = event["payload"]
                agent_id, text = p["agentId"], p["promptText"]
                print(f"[{agent_id}] Обработка события: {text[:30]}...")
                
              
                context = memory.get_relevant_context(agent_id, text)
                reply_text = await memory.generate_chat(agent_id, text, context)
                
              
                async with AsyncSessionLocal() as db:
                    db.add(models.ChatLog(agent_id=agent_id, prompt=text, reply=reply_text))
                    await db.commit()
                memory.save_memory(agent_id, text, reply_text)
                
              
                chat_entry = {"agents": [agent_id], "text": reply_text, "time": datetime.now().strftime("%H:%M")}
                RECENT_CHATS.insert(0, chat_entry)
                if len(RECENT_CHATS) > 50: RECENT_CHATS.pop()
                
                await websocket.send_text(json.dumps({
                    "type": "CHAT_MESSAGE",
                    "payload": {"senderId": agent_id, "text": reply_text}
                }))

            # ==========================================
            # ВАРИАНТ 2: ИГРОК ПИШЕТ В ЧАТ (Цепная реакция)
            # ==========================================
            elif event.get("type") == "USER_MESSAGE":
                p = event["payload"]
                user_text = p.get("text") or p.get("promptText") or ""
                print(f"[Player] Пишет: {user_text}")

           
                await websocket.send_text(json.dumps({
                    "type": "CHAT_MESSAGE",
                    "payload": {"senderId": "User", "text": user_text}
                }))

                
                turn_count = 0
                continue_chance = 1.0  
                conversation_history = f"Тимлид: {user_text}"
                
           
                txt_low = user_text.lower()
                if any(x in txt_low for x in ["кристин", "фронт", "дизайн"]): current_speaker = "christina"
                elif any(x in txt_low for x in ["дариус", "безопасн", "докер"]): current_speaker = "darius"
                else: current_speaker = "ockham"

                
                while turn_count < 4 and random.random() < continue_chance:
                
                    if turn_count == 0:
                        prompt = f"Тимлид обратился к нам: '{user_text}'. Ответь ему в своей манере."
                    else:
                        prompt = f"В чате обсуждают: '{conversation_history}'. Твое мнение?"

                    context = memory.get_relevant_context(current_speaker, user_text)
                    reply = await memory.generate_chat(current_speaker, prompt, context)

               
                    async with AsyncSessionLocal() as db:
                        db.add(models.ChatLog(agent_id=current_speaker, prompt=prompt[:100], reply=reply))
                        await db.commit()
                    memory.save_memory(current_speaker, user_text, reply)

                  
                    await websocket.send_text(json.dumps({
                        "type": "CHAT_MESSAGE",
                        "payload": {"senderId": current_speaker, "text": reply}
                    }))

                    conversation_history += f"\n{current_speaker}: {reply}"

                
                    continue_chance = 0.8 if turn_count == 0 else continue_chance - 0.25
                    if continue_chance <= 0: break

                    await asyncio.sleep(random.uniform(1.5, 3.0))
                    
                    # Выбираем следующего, кто НЕ говорил только что
                    others = ["ockham", "christina", "darius"]
                    if current_speaker in others: others.remove(current_speaker)
                    current_speaker = random.choice(others)
                    turn_count += 1

                # ==========================================
                # ВАРИАНТ 3: БОЛТОВНЯ (Banter)
                # ==========================================
                # Если ответил агент, другой может вмешаться с шансом 70%
                if random.random() < 0.7:
                    await asyncio.sleep(2) 
                    
                  
                    others = ["ockham", "christina", "darius"]
                    if responder_id in others: others.remove(responder_id)
                    interrupter_id = random.choice(others)

                   
                    banter_prompt = f"Коллега {responder_id} ответил Тимлиду: '{reply_1}'. Прокомментируй это (пошути или поспорь)."
                    reply_2 = await memory.generate_chat(interrupter_id, banter_prompt, "")

              
                    await websocket.send_text(json.dumps({
                        "type": "CHAT_MESSAGE",
                        "payload": {"senderId": interrupter_id, "text": reply_2}
                    }))

    except WebSocketDisconnect:
        print("[Socket] Отключено.")
    except Exception as e:
        print(f"[ERROR] {e}")
