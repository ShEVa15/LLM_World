from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.sql import func
from database import Base

class Agent(Base):
    __tablename__ = "agents"

    # Строковый ID (ockham, christina, darius)
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    skills = Column(String, default="")

class ChatLog(Base):
    __tablename__ = "chat_logs"
    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(String)
    prompt = Column(String)
    reply = Column(String)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())