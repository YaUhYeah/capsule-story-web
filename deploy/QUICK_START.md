# Quick Start Deployment Guide

This guide will help you deploy the Capsule Story website to a DigitalOcean droplet in just a few steps.

## Prerequisites

1. A DigitalOcean account
2. A domain name pointing to your DigitalOcean droplet
3. Discord Developer Application credentials
4. SSH access to your droplet

## Deployment Steps

1. Create a new Ubuntu droplet on DigitalOcean:
   - Choose Ubuntu 22.04 LTS
   - Select at least 2GB RAM / 1 CPU
   - Add your SSH key
   - Choose a datacenter region close to your users

2. Point your domain to the droplet:
   - Add an A record pointing to your droplet's IP
   - Add a CNAME record for 'www' pointing to your domain

3. SSH into your droplet:
```bash
ssh root@your-droplet-ip
```

4. Download and run the setup script:
```bash
curl -O https://raw.githubusercontent.com/YaUhYeah/capsule-story-web/main/deploy/setup.sh
chmod +x setup.sh
./setup.sh
```

5. Follow the prompts to enter:
   - Your domain name
   - Your email address
   - Discord Client ID
   - Discord Client Secret

The script will automatically:
- Set up the server environment
- Install all dependencies
- Configure the database
- Set up SSL certificates
- Configure Nginx
- Set up monitoring
- Create backup scripts
- Start the application

## Verifying the Deployment

After deployment, you can verify everything is working:

```bash
cd /home/capsule/capsulestory
./verify_deployment.sh
```

## Updating the Application

To update the application:

```bash
cd /home/capsule/capsulestory
./update.sh
```

## Backup and Restore

Backups are automatically created daily. To manually create a backup:

```bash
cd /home/capsule/capsulestory
./backup.sh
```

## Monitoring

Access the Grafana dashboard at:
```
https://your-domain.com:3000
```
Default credentials:
- Username: admin
- Password: admin

## Troubleshooting

If you encounter issues:

1. Check the logs:
```bash
journalctl -u capsulestory -f
```

2. Check Nginx logs:
```bash
tail -f /var/log/nginx/error.log
```

3. Verify services are running:
```bash
systemctl status capsulestory
systemctl status nginx
```

4. Check SSL certificate:
```bash
certbot certificates
```

## Security

The deployment includes:
- Firewall configuration
- SSL certificates
- fail2ban for brute force protection
- Automatic security updates

## Support

If you need help, you can:
1. Check the logs using the commands above
2. Open an issue on GitHub
3. Contact support at support@capsulestory.com