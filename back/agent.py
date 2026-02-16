class Agent:
    def __init__(self, id, name, personality, mood, memory, long_memory):
        self.id = id
        self.name = name
        self.personality = personality

        self.mood = mood
        self.memory = memory
        self.long_memory = long_memory

    def thing(self):
        promt_fr_AI = f"""Ты - {name}, твой характер - {personality}, 
        твоё настроение - {mood}, твое прошлое - {memory}.
        Что ты хочешь делать прямо сейчас? (Ответь одной фразой)"""
