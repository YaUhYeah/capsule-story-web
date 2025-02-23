#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration variables
APP_NAME="capsulestory"
APP_USER="capsule"
APP_DIR="/home/$APP_USER/$APP_NAME"
DOMAIN=""
EMAIL=""
DB_PASSWORD=$(openssl rand -base64 32)
FLASK_SECRET_KEY=$(openssl rand -base64 32)
JWT_SECRET_KEY=$(openssl rand -base64 32)

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Check if script is run as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root"
fi

# Get configuration from user
read -p "Enter your domain name (e.g., capsulestory.com): " DOMAIN
read -p "Enter your email address (for SSL certificate): " EMAIL
read -p "Enter your Discord Client ID: " DISCORD_CLIENT_ID
read -p "Enter your Discord Client Secret: " DISCORD_CLIENT_SECRET
read -p "Enter the port for the Flask server (default: 53202): " FLASK_PORT
FLASK_PORT=${FLASK_PORT:-53202}

# Update system
log "Updating system packages..."
apt update && apt upgrade -y || error "Failed to update system packages"

# Install required packages
log "Installing required packages..."
apt install -y python3-pip python3-venv nginx postgresql postgresql-contrib ufw certbot python3-certbot-nginx fail2ban redis-server || error "Failed to install required packages"

# Create application user
log "Creating application user..."
if id "$APP_USER" &>/dev/null; then
    warning "User $APP_USER already exists"
else
    useradd -m -s /bin/bash $APP_USER || error "Failed to create user $APP_USER"
    usermod -aG sudo $APP_USER || error "Failed to add user to sudo group"
fi

# Configure PostgreSQL
log "Configuring PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE $APP_NAME;" || warning "Database might already exist"
sudo -u postgres psql -c "CREATE USER ${APP_NAME}user WITH PASSWORD '$DB_PASSWORD';" || warning "User might already exist"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $APP_NAME TO ${APP_NAME}user;" || warning "Privileges might already be granted"

# Configure Firewall
log "Configuring firewall..."
ufw allow OpenSSH || error "Failed to allow OpenSSH"
ufw allow 'Nginx Full' || error "Failed to allow Nginx"
ufw allow $FLASK_PORT/tcp || error "Failed to allow Flask port"
ufw --force enable || error "Failed to enable firewall"

# Clone repository and set up application
log "Setting up application..."
su - $APP_USER -c "
    git clone https://github.com/YaUhYeah/capsule-story-web.git $APP_NAME
    cd $APP_NAME
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
"

# Create environment file
log "Creating environment file..."
cat > "$APP_DIR/.env" << EOL
# Database
DATABASE_URL=postgresql://${APP_NAME}user:${DB_PASSWORD}@localhost/$APP_NAME

# JWT
JWT_SECRET_KEY=$JWT_SECRET_KEY
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Discord OAuth
DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET=$DISCORD_CLIENT_SECRET
DISCORD_REDIRECT_URI=https://$DOMAIN/api/auth/discord/callback

# Flask
FLASK_SECRET_KEY=$FLASK_SECRET_KEY
FLASK_ENV=production

# File Upload
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE=100000000

# Server
PORT=$FLASK_PORT
HOST=0.0.0.0
EOL

