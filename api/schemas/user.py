from pydantic import BaseModel, EmailStr, UUID4, validator
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: EmailStr
    display_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None

class UserSettings(BaseModel):
    show_online_status: bool = True
    show_game_progress: bool = True
    show_inventory: bool = True
    email_notifications: bool = True
    forum_notifications: bool = True
    achievement_notifications: bool = True
    theme: str = "light"
    language: str = "en"

class UserGameProgress(BaseModel):
    play_time: int = 0
    monsters_tamed: int = 0
    items_crafted: int = 0
    structures_built: int = 0
    game_version: Optional[str] = None
    save_data: Optional[dict] = None

class UserProfile(BaseModel):
    id: UUID4
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    role: str
    reputation: int
    join_date: datetime
    last_login: Optional[datetime]
    settings: UserSettings
    game_progress: Optional[UserGameProgress]

    class Config:
        orm_mode = True

class UserAuth(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile