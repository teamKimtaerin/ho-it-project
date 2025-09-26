# ECR Repository for API
resource "aws_ecr_repository" "api" {
  name                 = "${var.project_name}-${var.environment}-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-api"
    Environment = var.environment
  }
}

# ECR Repository for Renderer
resource "aws_ecr_repository" "renderer" {
  name                 = "${var.project_name}-${var.environment}-renderer"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-renderer"
    Environment = var.environment
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}-cluster"

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs_cluster.name
      }
    }
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-cluster"
    Environment = var.environment
  }
}

# CloudWatch Log Group for ECS
resource "aws_cloudwatch_log_group" "ecs_cluster" {
  name              = "/ecs/${var.project_name}-${var.environment}-cluster"
  retention_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-ecs-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${var.project_name}-${var.environment}-api"
  retention_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "renderer" {
  name              = "/ecs/${var.project_name}-${var.environment}-renderer"
  retention_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-renderer-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "model_server" {
  name              = "/ecs/${var.project_name}-${var.environment}-model-server"
  retention_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-model-server-logs"
    Environment = var.environment
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "api" {
  family                   = "${var.project_name}-${var.environment}-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  
  # lifecycle {
  #   ignore_changes = [container_definitions]
  # }

  container_definitions = jsonencode([
    {
      name  = "api"
      image = var.api_container_image
      
      portMappings = [
        {
          containerPort = 8000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "AWS_DEFAULT_REGION"
          value = var.aws_region
        },
        {
          name  = "S3_BUCKET_NAME"
          value = aws_s3_bucket.video_storage.id
        },
        {
          name  = "MODEL_SERVER_URL"
          value = "http://${aws_instance.model_server.public_ip}:8001"
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${aws_db_instance.postgresql.username}:${random_password.db_password.result}@${aws_db_instance.postgresql.endpoint}:${aws_db_instance.postgresql.port}/${aws_db_instance.postgresql.db_name}"
        },
        {
          name  = "DB_HOST"
          value = aws_db_instance.postgresql.endpoint
        },
        {
          name  = "DB_PORT"
          value = tostring(aws_db_instance.postgresql.port)
        },
        {
          name  = "DB_NAME"
          value = aws_db_instance.postgresql.db_name
        },
        {
          name  = "DB_USER"
          value = aws_db_instance.postgresql.username
        },
        {
          name  = "DB_PASSWORD"
          value = random_password.db_password.result
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.api.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command = ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]
        interval = 30
        timeout = 5
        retries = 3
      }
    }
  ])

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-task"
    Environment = var.environment
  }
}

# ECS Task Definition for Renderer
resource "aws_ecs_task_definition" "renderer" {
  family                   = "${var.project_name}-${var.environment}-renderer"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  cpu                      = var.renderer_cpu
  memory                   = var.renderer_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  # lifecycle {
  #   ignore_changes = [container_definitions]
  # }

  container_definitions = jsonencode([
    {
      name  = "renderer"
      image = var.renderer_container_image
      cpu   = var.renderer_cpu
      memory = var.renderer_memory

      portMappings = [
        {
          containerPort = 8002
          hostPort      = 8002
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "AWS_DEFAULT_REGION"
          value = var.aws_region
        },
        {
          name  = "S3_BUCKET_NAME"
          value = aws_s3_bucket.video_storage.id
        },
        {
          name  = "MODEL_SERVER_URL"
          value = "http://${aws_instance.model_server.public_ip}:8001"
        },
        {
          name  = "REDIS_URL"
          value = "redis://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379"
        },
        {
          name  = "REDIS_AUTH_TOKEN"
          value = random_password.redis_auth_token.result
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.renderer.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command = ["CMD-SHELL", "curl -f http://localhost:8002/health || exit 1"]
        interval = 30
        timeout = 5
        retries = 3
      }

      # GPU support for rendering tasks
      resourceRequirements = [
        {
          type  = "GPU"
          value = "1"
        }
      ]
    }
  ])

  tags = {
    Name        = "${var.project_name}-${var.environment}-renderer-task"
    Environment = var.environment
  }
}

# ECS Task Definition for Model Server
resource "aws_ecs_task_definition" "model_server" {
  family                   = "${var.project_name}-${var.environment}-model-server"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  cpu                      = var.model_cpu
  memory                   = var.model_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "model-server"
      image = var.model_container_image
      cpu   = var.model_cpu
      memory = var.model_memory

      portMappings = [
        {
          containerPort = 8001
          hostPort      = 8001
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "AWS_DEFAULT_REGION"
          value = var.aws_region
        },
        {
          name  = "S3_BUCKET_NAME"
          value = aws_s3_bucket.video_storage.id
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.model_server.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command = ["CMD-SHELL", "curl -f http://localhost:8001/health || exit 1"]
        interval = 30
        timeout = 5
        retries = 3
      }

      # GPU support for model inference
      resourceRequirements = [
        {
          type  = "GPU"
          value = "1"
        }
      ]
    }
  ])

  tags = {
    Name        = "${var.project_name}-${var.environment}-model-server-task"
    Environment = var.environment
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.project_name}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = false

  tags = {
    Name        = "${var.project_name}-${var.environment}-alb"
    Environment = var.environment
  }
}

# ALB Target Group
resource "aws_lb_target_group" "api" {
  name        = "${var.project_name}-${var.environment}-api-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-tg"
    Environment = var.environment
  }
}

