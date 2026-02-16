import os
import requests
import json
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

class Agent:
    def __init__(self, id, name, personality, base_mood=0.5, relations=None):
        self.id = id
        self.name = name
        self.personality = personality
        self.mood = base_mood
        self.relations = relations or {}
        self.memory = []
        self.folder_id = os.getenv("FOLDER_ID")
        self.api_key = os.getenv("API_KEY")

    def act(self, world_events):
        recent = "\n".join(self.memory[-3:]) if self.memory else "ничего особенного"
        rel_text = ", ".join([f"{k}: {v}" for k, v in self.relations.items()])

        system = f"Ты {self.name}. Характер: {self.personality}. Настроение: {self.mood:.1f}. Отношения: {rel_text}. Ответь одной фразой."
        user = f"Что ты делаешь или говоришь? (последние события: {recent})"

        prompt = {
            "modelUri": f"gpt://{self.folder_id}/yandexgpt-lite",
            "completionOptions": {
                "stream": False,
                "temperature": 0.6,
                "maxTokens": "50"
            },
            "messages": [
                {"role": "system", "text": system},
                {"role": "user", "text": user}
            ]
        }

        url = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Api-Key {self.api_key}"
        }

        try:
            response = requests.post(url, headers=headers, json=prompt)
            response.raise_for_status()
            result = response.json()
            answer = result['result']['alternatives'][0]['message']['text']
            return f"{self.name}: {answer}"
        except Exception as e:
            print(f"YandexGPT error: {e}")
            return f"{self.name} задумчиво молчит."

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "mood": self.mood,
            "personality": self.personality,
            "relations": self.relations,
            "memory": self.memory[-3:]
        }