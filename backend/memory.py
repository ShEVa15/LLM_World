import chromadb
from chromadb.utils import embedding_functions
import uuid
from datetime import datetime
import json
import subprocess
import os
import random

# --- НАСТРОЙКИ ---
CHROMA_DATA_PATH = "./chroma_data"
COLLECTION_NAME = "agent_memories"
GOOGLE_API_KEY = "AIzaSyCKlUJxdGJo3n9SSUypDEUalrakCupSks8" # Твой ключ
MODEL_NAME = "gemini-1.5-flash"

# --- CHROMA DB ---
print("⏳ Инициализация Vector DB...")
try:
    client = chromadb.PersistentClient(path=CHROMA_DATA_PATH)
    emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
    collection = client.get_or_create_collection(name=COLLECTION_NAME, embedding_function=emb_fn)
    print("✅ Vector DB готова!")
except Exception as e:
    print(f"❌ Ошибка ChromaDB (игнорируем, если первый запуск): {e}")
    collection = None

def add_memory(agent_id: str, text: str):
    if not collection: return
    try:
        collection.add(
            documents=[text],
            metadatas=[{"agent_id": agent_id, "timestamp": datetime.now().isoformat()}],
            ids=[str(uuid.uuid4())]
        )
    except Exception as e:
        print(f"⚠️ Ошибка записи памяти: {e}")

def get_relevant_context(agent_id: str, query: str, n_results: int = 3) -> str:
    if not collection: return ""
    try:
        results = collection.query(
            query_texts=[query],
            n_results=n_results,
            where={"agent_id": agent_id}
        )
        if results and results['documents']:
            return "\n".join(results['documents'][0])
    except:
        pass
    return ""

def generate_chat(agent1_name, agent1_role, agent1_mood, 
                  agent2_name, agent2_role, agent2_mood,
                  topic_context: str = "работа"):
    
    prompt = (
        f"Напиши короткий диалог (2 фразы) между коллегами IT.\n"
        f"1. {agent1_name} ({agent1_role}). Настроение (0-1): {agent1_mood:.2f}.\n"
        f"2. {agent2_name} ({agent2_role}). Настроение (0-1): {agent2_mood:.2f}.\n"
        f"Тема: {topic_context}.\n"
        f"Сарказм, юмор. Ответ: ТОЛЬКО текст диалога."
    )
    
    # Используем curl для обхода проблем с SSL
    payload = json.dumps({"contents": [{"parts": [{"text": prompt}]}]})
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={GOOGLE_API_KEY}"

    try:
        result = subprocess.run(
            ["curl", "-s", "-k", "-X", "POST", "-H", "Content-Type: application/json", "-d", payload, url],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            if 'candidates' in data:
                return data['candidates'][0]['content']['parts'][0]['text'].strip()
    except Exception as e:
        print(f"Generate Error: {e}")
    
    # Заглушка, если сети нет
    return f"{agent1_name}: Работаем?\n{agent2_name}: Ага, как всегда."