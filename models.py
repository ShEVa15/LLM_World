from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from database import Base

class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    role = Column(String)
    skills = Column(String, default="")
    status = Column(String, default="IDLE") # IDLE, WORKING, RESTING, ERROR, INCIDENT
    
    # 👇 Текстовое описание того, что агент делает прямо сейчас
    current_activity = Column(String, default="Свободен") 
    
    current_mood_score = Column(Float, default=0.8)
    coord_x = Column(Integer, default=50)
    coord_y = Column(Integer, default=50)
    current_task_id = Column(Integer, nullable=True)

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String, default="")
    assignee_id = Column(Integer, nullable=True)
    is_completed = Column(Boolean, default=False)