# Configure Nginx
log "Configuring Nginx..."
cat > "/etc/nginx/sites-available/$APP_NAME" << EOL
server {
    server_name $DOMAIN www.$DOMAIN;

    # Static website files
    location / {
        root $APP_DIR;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # Enable CORS
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
    }

    # FastAPI backend
    location /api/v1 {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Enable CORS
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
    }

    # Flask auth server
    location /api/auth {
        proxy_pass http://localhost:$FLASK_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Enable CORS
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
    }

    # File uploads
    location /uploads {
        alias $APP_DIR/uploads;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Forum static files
    location /forum {
        alias $APP_DIR/forum;
        try_files \$uri \$uri/ /forum/index.html;
    }

    # Wiki static files
    location /wiki {
        alias $APP_DIR/wiki;
        try_files \$uri \$uri/ /wiki/index.html;
    }

    listen 80;
}
EOL

ln -sf "/etc/nginx/sites-available/$APP_NAME" "/etc/nginx/sites-enabled/" || error "Failed to enable Nginx site"
nginx -t || error "Nginx configuration test failed"
systemctl restart nginx || error "Failed to restart Nginx"

# Set up SSL
log "Setting up SSL certificate..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m $EMAIL || error "Failed to obtain SSL certificate"

# Create systemd services
log "Creating FastAPI systemd service..."
cat > "/etc/systemd/system/${APP_NAME}_api.service" << EOL
[Unit]
Description=Capsule Story FastAPI Backend
After=network.target

[Service]
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
Environment="PATH=$APP_DIR/venv/bin"
ExecStart=$APP_DIR/venv/bin/uvicorn api.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOL

log "Creating Flask Auth systemd service..."
cat > "/etc/systemd/system/${APP_NAME}_auth.service" << EOL
[Unit]
Description=Capsule Story Flask Auth Server
After=network.target

[Service]
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
Environment="PATH=$APP_DIR/venv/bin"
ExecStart=$APP_DIR/venv/bin/python3 api/auth/discord/login.py
Restart=always

[Install]
WantedBy=multi-user.target
EOL

# Set up fail2ban
log "Configuring fail2ban..."
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
systemctl restart fail2ban || warning "Failed to restart fail2ban"

# Set up automatic updates
log "Configuring automatic updates..."
apt install -y unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades

# Create backup script
log "Creating backup script..."
cat > "$APP_DIR/backup.sh" << EOL
#!/bin/bash
BACKUP_DIR="$APP_DIR/backups"
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
mkdir -p \$BACKUP_DIR

# Backup database
pg_dump $APP_NAME > \$BACKUP_DIR/${APP_NAME}_\$TIMESTAMP.sql

# Backup uploads
tar -czf \$BACKUP_DIR/uploads_\$TIMESTAMP.tar.gz $APP_DIR/uploads

# Remove backups older than 7 days
find \$BACKUP_DIR -type f -mtime +7 -delete
EOL

chmod +x "$APP_DIR/backup.sh"

# Set up daily backup cron job
(crontab -l 2>/dev/null; echo "0 0 * * * $APP_DIR/backup.sh") | crontab -

# Create uploads directory
log "Creating uploads directory..."
mkdir -p "$APP_DIR/uploads"
chown -R $APP_USER:$APP_USER "$APP_DIR/uploads"

# Start services
log "Starting services..."
systemctl daemon-reload
systemctl start ${APP_NAME}_api
systemctl enable ${APP_NAME}_api
systemctl start ${APP_NAME}_auth
systemctl enable ${APP_NAME}_auth
systemctl restart nginx

# Set up monitoring
log "Setting up basic monitoring..."
apt install -y prometheus node-exporter grafana
systemctl start grafana-server
systemctl enable grafana-server

# Print completion message and important information
log "Deployment completed successfully!"
echo -e "${GREEN}Important Information:${NC}"
echo -e "Database Password: $DB_PASSWORD"
echo -e "Flask Secret Key: $FLASK_SECRET_KEY"
echo -e "JWT Secret Key: $JWT_SECRET_KEY"
echo -e "Website URL: https://$DOMAIN"
echo -e "FastAPI Port: 8000"
echo -e "Flask Auth Port: $FLASK_PORT"
echo -e "Grafana Dashboard: https://$DOMAIN:3000"
echo -e "Backup Location: $APP_DIR/backups"
echo -e "\n${YELLOW}Please save this information securely!${NC}"

# Create deployment verification script
cat > "$APP_DIR/verify_deployment.sh" << EOL
#!/bin/bash
echo "Checking deployment status..."
echo "1. Checking Nginx status..."
systemctl status nginx
echo "2. Checking FastAPI status..."
systemctl status ${APP_NAME}_api
echo "3. Checking Flask Auth status..."
systemctl status ${APP_NAME}_auth
echo "4. Checking database connection..."
sudo -u $APP_USER psql -d $APP_NAME -c "\l"
echo "5. Checking SSL certificate..."
certbot certificates
echo "6. Checking firewall status..."
ufw status
echo "7. Checking fail2ban status..."
fail2ban-client status
echo "8. Checking monitoring services..."
systemctl status prometheus
systemctl status grafana-server
echo "9. Checking Discord OAuth configuration..."
echo "Discord Client ID: $DISCORD_CLIENT_ID"
echo "Discord Redirect URI: https://$DOMAIN/api/auth/discord/callback"
EOL

chmod +x "$APP_DIR/verify_deployment.sh"

# Create update script
cat > "$APP_DIR/update.sh" << EOL
#!/bin/bash
cd $APP_DIR
git pull
source venv/bin/activate
pip install -r requirements.txt
systemctl restart ${APP_NAME}_api
systemctl restart ${APP_NAME}_auth
systemctl restart nginx
echo "Update completed!"
EOL

chmod +x "$APP_DIR/update.sh"

# Create logs directory
mkdir -p "$APP_DIR/logs"
touch "$APP_DIR/logs/api.log"
touch "$APP_DIR/logs/auth.log"
chown -R $APP_USER:$APP_USER "$APP_DIR/logs"

log "Deployment scripts created:"
echo "1. verify_deployment.sh - Check deployment status"
echo "2. update.sh - Update application"
echo "3. backup.sh - Create database backup"

# Final verification
log "Running deployment verification..."
bash "$APP_DIR/verify_deployment.sh"