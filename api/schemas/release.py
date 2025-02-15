from pydantic import BaseModel, UUID4, validator
from typing import Optional, Literal
from datetime import datetime

class ReleaseBase(BaseModel):
    version: str
    platform: Literal["android", "desktop"]
    release_type: Literal["stable", "beta", "alpha"] = "stable"
    release_notes: str

    @validator('version')
    def version_format(cls, v):
        import re
        if not re.match(r'^\d+\.\d+\.\d+$', v):
            raise ValueError('Version must be in format X.Y.Z')
        return v

class ReleaseCreate(ReleaseBase):
    file_url: str
    file_size: int
    md5_hash: str
    sha256_hash: str

class ReleaseUpdate(BaseModel):
    release_notes: Optional[str] = None
    is_active: Optional[bool] = None
    release_type: Optional[Literal["stable", "beta", "alpha"]] = None

class ReleaseFile(BaseModel):
    file_url: str
    file_size: int
    md5_hash: str
    sha256_hash: str

class ReleaseInfo(ReleaseBase):
    id: UUID4
    file_size: int
    downloads: int
    is_active: bool
    published_at: datetime
    published_by: UUID4
    file_info: ReleaseFile

    class Config:
        orm_mode = True

class DownloadCreate(BaseModel):
    release_id: UUID4
    user_id: Optional[UUID4] = None
    ip_address: str
    user_agent: str

class DownloadInfo(BaseModel):
    id: UUID4
    release_id: UUID4
    user_id: Optional[UUID4]
    ip_address: str
    user_agent: str
    downloaded_at: datetime

    class Config:
        orm_mode = True