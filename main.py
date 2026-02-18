import asyncio
import json
import sqlite3
import uuid

import chromadb
import google.generativeai as genai
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

# ==========================================
# 0. НАСТРОЙКА GEMINI API (ВСТАВЬ СВОЙ КЛЮЧ!)
# ==========================================
GEMINI_API_KEY = "AIzaSyCKlUJxdGJo3n9SSUypDEUalrakCupSks8"
genai.configure(api_key=GEMINI_API_KEY)

# Настраиваем модель на строгий JSON и задаем ей роль
model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    generation_config=genai.GenerationConfig(
        response_mime_type="application/json",
        temperature=0.7,
    ),
    system_instruction='Ты AI-агент в IT-симуляции. Оценивай ситуацию через призму своего характера. Отвечай СТРОГО валидным JSON без маркдауна: {"thought": "твои мысли", "reply": "реплика в чат", "action": "work" | "rest" | "complain"}',
)

# ==========================================
# 1. SQLITE (Реляционная память)
# ==========================================
conn = sqlite3.connect("simulation.db", check_same_thread=False)
cursor = conn.cursor()
cursor.execute("""CREATE TABLE IF NOT EXISTS chat_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, agent_id TEXT, prompt TEXT, thought TEXT, reply TEXT, action TEXT
)""")
conn.commit()

# ==========================================
# 2. CHROMADB (Векторная память)
# ==========================================
chroma_client = chromadb.Client()  # Работает в оперативной памяти для скорости
collection = chroma_client.get_or_create_collection(name="agent_memories")


def get_chroma_context(agent_id: str, prompt: str) -> str:
    # Ищем самое релевантное воспоминание агента
    results = collection.query(
        query_texts=[prompt], n_results=1, where={"agent_id": agent_id}
    )
    if results["documents"] and len(results["documents"][0]) > 0:
        return results["documents"][0][0]
    return "Нет прошлых воспоминаний."


def save_to_chroma(agent_id: str, reply: str):
    # Сохраняем новую реплику как векторный документ
    doc_id = str(uuid.uuid4())
    collection.add(documents=[reply], metadatas=[{"agent_id": agent_id}], ids=[doc_id])


# ==========================================
# 3. ВЫЗОВ НЕЙРОСЕТИ (Gemini Flash)
# ==========================================
async def fetch_llm_response(agent_id: str, enriched_prompt: str) -> dict:
    try:
        # Асинхронный вызов Gemini
        response = await model.generate_content_async(enriched_prompt)
        # Так как мы указали response_mime_type="application/json", ответ 100% можно парсить
        return json.loads(response.text)
    except Exception as e:
        print(f"Ошибка Gemini API: {e}")
        return {
            "thought": "Критический сбой API.",
            "reply": "*Смотрит в пустоту, связь с сервером потеряна*",
            "action": "work",
        }


# ==========================================
# 4. WEBSOCKET РОУТЕР
# ==========================================
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[Socket] Фронтенд успешно подключился к бэкенду!")
    try:
        while True:
            data = await websocket.receive_text()
            event = json.loads(data)

            if event.get("type") == "ASK_LLM":
                payload = event.get("payload", {})
                agent_id = payload.get("agentId", "unknown")
                prompt_text = payload.get("promptText", "")

                print(f"[{agent_id}] Gemini генерирует ответ...")

                # 1. Извлекаем память из ChromaDB
                memory = get_chroma_context(agent_id, prompt_text)
                final_prompt = (
                    f"{prompt_text}\n\nТВОИ ПРОШЛЫЕ ВОСПОМИНАНИЯ О ПОДОБНОМ: {memory}"
                )

                # 2. Отправляем в Gemini 2.5 Flash
                llm_answer = await fetch_llm_response(agent_id, final_prompt)

                # 3. Пишем результаты в базы данных
                save_to_chroma(agent_id, llm_answer.get("reply", ""))
                cursor.execute(
                    "INSERT INTO chat_logs (agent_id, prompt, thought, reply, action) VALUES (?, ?, ?, ?, ?)",
                    (
                        agent_id,
                        prompt_text,
                        llm_answer.get("thought"),
                        llm_answer.get("reply"),
                        llm_answer.get("action"),
                    ),
                )
                conn.commit()

                # 4. Отправляем JSON обратно в твой React!
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "CHAT_MESSAGE",
                            "payload": {
                                "senderId": agent_id,
                                "text": llm_answer.get("reply", "Ошибка"),
                            },
                        }
                    )
                )
                print(f"[{agent_id}] Ответ улетел на фронт!")

    except WebSocketDisconnect:
        print("[Socket] Фронтенд отключился.")
