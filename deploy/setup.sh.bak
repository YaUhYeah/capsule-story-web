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

# Update system
log "Updating system packages..."
apt update && apt upgrade -y || error "Failed to update system packages"

# Install required packages
log "Installing required packages..."
apt install -y python3-pip python3-venv nginx postgresql postgresql-contrib ufw certbot python3-certbot-nginx fail2ban || error "Failed to install required packages"

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
DATABASE_URL=postgresql://${APP_NAME}user:${DB_PASSWORD}@localhost/$APP_NAME
JWT_SECRET_KEY=$(openssl rand -hex 32)
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET=$DISCORD_CLIENT_SECRET
DISCORD_REDIRECT_URI=https://$DOMAIN/api/auth/discord/callback
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE=100000000
EOL

# Configure Nginx
log "Configuring Nginx..."
cat > "/etc/nginx/sites-available/$APP_NAME" << EOL
server {
    server_name $DOMAIN www.$DOMAIN;

    location / {
        root $APP_DIR/game-website;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /uploads {
        alias $APP_DIR/uploads;
        expires 30d;
        add_header Cache-Control "public, no-transform";
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

# Create systemd service
log "Creating systemd service..."
cat > "/etc/systemd/system/$APP_NAME.service" << EOL
[Unit]
Description=Capsule Story API
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
pg_dump $APP_NAME > \$BACKUP_DIR/${APP_NAME}_\$TIMESTAMP.sql
find \$BACKUP_DIR -type f -mtime +7 -delete
EOL

chmod +x "$APP_DIR/backup.sh"

# Set up daily backup cron job
(crontab -l 2>/dev/null; echo "0 0 * * * $APP_DIR/backup.sh") | crontab -

# Start application
log "Starting application..."
systemctl daemon-reload
systemctl start $APP_NAME
systemctl enable $APP_NAME

# Set up monitoring (optional)
log "Setting up basic monitoring..."
apt install -y prometheus node-exporter grafana
systemctl start grafana-server
systemctl enable grafana-server

# Print completion message and important information
log "Deployment completed successfully!"
echo -e "${GREEN}Important Information:${NC}"
echo -e "Database Password: $DB_PASSWORD"
echo -e "Website URL: https://$DOMAIN"
echo -e "Grafana Dashboard: https://$DOMAIN:3000"
echo -e "Backup Location: $APP_DIR/backups"
echo -e "\n${YELLOW}Please save this information securely!${NC}"

# Create deployment verification script
cat > "$APP_DIR/verify_deployment.sh" << EOL
#!/bin/bash
echo "Checking deployment status..."
echo "1. Checking Nginx status..."
systemctl status nginx
echo "2. Checking application status..."
systemctl status $APP_NAME
echo "3. Checking database connection..."
sudo -u $APP_USER psql -d $APP_NAME -c "\l"
echo "4. Checking SSL certificate..."
certbot certificates
echo "5. Checking firewall status..."
ufw status
echo "6. Checking fail2ban status..."
fail2ban-client status
echo "7. Checking monitoring services..."
systemctl status prometheus
systemctl status grafana-server
EOL

chmod +x "$APP_DIR/verify_deployment.sh"

# Create update script
cat > "$APP_DIR/update.sh" << EOL
#!/bin/bash
cd $APP_DIR
git pull
source venv/bin/activate
pip install -r requirements.txt
systemctl restart $APP_NAME
systemctl restart nginx
echo "Update completed!"
EOL

chmod +x "$APP_DIR/update.sh"

log "Deployment scripts created:"
echo "1. verify_deployment.sh - Check deployment status"
echo "2. update.sh - Update application"
echo "3. backup.sh - Create database backup"

# Final verification
log "Running deployment verification..."
bash "$APP_DIR/verify_deployment.sh"