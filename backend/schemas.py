from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional
from datetime import datetime

# ----- Agent -----
class AgentBase(BaseModel):
    name: str
    role: str

class AgentCreate(AgentBase):
    current_mood_score: Optional[int] = Field(default=0, ge=-100, le=100)

class AgentResponse(AgentBase):
    id: int
    current_mood_score: int

    model_config = ConfigDict(from_attributes=True)

# ----- Task -----
class TaskBase(BaseModel):
    description: str
    status: Optional[str] = Field(default="todo", pattern="^(todo|in_progress|done)$")


class TaskCreate(TaskBase):
    assignee_id: Optional[int] = None

class TaskResponse(TaskBase):
    id: int
    assignee_id: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

# ----- Relationship -----
class RelationshipBase(BaseModel):
    agent_1_id: int
    agent_2_id: int
    affinity_score: Optional[int] = Field(default=0, ge=-100, le=100)


class RelationshipCreate(RelationshipBase):
    @field_validator('agent_2_id')
    def check_not_same_agent(cls, v, info):
        if 'agent_1_id' in info.data and v == info.data['agent_1_id']:
            raise ValueError('agent_1_id and agent_2_id must be different')
        return v


class RelationshipResponse(RelationshipBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# ----- Message -----
class MessageBase(BaseModel):
    content: str
    recipient_id: Optional[int] = None   # если None – сообщение для всех

class MessageCreate(MessageBase):
    pass

class MessageResponse(MessageBase):
    id: int
    sender_type: str
    sender_id: Optional[int]
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)