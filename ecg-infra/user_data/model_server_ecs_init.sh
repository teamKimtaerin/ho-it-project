#!/bin/bash

# Log all output for debugging
exec > >(tee /var/log/user-data.log) 2>&1

# Update system
yum update -y

# Install required packages
yum install -y docker nvidia-container-toolkit amazon-cloudwatch-agent

# Configure Docker
systemctl start docker
systemctl enable docker

# Configure NVIDIA Docker support
echo '{"runtimes":{"nvidia":{"path":"nvidia-container-runtime","runtimeArgs":[]}}}' | tee /etc/docker/daemon.json
systemctl restart docker

# ECS Agent configuration for Model Server
mkdir -p /etc/ecs
echo "ECS_CLUSTER=${cluster_name}" >> /etc/ecs/ecs.config
echo "ECS_ENABLE_GPU_SUPPORT=true" >> /etc/ecs/ecs.config
echo "ECS_AVAILABLE_LOGGING_DRIVERS=[\"json-file\",\"awslogs\"]" >> /etc/ecs/ecs.config
echo "ECS_ENABLE_CONTAINER_METADATA=true" >> /etc/ecs/ecs.config

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Start ECS agent
systemctl start ecs
systemctl enable ecs

# Add ec2-user to docker group
usermod -a -G docker ec2-user

# Create log directory
mkdir -p /var/log/model-server
chown ec2-user:ec2-user /var/log/model-server

# Verify ECS agent is running
sleep 30
systemctl status ecs

echo "Model server ECS initialization completed"