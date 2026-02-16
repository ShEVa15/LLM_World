from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .world import World

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

world = World()
world.load_agents("agents.json")

@app.get("/state")
def get_state():
    return world.get_state()

@app.post("/step")
def step():
    world.step()
    return {"status": "ok"}