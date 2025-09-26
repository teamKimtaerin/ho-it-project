#!/bin/bash

# Update system
yum update -y

# Install Docker
amazon-linux-extras install docker -y
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install

# Configure AWS CLI with region
mkdir -p /home/ec2-user/.aws
cat > /home/ec2-user/.aws/config << EOF
[default]
region = ${aws_region}
output = json
EOF
chown -R ec2-user:ec2-user /home/ec2-user/.aws

# Install Python dependencies
pip3 install --upgrade pip
pip3 install torch torchvision torchaudio fastapi uvicorn[standard] boto3 python-multipart

# Create model server directory
mkdir -p /opt/model-server
chown ec2-user:ec2-user /opt/model-server

# Create a basic model server script
cat > /opt/model-server/main.py << 'EOF'
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import boto3
import json
import tempfile
import os
from typing import Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ECG Model Server", version="1.0.0")

# Initialize S3 client
s3_client = boto3.client('s3')
S3_BUCKET = "${s3_bucket_name}"

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "model-server"}

@app.post("/process-video")
async def process_video(video_key: str) -> JSONResponse:
    """
    Process video from S3 and return analysis results
    """
    try:
        logger.info(f"Processing video: {video_key}")
        
        # Download video from S3
        with tempfile.NamedTemporaryFile(suffix='.mp4') as temp_file:
            s3_client.download_file(S3_BUCKET, video_key, temp_file.name)
            
            # TODO: Implement your video processing model here
            # For now, return mock results
            mock_result = {
                "video_key": video_key,
                "analysis": {
                    "duration": 30.5,
                    "fps": 30,
                    "resolution": "1920x1080",
                    "features": {
                        "motion_detected": True,
                        "scene_changes": [5.2, 12.8, 25.1],
                        "dominant_colors": ["#FF5733", "#33FF57", "#3357FF"]
                    }
                },
                "subtitles": [
                    {"start": 0.0, "end": 3.0, "text": "Welcome to the video"},
                    {"start": 3.5, "end": 7.0, "text": "This is processed content"},
                    {"start": 7.5, "end": 10.0, "text": "End of demo"}
                ],
                "animations": [
                    {"type": "fade_in", "start": 0.0, "duration": 1.0},
                    {"type": "zoom", "start": 5.0, "duration": 2.0},
                    {"type": "fade_out", "start": 28.0, "duration": 2.5}
                ]
            }
            
            logger.info(f"Video processing completed for: {video_key}")
            return JSONResponse(content=mock_result)
            
    except Exception as e:
        logger.error(f"Error processing video {video_key}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to process video: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
EOF

# Create systemd service for model server
cat > /etc/systemd/system/model-server.service << EOF
[Unit]
Description=ECG Model Server
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/model-server
ExecStart=/usr/bin/python3 /opt/model-server/main.py
Restart=always
RestartSec=5
Environment=PYTHONPATH=/opt/model-server

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl daemon-reload
systemctl enable model-server
systemctl start model-server

# Create log file
touch /var/log/model-server.log
chown ec2-user:ec2-user /var/log/model-server.log

echo "Model server initialization completed" >> /var/log/user-data.log