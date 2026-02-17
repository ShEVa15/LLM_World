import chromadb
from chromadb.utils import embedding_functions
import uuid
from datetime import datetime
import json
import subprocess  # Используем системный curl для надежности
import os
import time
import random

# --- КОНФИГУРАЦИЯ ---
CHROMA_DATA_PATH = "./chroma_data"
COLLECTION_NAME = "agent_memories"

# Твой ключ
GOOGLE_API_KEY = "AIzaSyCKlUJxdGJo3n9SSUypDEUalrakCupSks8" 
MODEL_NAME = "gemini-1.5-flash"  # Стабильная модель

# Бэкап диалоги (если API Google недоступен)
BACKUP_DIALOGUES = [
    ("Ты видел новый дизайн?", "Ага, мои глаза до сих пор болят."),
    ("Пойдем на обед?", "Не могу, деплой упал."),
    ("Слышал, нас купил Microsoft?", "Опять? Это уже третий раз за неделю."),
    ("У меня код работает.", "На моем компе тоже, а на проде нет."),
    ("Кофе будешь?", "Внутривенно, пожалуйста."),
    ("Когда релиз?", "Вчера.")
]

# --- ИНИЦИАЛИЗАЦИЯ CHROMA ---
print("⏳ Инициализация Vector DB...")
try:
    client = chromadb.PersistentClient(path=CHROMA_DATA_PATH)
    emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
    collection = client.get_or_create_collection(name=COLLECTION_NAME, embedding_function=emb_fn)
    print("✅ Vector DB готова!")
except Exception as e:
    print(f"❌ Ошибка ChromaDB (игнорируем): {e}")
    collection = None

# --- ФУНКЦИИ ---

def add_memory(agent_id: str, text: str):
    """Сохраняет факт в векторную базу"""
    if not collection: return
    try:
        collection.add(
            documents=[text],
            metadatas=[{"agent_id": agent_id, "timestamp": datetime.now().isoformat()}],
            ids=[str(uuid.uuid4())]
        )
        print(f"💾 Память сохранена: {text[:30]}...")
    except Exception as e: 
        print(f"⚠️ Ошибка записи памяти: {e}")

def get_relevant_context(agent_id: str, query: str, n_results: int = 3) -> str:
    """Ищет похожие воспоминания в базе"""
    if not collection: return ""
    try:
        # Ищем воспоминания, связанные с текущей темой (query)
        results = collection.query(
            query_texts=[query],
            n_results=n_results,
            where={"agent_id": agent_id} # Фильтр по конкретному агенту (опционально)
        )
        
        if results and results['documents']:
            # Собираем найденные факты в одну строку
            context = "\n".join(results['documents'][0])
            print(f"🧠 Вспомнил ({agent_id}): {context[:50]}...")
            return context
    except Exception as e:
        print(f"⚠️ Ошибка поиска памяти: {e}")
    return ""

def get_backup_dialogue(agent1_name, agent2_name):
    q1, q2 = random.choice(BACKUP_DIALOGUES)
    return f"{agent1_name}: {q1}\n{agent2_name}: {q2}"

def generate_chat(agent1_name, agent1_role, agent1_mood, 
                  agent2_name, agent2_role, agent2_mood,
                  topic_context: str = "работа"):
    
    # 1. Поиск контекста в памяти (RAG)
    # Агент 1 вспоминает что-то, связанное с темой разговора
    memory_context = get_relevant_context(agent1_name, topic_context)
    
    # 2. Формирование промпта с учетом памяти
    prompt = (
        f"Напиши короткий диалог (2 фразы) между коллегами IT.\n"
        f"1. {agent1_name} ({agent1_role}). Настроение: {agent1_mood:.2f}.\n"
        f"2. {agent2_name} ({agent2_role}). Настроение: {agent2_mood:.2f}.\n"
        f"Тема: {topic_context}.\n"
    )
    
    if memory_context:
        prompt += f"Учти прошлый опыт {agent1_name}: {memory_context}\n"
    
    prompt += "Сарказм, юмор. Ответ: ТОЛЬКО текст диалога без лишних слов."

    # 3. Отправка запроса через CURL (для обхода SSL)
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}]
    })

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={GOOGLE_API_KEY}"

    print(f"🤖 Запрос (с памятью): {agent1_name} + {agent2_name}...")

    try:
        result = subprocess.run(
            [
                "curl", "-s", "-k", "-X", "POST",
                "-H", "Content-Type: application/json",
                "-d", payload,
                url
            ],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            response_json = json.loads(result.stdout)
            if 'candidates' in response_json:
                text = response_json['candidates'][0]['content']['parts'][0]['text'].strip()
                # Сохраняем этот диалог обратно в память, чтобы помнить его!
                add_memory(agent1_name, f"Разговор с {agent2_name} про {topic_context}: {text}")
                return text
            elif "error" in response_json:
                print(f"⚠️ Ошибка API: {response_json['error'].get('message')}")
        else:
             print(f"⚠️ Curl ошибка: {result.stderr}")

    except Exception as e:
        print(f"⚠️ Сбой: {e}")
    
    return get_backup_dialogue(agent1_name, agent2_name)