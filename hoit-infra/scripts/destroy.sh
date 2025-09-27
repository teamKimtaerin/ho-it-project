#!/bin/bash

# ECG Video Pipeline Destroy Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}ECG Video Pipeline Infrastructure Destruction${NC}"
echo -e "${RED}WARNING: This will destroy ALL infrastructure resources!${NC}"

# Confirmation
read -p "Are you absolutely sure you want to destroy all resources? Type 'destroy' to confirm: " -r
if [[ $REPLY != "destroy" ]]; then
    echo -e "${YELLOW}Destruction cancelled.${NC}"
    exit 0
fi

# Empty S3 buckets first (required before destruction)
echo -e "${YELLOW}Emptying S3 buckets...${NC}"

# Get bucket names from terraform output
VIDEO_BUCKET=$(terraform output -raw s3_video_storage_bucket 2>/dev/null || echo "")
LOGS_BUCKET=$(terraform output -raw s3_video_storage_bucket 2>/dev/null || echo "")

if [ ! -z "$VIDEO_BUCKET" ]; then
    aws s3 rm s3://$VIDEO_BUCKET --recursive
    echo -e "${GREEN}Video storage bucket emptied.${NC}"
fi

# Destroy infrastructure
echo -e "${YELLOW}Destroying Terraform infrastructure...${NC}"
terraform destroy -var-file="terraform.tfvars" -auto-approve

echo -e "${GREEN}All resources have been destroyed.${NC}"