import os
from yandexgptlite import YandexGPTLite



class Agent:
    def __init__(self, id, name, personality, base_mood=0.5, relations=None):
        self.id = id
        self.name = name
        self.personality = personality
        self.mood = base_mood
        self.relations = relations or {}
        self.memory = []

        self.llm = YandexGPTLite(
            folder_id=os.getenv("FOLDER_ID"),
            api_key=os.getenv("API_KEY")
        )

