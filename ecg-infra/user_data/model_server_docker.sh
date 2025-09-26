#!/bin/bash

# ECG Audio Analyzer - Model Server Docker Setup
# Ubuntu 22.04 LTS + Docker + NVIDIA Container Toolkit

set -e

# Update system
apt-get update && apt-get upgrade -y

# Install prerequisites
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    htop

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

apt-get update && apt-get install -y nvidia-container-toolkit

# Configure Docker to use nvidia runtime
nvidia-ctk runtime configure --runtime=docker
systemctl restart docker

# Enable Docker service
systemctl enable docker

# Clone and setup application
cd /home/ubuntu

# Clone repository (replace with your actual repo URL)
git clone ${repo_url} ecg-audio-analyzer || {
    echo "Failed to clone repository. Please check the repo_url variable."
    exit 1
}

cd ecg-audio-analyzer

# Build Docker image
docker build -t ecg-analyzer . || {
    echo "Failed to build Docker image."
    exit 1
}

# Create environment file
cat > .env << EOF
AWS_REGION=${aws_region}
S3_BUCKET=${s3_bucket_name}
LOG_LEVEL=info
HOST=0.0.0.0
PORT=8001
EOF

# Change ownership to ubuntu user
chown -R ubuntu:ubuntu /home/ubuntu/ecg-audio-analyzer

# Create systemd service for the application
cat > /etc/systemd/system/ecg-analyzer.service << EOF
[Unit]
Description=ECG Audio Analyzer ML API Server
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/ecg-audio-analyzer
ExecStartPre=-/usr/bin/docker stop ecg-ml-server
ExecStartPre=-/usr/bin/docker rm ecg-ml-server
ExecStart=/usr/bin/docker run --name ecg-ml-server --gpus all -p 8001:8001 --env-file .env --restart unless-stopped ecg-analyzer
ExecStop=/usr/bin/docker stop ecg-ml-server
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl daemon-reload
systemctl enable ecg-analyzer.service
systemctl start ecg-analyzer.service

# Log completion
echo "ECG Audio Analyzer setup completed successfully!" > /var/log/user-data.log
echo "Service status:" >> /var/log/user-data.log
systemctl status ecg-analyzer.service >> /var/log/user-data.log