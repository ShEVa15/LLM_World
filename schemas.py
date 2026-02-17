from pydantic import BaseModel
from typing import Optional, List

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    assignee_id: Optional[int] = None

class TaskCreate(TaskBase):
    pass

class TaskResponse(TaskBase):
    id: int
    is_completed: bool
    class Config:
        from_attributes = True

class AgentBase(BaseModel):
    name: str
    role: str
    skills: str = ""

class AgentCreate(AgentBase):
    pass

class AgentResponse(AgentBase):
    id: int
    status: str
    current_mood_score: float
    coord_x: int
    coord_y: int
    
    # 👇 Отправляем на фронт готовый текст активности
    current_activity: Optional[str] = "Свободен" 

    class Config:
        from_attributes = True