# Deploying Capsule Story Website to DigitalOcean

This guide will help you deploy the Capsule Story website to a DigitalOcean droplet running Ubuntu.

## Prerequisites

1. DigitalOcean account
2. Domain name (optional but recommended)
3. Discord Developer Application credentials
4. PostgreSQL database credentials

## Step 1: Create a Droplet

1. Log in to DigitalOcean
2. Click "Create" > "Droplets"
3. Choose configuration:
   - Ubuntu 22.04 LTS
   - Basic plan (minimum 2GB RAM recommended)
   - Choose a datacenter region close to your target audience
   - Add SSH key for secure access
   - Choose hostname (e.g., capsule-story)

## Step 2: Initial Server Setup

```bash
# SSH into your droplet
ssh root@your_server_ip

# Update system packages
apt update && apt upgrade -y

# Install required packages
apt install -y python3-pip python3-venv nginx postgresql postgresql-contrib ufw

# Create a new user
adduser capsule
usermod -aG sudo capsule

# Set up firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## Step 3: Set Up PostgreSQL

```bash
# Switch to postgres user
sudo -i -u postgres

# Create database and user
createdb capsulestory
createuser capsuleuser
psql -c "ALTER USER capsuleuser WITH PASSWORD 'your_secure_password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE capsulestory TO capsuleuser;"

# Exit postgres user
exit
```

## Step 4: Deploy Application

```bash
# Switch to application user
su - capsule

# Clone repository
git clone https://github.com/your-repo/capsule-story.git
cd capsule-story

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cat > .env << EOL
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://your-domain.com/api/auth/discord/callback
JWT_SECRET_KEY=your_secure_jwt_secret
DATABASE_URL=postgresql://capsuleuser:your_secure_password@localhost/capsulestory
EOL

# Initialize database
alembic upgrade head
```

## Step 5: Set Up Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/capsulestory

# Add the following configuration:
server {
    server_name your-domain.com www.your-domain.com;

    location / {
        root /home/capsule/capsule-story/game-website;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        alias /home/capsule/capsule-story/uploads;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = www.your-domain.com) {
        return 301 https://$host$request_uri;
    }
    if ($host = your-domain.com) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 404;
}
```

## Step 6: Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Enable Nginx configuration
sudo ln -s /etc/nginx/sites-available/capsulestory /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 7: Set Up Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/capsulestory.service

# Add the following content:
[Unit]
Description=Capsule Story API
After=network.target

[Service]
User=capsule
Group=capsule
WorkingDirectory=/home/capsule/capsule-story
Environment="PATH=/home/capsule/capsule-story/venv/bin"
ExecStart=/home/capsule/capsule-story/venv/bin/uvicorn api.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target

# Start and enable service
sudo systemctl start capsulestory
sudo systemctl enable capsulestory
```

## Step 8: Set Up Monitoring (Optional)

```bash
# Install monitoring tools
sudo apt install -y prometheus node-exporter

# Set up monitoring dashboard with Grafana
sudo apt install -y grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
```

## Maintenance and Updates

### Updating the Application

```bash
cd /home/capsule/capsule-story
git pull
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart capsulestory
```

### Backup Database

```bash
# Create backup script
cat > backup.sh << EOL
#!/bin/bash
BACKUP_DIR="/home/capsule/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump capsulestory > $BACKUP_DIR/capsulestory_$TIMESTAMP.sql
EOL

chmod +x backup.sh
```

### Monitoring Logs

```bash
# View application logs
sudo journalctl -u capsulestory -f

# View Nginx access logs
sudo tail -f /var/log/nginx/access.log

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

## Security Considerations

1. Keep system packages updated:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. Configure automatic security updates:
   ```bash
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure unattended-upgrades
   ```

3. Monitor system resources:
   ```bash
   htop
   ```

4. Set up fail2ban for additional security:
   ```bash
   sudo apt install fail2ban
   sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
   sudo systemctl restart fail2ban
   ```

## Troubleshooting

1. Check application status:
   ```bash
   sudo systemctl status capsulestory
   ```

2. Check Nginx status:
   ```bash
   sudo systemctl status nginx
   ```

3. Check database connection:
   ```bash
   psql -U capsuleuser -d capsulestory -h localhost
   ```

4. Check SSL certificate:
   ```bash
   sudo certbot certificates
   ```

## Additional Optimizations

1. Set up CDN for static content (recommended: Cloudflare)
2. Configure caching headers in Nginx
3. Set up regular database maintenance
4. Configure automatic backups
5. Set up error monitoring (e.g., Sentry)

Remember to:
- Regularly update system packages
- Monitor system resources
- Back up database regularly
- Keep SSL certificates up to date
- Monitor application logs
- Set up alerts for system issues