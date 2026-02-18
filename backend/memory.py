import asyncio
import json

import chromadb
import google.generativeai as genai
from chromadb.utils import embedding_functions

# === 1. НАСТРОЙКИ GEMINI (Вставь ключ) ===
GEMINI_API_KEY = "АПИ_КЛЮЧ_ГЕМИНИ"
genai.configure(api_key=GEMINI_API_KEY)

# --- СЛОЙ 1: СИСТЕМНЫЙ ПРОМПТ (ФУНДАМЕНТ) ---
# Это правила, которые фронтенд не может нарушить.
SYSTEM_INSTRUCTION = """
Ты — AI-агент в IT-симуляции.
Твоя задача — отыгрывать роль (Roleplay) на основе входящих данных.
ТЫ ОБЯЗАН ОТВЕЧАТЬ ТОЛЬКО ВАЛИДНЫМ JSON.
Не пиши вступлений, не используй markdown (```json).
Формат ответа:
{
    "thought": "твои скрытые мысли (анализ ситуации)",
    "reply": "твоя реплика в чат (от первого лица)",
    "action": "work" | "rest" | "complain"
}
Будь кратким. Твои реплики должны быть живыми и эмоциональными.
"Не будь душным. Используй сленг, сарказм, капс. Твои ответы должны быть эмоциональными, а не корпоративными."
"""

model = genai.GenerativeModel(
    model_name="gemini-2.5-flash", 
    generation_config=genai.GenerationConfig(
        response_mime_type="application/json",
        temperature=1.3, # Высокая креативность для живого сленга
        top_k=40,
        top_p=0.95,
    ),
    system_instruction=SYSTEM_INSTRUCTION,
)


# === 2. ВЕКТОРНАЯ БАЗА (RAG) ===
chroma_client = chromadb.PersistentClient(path="./chroma_db")  # Сохраняем на диск
emb_fn = embedding_functions.DefaultEmbeddingFunction()
collection = chroma_client.get_or_create_collection(
    name="agent_memories", embedding_function=emb_fn
)


def get_relevant_context(agent_id: str, query: str) -> str:
    """Поиск воспоминаний (RAG Layer)"""
    try:
        results = collection.query(
            query_texts=[query], n_results=1, where={"agent_id": agent_id}
        )
        if results["documents"] and len(results["documents"][0]) > 0:
            return results["documents"][0][0]  # Возвращаем текст воспоминания
        return ""
    except Exception as e:
        print(f"RAG Error: {e}")
        return ""


def save_memory(agent_id: str, prompt: str, reply: str):
    """Сохранение опыта"""
    try:
        doc_id = f"mem_{asyncio.get_event_loop().time()}"
        collection.add(
            documents=[f"Ситуация: {prompt[:100]}... Реакция: {reply}"],
            metadatas=[{"agent_id": agent_id}],
            ids=[doc_id],
        )
    except Exception as e:
        print(f"Save Memory Error: {e}")


# === 3. ФУНКЦИЯ СБОРКИ ПРОМПТА (ASSEMBLY) ===
async def generate_chat(agent_id: str, frontend_prompt: str, rag_context: str):
    """
    Здесь мы собираем 'Сэндвич контекста':
    1. System Instruction (уже в модели)
    2. Frontend Prompt (текущая ситуация)
    3. RAG Memory (прошлый опыт)
    """
    try:
        # --- СБОРКА СЛОЕВ 2 и 3 ---
        # Мы явно указываем модели, где текущая ситуация, а где воспоминания

        final_user_message = f"""
        [CURRENT SITUATION / INCOMING DATA]:
        {frontend_prompt}

        [LONG-TERM MEMORY / RAG CONTEXT]:
        {rag_context if rag_context else "Нет релевантных воспоминаний."}

        Твоя реакция:
        """

        # Отправляем в модель (System слой применится автоматически)
        response = await model.generate_content_async(final_user_message)

        # Парсим JSON
        parsed = json.loads(response.text)

        # Страховка: если модель вернула пустую реплику
        if not parsed.get("reply"):
            parsed["reply"] = "..."

        return parsed["reply"]

    except Exception as e:
        print(f"Gemini Assembly Error: {e}")
        return "Произошел сбой нейросети. (Ошибка JSON)"
