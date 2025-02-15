from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.routers import auth, discord_auth, releases  # import your routers

app = FastAPI(title="Capsule Story API")

# Add CORS middleware, static file mounts, etc.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Mount routers with prefixes
app.include_router(auth.router, prefix="/api/auth")
app.include_router(discord_auth.router, prefix="/api/auth")  # mounts endpoints at /api/auth/discord/login etc.
app.include_router(releases.router, prefix="/api/releases")

@app.get("/")
async def root():
    return {"message": "Welcome to Capsule Story API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
