from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    current_mood_score = Column(Integer, default=0)

    tasks = relationship("Task", back_populates="assignee", cascade="all, delete-orphan")
    relationships_as_agent1 = relationship(
        "Relationship",
        foreign_keys="Relationship.agent_1_id",
        back_populates="agent1",
        cascade="all, delete-orphan"
    )
    relationships_as_agent2 = relationship(
        "Relationship",
        foreign_keys="Relationship.agent_2_id",
        back_populates="agent2",
        cascade="all, delete-orphan"
    )


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    status = Column(String, default="todo")
    assignee_id = Column(Integer, ForeignKey("agents.id"))

    assignee = relationship("Agent", back_populates="tasks")


class Relationship(Base):
    __tablename__ = "relationships"
    
    __table_args__ = (
        UniqueConstraint("agent_1_id", "agent_2_id", name="unique_agent_pair"),
    )

    id = Column(Integer, primary_key=True, index=True)
    agent_1_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    agent_2_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    affinity_score = Column(Integer, default=0)

    agent1 = relationship("Agent", foreign_keys=[agent_1_id], back_populates="relationships_as_agent1")
    agent2 = relationship("Agent", foreign_keys=[agent_2_id], back_populates="relationships_as_agent2")

