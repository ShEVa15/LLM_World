from sqlalchemy import Column, Integer, String, Float, Boolean
from database import Base

class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    role = Column(String)
    skills = Column(String, default="")
    
    # Состояния
    status = Column(String, default="IDLE") # IDLE, WORKING, RESTING, ERROR, INCIDENT
    current_activity = Column(String, default="Свободен")
    
    # Параметры симуляции
    current_mood_score = Column(Float, default=0.8) # 0.0 - 1.0 (для генерации текста)
    stress = Column(Integer, default=0)             # 0 - 100 (игровая механика)
    
    # Координаты (0-100)
    coord_x = Column(Integer, default=50)
    coord_y = Column(Integer, default=50)

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String, default="")
    assignee_id = Column(Integer, nullable=True)
    is_completed = Column(Boolean, default=False)