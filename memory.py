import asyncio
import json

import chromadb
import google.generativeai as genai
from chromadb.utils import embedding_functions

GEMINI_API_KEY = "ТВОЙ_КЛЮЧ_ЗДЕСЬ"
genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    generation_config=genai.GenerationConfig(
        response_mime_type="application/json",
        temperature=0.7,
    ),
)

chroma_client = chromadb.PersistentClient(path="./chroma_db")
emb_fn = embedding_functions.DefaultEmbeddingFunction()
collection = chroma_client.get_or_create_collection(
    name="agent_memories", embedding_function=emb_fn
)


def get_relevant_context(agent_id: str, query: str) -> str:
    """Поиск воспоминаний в ChromaDB"""
    try:
        results = collection.query(
            query_texts=[query], n_results=1, where={"agent_id": agent_id}
        )
        if results["documents"] and len(results["documents"][0]) > 0:
            return results["documents"][0][0]
        return "Нет воспоминаний."
    except Exception as e:
        print(f"ChromaDB Error: {e}")
        return ""


def save_memory(agent_id: str, prompt: str, reply: str):
    """Сохранение нового опыта"""
    try:
        doc_id = f"mem_{asyncio.get_event_loop().time()}"
        collection.add(
            documents=[f"Ситуация: {prompt[:50]}... Ответ: {reply}"],
            metadatas=[{"agent_id": agent_id}],
            ids=[doc_id],
        )
    except Exception as e:
        print(f"Save Memory Error: {e}")


async def generate_chat(agent_id: str, full_prompt: str, context: str):
    """Отправка запроса в Gemini"""
    try:
        final_message = f"{full_prompt}\n\n[RAG MEMORY]: {context}"

        response = await model.generate_content_async(final_message)

        return json.loads(response.text)["reply"]
    except Exception as e:
        print(f"Gemini Error: {e}")
        return "Ошибка нейросети. Я задумался..."
