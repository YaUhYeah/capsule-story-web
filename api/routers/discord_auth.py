from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import httpx
import jwt
from datetime import datetime, timedelta

from ..database import get_db
from ..models.user import User
from ..config.oauth import oauth_settings
from ..utils.security import create_access_token

router = APIRouter()

DISCORD_AUTH_URL = "https://discord.com/api/oauth2/authorize"
DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token"
DISCORD_API_URL = "https://discord.com/api/v10"

@router.get("/discord/login")
async def discord_login():
    """Initiate Discord OAuth2 login flow"""
    params = {
        "client_id": oauth_settings.DISCORD_CLIENT_ID,
        "redirect_uri": oauth_settings.DISCORD_REDIRECT_URI,
        "response_type": "code",
        "scope": "identify email",
    }
    
    # Construct authorization URL
    auth_url = f"{DISCORD_AUTH_URL}?{'&'.join(f'{k}={v}' for k, v in params.items())}"
    return RedirectResponse(url=auth_url)

@router.get("/discord/callback")
async def discord_callback(code: str, request: Request, db: Session = Depends(get_db)):
    """Handle Discord OAuth2 callback"""
    try:
        # Exchange code for access token
        token_data = {
            "client_id": oauth_settings.DISCORD_CLIENT_ID,
            "client_secret": oauth_settings.DISCORD_CLIENT_SECRET,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": oauth_settings.DISCORD_REDIRECT_URI,
        }
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(DISCORD_TOKEN_URL, data=token_data)
            token_response.raise_for_status()
            token_info = token_response.json()

            # Get user info from Discord
            headers = {"Authorization": f"Bearer {token_info['access_token']}"}
            user_response = await client.get(f"{DISCORD_API_URL}/users/@me", headers=headers)
            user_response.raise_for_status()
            discord_user = user_response.json()

        # Check if user exists
        user = db.query(User).filter(User.discord_id == discord_user["id"]).first()
        
        if not user:
            # Create new user
            user = User(
                username=f"discord_{discord_user['username']}_{discord_user['discriminator']}",
                email=discord_user["email"],
                discord_id=discord_user["id"],
                discord_username=discord_user["username"],
                discord_avatar=f"https://cdn.discordapp.com/avatars/{discord_user['id']}/{discord_user['avatar']}.png",
                discord_access_token=token_info["access_token"],
                discord_refresh_token=token_info.get("refresh_token"),
                auth_provider="discord",
                display_name=discord_user["username"],
                avatar_url=f"https://cdn.discordapp.com/avatars/{discord_user['id']}/{discord_user['avatar']}.png",
                join_date=datetime.utcnow()
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update existing user
            user.discord_username = discord_user["username"]
            user.discord_avatar = f"https://cdn.discordapp.com/avatars/{discord_user['id']}/{discord_user['avatar']}.png"
            user.discord_access_token = token_info["access_token"]
            user.discord_refresh_token = token_info.get("refresh_token")
            user.last_login = datetime.utcnow()
            db.commit()

        # Create JWT token
        access_token = create_access_token(
            data={"sub": user.username},
            expires_delta=timedelta(minutes=oauth_settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        # Set cookie with JWT token
        response = RedirectResponse(url="/")
        response.set_cookie(
            key="access_token",
            value=f"Bearer {access_token}",
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=oauth_settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
        return response

    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to authenticate with Discord: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/discord/refresh")
async def refresh_discord_token(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Refresh Discord access token using refresh token"""
    if not user.discord_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No refresh token available"
        )

    try:
        refresh_data = {
            "client_id": oauth_settings.DISCORD_CLIENT_ID,
            "client_secret": oauth_settings.DISCORD_CLIENT_SECRET,
            "grant_type": "refresh_token",
            "refresh_token": user.discord_refresh_token,
        }
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(DISCORD_TOKEN_URL, data=refresh_data)
            token_response.raise_for_status()
            token_info = token_response.json()

            # Update user tokens
            user.discord_access_token = token_info["access_token"]
            user.discord_refresh_token = token_info.get("refresh_token")
            db.commit()

            return {"message": "Discord token refreshed successfully"}

    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to refresh Discord token: {str(e)}"
        )