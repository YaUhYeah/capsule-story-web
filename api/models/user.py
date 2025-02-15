from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from .base import BaseModel

class User(BaseModel):
    __tablename__ = "users"

    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True)  # Nullable for OAuth users
    discord_id = Column(String(50), unique=True, nullable=True)
    discord_username = Column(String(100), nullable=True)
    discord_avatar = Column(String(255), nullable=True)
    discord_access_token = Column(String(255), nullable=True)
    discord_refresh_token = Column(String(255), nullable=True)
    auth_provider = Column(String(20), default="local")
    display_name = Column(String(100))
    avatar_url = Column(String(255))
    role = Column(String(20), default="user")
    reputation = Column(Integer, default=0)
    join_date = Column(DateTime(timezone=True))
    last_login = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    verification_token = Column(UUID(as_uuid=True))
    reset_password_token = Column(UUID(as_uuid=True))
    reset_token_expires = Column(DateTime(timezone=True))

    # Relationships
    settings = relationship("UserSettings", back_populates="user", uselist=False)
    game_progress = relationship("GameProgress", back_populates="user", uselist=False)
    achievements = relationship("UserAchievement", back_populates="user")
    inventory = relationship("UserInventory", back_populates="user")
    forum_posts = relationship("ForumPost", back_populates="user")
    wiki_revisions = relationship("WikiRevision", back_populates="user")
    activity_log = relationship("ActivityLog", back_populates="user")

class UserSettings(BaseModel):
    __tablename__ = "user_settings"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    show_online_status = Column(Boolean, default=True)
    show_game_progress = Column(Boolean, default=True)
    show_inventory = Column(Boolean, default=True)
    email_notifications = Column(Boolean, default=True)
    forum_notifications = Column(Boolean, default=True)
    achievement_notifications = Column(Boolean, default=True)
    theme = Column(String(20), default="light")
    language = Column(String(10), default="en")

    # Relationships
    user = relationship("User", back_populates="settings")

class GameProgress(BaseModel):
    __tablename__ = "game_progress"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    play_time = Column(Integer, default=0)
    monsters_tamed = Column(Integer, default=0)
    items_crafted = Column(Integer, default=0)
    structures_built = Column(Integer, default=0)
    last_sync = Column(DateTime(timezone=True))
    game_version = Column(String(20))
    save_data = Column(JSONB)

    # Relationships
    user = relationship("User", back_populates="game_progress")