# ALB Target Group for Renderer
resource "aws_lb_target_group" "renderer" {
  name        = "ecg-${var.environment}-render-tg"
  port        = 8002
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-renderer-tg"
    Environment = var.environment
  }
}

# ALB Listener
resource "aws_lb_listener" "api" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-listener"
    Environment = var.environment
  }
}

# ALB Listener Rule for Renderer
resource "aws_lb_listener_rule" "renderer" {
  listener_arn = aws_lb_listener.api.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.renderer.arn
  }

  condition {
    path_pattern {
      values = ["/render*", "/renderer*"]
    }
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-renderer-rule"
    Environment = var.environment
  }
}

# HTTPS Listener for 443 port
resource "aws_lb_listener" "api_https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.domain_name == null ? aws_acm_certificate.self_signed[0].arn : aws_acm_certificate.main[0].arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-https-listener"
    Environment = var.environment
  }
}

# ALB HTTPS Listener Rule for Renderer
resource "aws_lb_listener_rule" "renderer_https" {
  listener_arn = aws_lb_listener.api_https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.renderer.arn
  }

  condition {
    path_pattern {
      values = ["/render*", "/renderer*"]
    }
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-renderer-https-rule"
    Environment = var.environment
  }
}

# ECS Service
resource "aws_ecs_service" "api" {
  name                   = "${var.project_name}-${var.environment}-api-service"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.api.arn
  desired_count          = 2
  launch_type            = "FARGATE"
  enable_execute_command = true

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8000
  }

  depends_on = [
    aws_lb_listener.api,
    aws_lb_listener.api_https,
    aws_iam_role_policy_attachment.ecs_task_execution_role_policy
  ]

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-service"
    Environment = var.environment
  }
}

# ECS Service for Renderer
resource "aws_ecs_service" "renderer" {
  name                   = "${var.project_name}-${var.environment}-renderer-service"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.renderer.arn
  desired_count          = 1
  launch_type            = "EC2"
  enable_execute_command = true

  placement_constraints {
    type       = "memberOf"
    expression = "ec2InstanceId == '${aws_instance.renderer_server.id}'"
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.renderer.arn
    container_name   = "renderer"
    container_port   = 8002
  }

  depends_on = [
    aws_lb_listener_rule.renderer,
    aws_lb_listener_rule.renderer_https,
    aws_iam_role_policy_attachment.ecs_task_execution_role_policy,
    aws_instance.renderer_server
  ]

  tags = {
    Name        = "${var.project_name}-${var.environment}-renderer-service"
    Environment = var.environment
  }
}

# ECS Service for Model Server
resource "aws_ecs_service" "model_server" {
  name                   = "${var.project_name}-${var.environment}-model-server-service"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.model_server.arn
  desired_count          = 1
  launch_type            = "EC2"
  enable_execute_command = true

  placement_constraints {
    type       = "memberOf"
    expression = "ec2InstanceId == '${aws_instance.model_server.id}'"
  }

  depends_on = [
    aws_iam_role_policy_attachment.ecs_task_execution_role_policy,
    aws_instance.model_server
  ]

  tags = {
    Name        = "${var.project_name}-${var.environment}-model-server-service"
    Environment = var.environment
  }
}