# Key Pair for EC2 instances
resource "aws_key_pair" "model_server" {
  key_name   = "${var.project_name}-${var.environment}-model-server-key"
  public_key = file("~/.ssh/id_rsa.pub") # Make sure this file exists

  tags = {
    Name        = "${var.project_name}-${var.environment}-model-server-key"
    Environment = var.environment
  }
}

# Get ECS Optimized GPU AMI for Model Server
data "aws_ami" "ecs_optimized_gpu_model" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-ecs-gpu-hvm-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Get ECS Optimized GPU AMI
data "aws_ami" "ecs_optimized_gpu" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-ecs-gpu-hvm-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Launch Template for Model Server
resource "aws_launch_template" "model_server" {
  name_prefix   = "${var.project_name}-${var.environment}-model-server-"
  image_id      = data.aws_ami.ecs_optimized_gpu_model.id
  instance_type = var.model_instance_type
  key_name      = aws_key_pair.model_server.key_name

  iam_instance_profile {
    name = aws_iam_instance_profile.ecs_instance_profile.name
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = 50
      volume_type = "gp3"
      encrypted   = false
    }
  }

  user_data = base64encode(templatefile("${path.module}/user_data/model_server_ecs_init.sh", {
    cluster_name = aws_ecs_cluster.main.name
    aws_region   = var.aws_region
  }))

  tags = {
    Name        = "${var.project_name}-${var.environment}-model-server-template"
    Environment = var.environment
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "${var.project_name}-${var.environment}-model-server-ecs"
      Environment = var.environment
    }
  }
}

# Remove deep learning AMI - using Ubuntu for all instances

# Launch Template for Renderer Server (ECS Optimized GPU AMI)
resource "aws_launch_template" "renderer_server" {
  name_prefix   = "${var.project_name}-${var.environment}-renderer-server-"
  image_id      = data.aws_ami.ecs_optimized_gpu.id
  instance_type = var.model_instance_type
  key_name      = aws_key_pair.model_server.key_name

  iam_instance_profile {
    name = aws_iam_instance_profile.ecs_instance_profile.name
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = 100
      volume_type = "gp3"
      encrypted   = false
    }
  }

  user_data = base64encode(templatefile("${path.module}/user_data/renderer_server_init.sh", {
    cluster_name = aws_ecs_cluster.main.name
    aws_region   = var.aws_region
  }))

  tags = {
    Name        = "${var.project_name}-${var.environment}-renderer-server-template"
    Environment = var.environment
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "${var.project_name}-${var.environment}-renderer-server"
      Environment = var.environment
    }
  }
}

# EC2 Instance for Model Server (ECS)
resource "aws_instance" "model_server" {
  launch_template {
    id      = aws_launch_template.model_server.id
    version = "$Latest"
  }

  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.model_server.id]

  tags = {
    Name        = "${var.project_name}-${var.environment}-model-server-ecs"
    Environment = var.environment
  }
}

# EC2 Instance for Renderer Server
resource "aws_instance" "renderer_server" {
  launch_template {
    id      = aws_launch_template.renderer_server.id
    version = "$Latest"
  }

  subnet_id              = aws_subnet.private[0].id
  private_ip             = "10.0.10.43"
  vpc_security_group_ids = [aws_security_group.renderer_server.id]

  tags = {
    Name        = "${var.project_name}-${var.environment}-renderer-server"
    Environment = var.environment
  }
}