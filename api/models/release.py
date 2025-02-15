from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, INET
from .base import BaseModel

class GameRelease(BaseModel):
    __tablename__ = "game_releases"

    version = Column(String(20), nullable=False)
    platform = Column(String(20), nullable=False)
    release_type = Column(String(20), default="stable")
    release_notes = Column(String)
    file_url = Column(String(255), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    md5_hash = Column(String(32), nullable=False)
    sha256_hash = Column(String(64), nullable=False)
    downloads = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    published_at = Column(DateTime(timezone=True))
    published_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    # Relationships
    publisher = relationship("User", backref="published_releases")
    download_history = relationship("DownloadHistory", back_populates="release")

class DownloadHistory(BaseModel):
    __tablename__ = "download_history"

    release_id = Column(UUID(as_uuid=True), ForeignKey("game_releases.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    ip_address = Column(INET)
    user_agent = Column(String)
    downloaded_at = Column(DateTime(timezone=True))

    # Relationships
    release = relationship("GameRelease", back_populates="download_history")
    user = relationship("User", backref="downloads")