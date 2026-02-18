from pydantic import BaseModel, ConfigDict

class AgentResponse(BaseModel):
    id: str
    name: str
    role: str
    skills: str

    model_config = ConfigDict(from_attributes=True)