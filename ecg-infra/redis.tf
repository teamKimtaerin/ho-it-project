# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.project_name}-${var.environment}-redis-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name        = "${var.project_name}-${var.environment}-redis-subnet-group"
    Environment = var.environment
  }
}

# ElastiCache Redis Cluster
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id         = "${var.project_name}-${var.environment}-redis"
  description                  = "Redis cluster for ${var.project_name} ${var.environment}"

  port                         = 6379
  parameter_group_name         = "default.redis7"
  node_type                    = var.redis_node_type
  num_cache_clusters           = var.redis_num_cache_nodes

  engine_version               = "7.0"

  subnet_group_name            = aws_elasticache_subnet_group.redis.name
  security_group_ids           = [aws_security_group.redis.id]

  # Production security features
  at_rest_encryption_enabled   = true
  transit_encryption_enabled   = true
  auth_token                   = random_password.redis_auth_token.result

  # High Availability
  automatic_failover_enabled   = var.redis_num_cache_nodes > 1 ? true : false
  multi_az_enabled            = var.redis_num_cache_nodes > 1 ? true : false

  # Backup and maintenance
  snapshot_retention_limit     = 5
  snapshot_window             = "03:00-05:00"
  maintenance_window          = "sun:05:00-sun:07:00"

  # Monitoring
  notification_topic_arn      = aws_sns_topic.redis_notifications.arn

  apply_immediately           = true

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }

  depends_on = [
    aws_elasticache_subnet_group.redis,
    aws_security_group.redis,
    random_password.redis_auth_token
  ]

  tags = {
    Name        = "${var.project_name}-${var.environment}-redis"
    Environment = var.environment
  }
}

# Redis Auth Token
resource "random_password" "redis_auth_token" {
  length  = 32
  special = false
  upper   = true
  lower   = true
  numeric = true
}

# CloudWatch Log Group for Redis
resource "aws_cloudwatch_log_group" "redis_slow" {
  name              = "/aws/elasticache/redis/${var.project_name}-${var.environment}"
  retention_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-redis-logs"
    Environment = var.environment
  }
}

# SNS Topic for Redis notifications
resource "aws_sns_topic" "redis_notifications" {
  name = "${var.project_name}-${var.environment}-redis-notifications"

  tags = {
    Name        = "${var.project_name}-${var.environment}-redis-notifications"
    Environment = var.environment
  }
}

