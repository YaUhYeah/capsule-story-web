#!/bin/bash

# Create required directories
mkdir -p /home/capsule/capsulestory/{static,uploads,logs}
chown -R capsule:capsule /home/capsule/capsulestory

# Copy service file
cp capsulestory.service /etc/systemd/system/

# Reload systemd
systemctl daemon-reload

# Start and enable service
systemctl start capsulestory
systemctl enable capsulestory

# Check status
systemctl status capsulestory