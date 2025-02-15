# Capsule Story Website

A comprehensive website for Capsule Story game, featuring game downloads, community forums, wiki, and user profiles.

## Features

- Game download management for Android and Desktop platforms
- User profiles with game progress tracking
- Community forums
- Game wiki
- Discord integration
- Achievement system
- Inventory management

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Python (FastAPI)
- Database: PostgreSQL
- Authentication: JWT + Discord OAuth2

## Prerequisites

- Python 3.8+
- PostgreSQL 12+
- Node.js 14+ (for frontend build tools, if used)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/capsule-story-website.git
cd capsule-story-website
```

2. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create .env file:
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Initialize database:
```bash
alembic upgrade head
```

6. Run the development server:
```bash
uvicorn api.main:app --reload
```

## Configuration

Create a `.env` file in the project root with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost/dbname

# JWT
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Discord OAuth
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_REDIRECT_URI=http://localhost:8000/api/auth/discord/callback

# File Upload
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE=100000000  # 100MB in bytes
```

## Project Structure

```
capsule-story-website/
├── api/                    # Backend API
│   ├── config/            # Configuration
│   ├── models/            # Database models
│   ├── routers/           # API routes
│   ├── schemas/           # Pydantic schemas
│   └── utils/             # Utility functions
├── database/              # Database migrations
├── static/                # Static files
├── uploads/               # User uploads
└── game-website/          # Frontend files
    ├── css/
    ├── js/
    ├── images/
    └── index.html
```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@capsulestory.com or join our [Discord server](https://discord.gg/capsulestory).