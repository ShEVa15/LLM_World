import json
import random

class Agent:
    def __init__(self, id, name, personality, long_memory,):
        self.id = id
        self.name = name
        self.personality = personality
        
        self.long_memory = []
        self.mood = 0.5
        self.memory = []
        self.relations = {}

    def thing(self):
        promt_fr_AI = f"""Ты - {name}, твой характер - {personality}, 
        твоё настроение - {mood}, твое прошлое - {memory}.
        Что ты хочешь делать прямо сейчас? (Ответь одной фразой)"""

    def remember(self, event):
        self.memory.append(event)
        if len(self.memory) > 10:
            self.memory.pop(0)
        # TODO долговременную память

    def update_mood(self, delta):
        self.mood = max(0.0, min(1.0, self.mood + delta))

    def adjust_relation(self, other_id, delta):
        current = self.relations.get(other_id, 0.0)
        self.relations[other_id] = max(-1.0, min(1.0, current + delta))

    def to_dict(self): #в формат json
        return {
            "id": self.id,
            "name": self.name,
            "mood": self.mood,
            "personality": self.personality,
            "relations": self.relations,
            "memory": self.memory[-3:],   # последние 3 воспоминания
            "plans": self.plans
        }

    def decide_action(self, world_events):
        if self.mood > 0.7:
            return f"{self.name} улыбается и говорит: 'Отличный день!'"
        elif self.mood < 0.3:
            return f"{self.name} вздыхает и бормочет: 'Всё идёт не так...'"
        else:
            if random.random() < 0.3 and world_events:
                last_event = world_events[-1]
                return f"{self.name} вспоминает: '{last_event}'"
            else:
                other_ids = [aid for aid in self.relations.keys() if aid != self.id]
                if other_ids:
                    target = random.choice(other_ids)
                    return f"{self.name} смотрит на {target} и кивает."
        return f"{self.name} просто стоит и думает."
