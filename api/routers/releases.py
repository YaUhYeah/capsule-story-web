from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import hashlib
import os
from datetime import datetime

from ..database import get_db
from ..models.release import GameRelease, DownloadHistory
from ..schemas.release import ReleaseCreate, ReleaseUpdate, ReleaseInfo, DownloadInfo
from ..utils.security import get_current_user, get_current_admin_user
from ..utils.storage import save_file, delete_file

router = APIRouter()

UPLOAD_DIR = "uploads/releases"
CHUNK_SIZE = 8192  # 8KB chunks for file handling

@router.get("/", response_model=List[ReleaseInfo])
async def list_releases(
    platform: Optional[str] = None,
    release_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(GameRelease).filter(GameRelease.is_active == True)
    
    if platform:
        query = query.filter(GameRelease.platform == platform)
    if release_type:
        query = query.filter(GameRelease.release_type == release_type)
    
    return query.order_by(GameRelease.published_at.desc()).all()

@router.get("/{release_id}", response_model=ReleaseInfo)
async def get_release(release_id: str, db: Session = Depends(get_db)):
    release = db.query(GameRelease).filter(GameRelease.id == release_id).first()
    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Release not found"
        )
    return release

@router.post("/", response_model=ReleaseInfo)
async def create_release(
    release: ReleaseCreate,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_admin_user)
):
    # Validate file extension
    allowed_extensions = {
        "android": [".apk"],
        "desktop": [".jar"]
    }
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions[release.platform]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type for {release.platform} platform"
        )

    # Calculate file hash and size
    md5_hash = hashlib.md5()
    sha256_hash = hashlib.sha256()
    file_size = 0
    
    contents = await file.read()
    md5_hash.update(contents)
    sha256_hash.update(contents)
    file_size = len(contents)

    # Save file
    file_path = f"{UPLOAD_DIR}/{release.platform}/{release.version}{file_ext}"
    save_file(contents, file_path)

    # Create release record
    db_release = GameRelease(
        version=release.version,
        platform=release.platform,
        release_type=release.release_type,
        release_notes=release.release_notes,
        file_url=file_path,
        file_size=file_size,
        md5_hash=md5_hash.hexdigest(),
        sha256_hash=sha256_hash.hexdigest(),
        published_at=datetime.utcnow(),
        published_by=current_user.id
    )
    
    db.add(db_release)
    db.commit()
    db.refresh(db_release)
    
    return db_release

@router.patch("/{release_id}", response_model=ReleaseInfo)
async def update_release(
    release_id: str,
    release_update: ReleaseUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_admin_user)
):
    db_release = db.query(GameRelease).filter(GameRelease.id == release_id).first()
    if not db_release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Release not found"
        )

    # Update fields
    for field, value in release_update.dict(exclude_unset=True).items():
        setattr(db_release, field, value)

    db.commit()
    db.refresh(db_release)
    return db_release

@router.delete("/{release_id}")
async def delete_release(
    release_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_admin_user)
):
    db_release = db.query(GameRelease).filter(GameRelease.id == release_id).first()
    if not db_release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Release not found"
        )

    # Soft delete - just mark as inactive
    db_release.is_active = False
    db.commit()

    return {"message": "Release deleted successfully"}

@router.get("/{release_id}/download")
async def download_release(
    release_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user)
):
    release = db.query(GameRelease).filter(
        GameRelease.id == release_id,
        GameRelease.is_active == True
    ).first()
    
    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Release not found"
        )

    # Record download
    download = DownloadHistory(
        release_id=release.id,
        user_id=current_user.id if current_user else None,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
        downloaded_at=datetime.utcnow()
    )
    db.add(download)
    
    # Increment download count
    release.downloads += 1
    db.commit()

    return FileResponse(
        path=release.file_url,
        filename=os.path.basename(release.file_url),
        media_type="application/octet-stream"
    )

@router.get("/downloads", response_model=List[DownloadInfo])
async def list_downloads(
    release_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_admin_user)
):
    query = db.query(DownloadHistory)
    if release_id:
        query = query.filter(DownloadHistory.release_id == release_id)
    
    return query.order_by(DownloadHistory.downloaded_at.desc()).all()

@router.get("/stats")
async def get_release_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_admin_user)
):
    total_downloads = db.query(GameRelease.downloads).sum()
    platform_downloads = db.query(
        GameRelease.platform,
        db.func.sum(GameRelease.downloads)
    ).group_by(GameRelease.platform).all()
    
    latest_downloads = db.query(DownloadHistory).order_by(
        DownloadHistory.downloaded_at.desc()
    ).limit(10).all()

    return {
        "total_downloads": total_downloads,
        "platform_downloads": dict(platform_downloads),
        "latest_downloads": latest_downloads
    }