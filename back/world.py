import json
from .agent import Agent

class World:
    def __init__(self):
        self.agents = {}
        self.events = []
        self.time = 0

    def load_agents(self, path="agents.json"):
        with open(path, encoding='utf-8') as f:
            data = json.load(f)
        for a in data:
            self.agents[a["id"]] = Agent(**a)

    def step(self):
        self.time += 1
        actions = []
        for agent in self.agents.values():
            action = agent.act(self.events)
            actions.append(action)
            agent.memory.append(action)
        self.events.extend(actions)
        self.events = self.events[-20:]
        return actions

    def get_state(self):
        return {
            "time": self.time,
            "agents": [a.to_dict() for a in self.agents.values()],
            "events": self.events[-10:]
        }