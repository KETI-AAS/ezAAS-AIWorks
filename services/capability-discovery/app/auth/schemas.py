from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class HubIdentity(BaseModel):
    hub_user_id: str = Field(min_length=1, max_length=128)
    hub_session_id: UUID
    expires_at: datetime


class CurrentUser(BaseModel):
    capability_user_id: str
    hub_user_id: str
    hub_session_id: str
    expires_at: datetime
