#!/bin/bash

# ECG Video Pipeline Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-dev}
AWS_REGION=${2:-ap-northeast-2}

echo -e "${GREEN}Starting deployment for ECG Video Pipeline...${NC}"
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "AWS Region: ${YELLOW}$AWS_REGION${NC}"

# Check if required tools are installed
check_requirements() {
    echo -e "${YELLOW}Checking requirements...${NC}"
    
    if ! command -v terraform &> /dev/null; then
        echo -e "${RED}Terraform is not installed. Please install Terraform.${NC}"
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}AWS CLI is not installed. Please install AWS CLI.${NC}"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed. Please install Docker.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}All requirements met.${NC}"
}

# Initialize Terraform
init_terraform() {
    echo -e "${YELLOW}Initializing Terraform...${NC}"
    terraform init
    echo -e "${GREEN}Terraform initialized.${NC}"
}

# Plan Terraform deployment
plan_terraform() {
    echo -e "${YELLOW}Planning Terraform deployment...${NC}"
    terraform plan -var-file="terraform.tfvars" -out=tfplan
    echo -e "${GREEN}Terraform plan completed.${NC}"
}

# Apply Terraform deployment
apply_terraform() {
    echo -e "${YELLOW}Applying Terraform deployment...${NC}"
    terraform apply tfplan
    echo -e "${GREEN}Infrastructure deployed successfully.${NC}"
}

# Build and push API image
build_and_push_api() {
    echo -e "${YELLOW}Building and pushing API image...${NC}"
    
    # Get ECR repository URL
    ECR_REPO=$(terraform output -raw ecr_api_repository_url)
    
    # Login to ECR
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO
    
    # Build and push API image
    cd ../ecg-backend
    docker build -t $ECR_REPO:latest .
    docker push $ECR_REPO:latest
    cd ../ecg-infra
    
    echo -e "${GREEN}API image built and pushed successfully.${NC}"
}

# Deploy frontend to S3
deploy_frontend() {
    echo -e "${YELLOW}Building and deploying frontend...${NC}"
    
    # Get frontend S3 bucket name
    S3_FRONTEND_BUCKET=$(terraform output -raw s3_frontend_bucket)
    
    # Build frontend (Next.js static export)
    cd ../ecg-frontend
    yarn build
    
    # Upload to S3 frontend bucket
    aws s3 sync ./out/ s3://$S3_FRONTEND_BUCKET/ --delete
    
    # Invalidate CloudFront cache
    DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
    aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
    
    cd ../ecg-infra
    echo -e "${GREEN}Frontend deployed successfully.${NC}"
}

# Update ECS service to use new image
update_ecs_service() {
    echo -e "${YELLOW}Updating ECS service...${NC}"
    
    CLUSTER_NAME=$(terraform output -raw ecs_cluster_name)
    SERVICE_NAME=$(terraform output -raw ecs_service_name)
    
    aws ecs update-service --cluster $CLUSTER_NAME --service $SERVICE_NAME --force-new-deployment --region $AWS_REGION
    
    echo -e "${GREEN}ECS service updated.${NC}"
}

# Display deployment information
show_deployment_info() {
    echo -e "\n${GREEN}=== Deployment Information ===${NC}"
    echo -e "CloudFront URL: ${YELLOW}$(terraform output -raw cloudfront_url)${NC}"
    echo -e "API Load Balancer: ${YELLOW}http://$(terraform output -raw alb_dns_name)${NC}"
    echo -e "S3 Bucket: ${YELLOW}$(terraform output -raw s3_video_storage_bucket)${NC}"
    echo -e "ECR Repository: ${YELLOW}$(terraform output -raw ecr_api_repository_url)${NC}"
    echo -e "\n${GREEN}Deployment completed successfully!${NC}"
}

# Main deployment flow
main() {
    check_requirements
    
    # Copy terraform.tfvars from example if it doesn't exist
    if [ ! -f "terraform.tfvars" ]; then
        echo -e "${YELLOW}Creating terraform.tfvars from example...${NC}"
        cp terraform.tfvars.example terraform.tfvars
        echo -e "${RED}Please edit terraform.tfvars with your configuration before continuing.${NC}"
        exit 1
    fi
    
    init_terraform
    plan_terraform
    
    # Ask for confirmation
    read -p "Do you want to apply these changes? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        apply_terraform
        build_and_push_api
        deploy_frontend
        update_ecs_service
        show_deployment_info
    else
        echo -e "${YELLOW}Deployment cancelled.${NC}"
    fi
}

# Run main function
main "$@"