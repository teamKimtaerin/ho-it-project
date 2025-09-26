# Create a self-signed certificate for ALB HTTPS (for development)
# In production, you should use a proper domain and ACM certificate

# Request ACM certificate for the ALB DNS name
# Note: This is a workaround for development. In production, use a proper domain.
resource "aws_acm_certificate" "main" {
  count = var.create_certificate ? 1 : 0
  
  # Since we don't have a custom domain, we'll create a certificate for the ALB DNS
  # This requires manual validation or we can use DNS validation with Route53
  domain_name       = var.domain_name != null ? var.domain_name : "*.elb.amazonaws.com"
  validation_method = "DNS"

  subject_alternative_names = var.domain_name != null ? [] : ["*.us-east-1.elb.amazonaws.com"]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-cert"
    Environment = var.environment
  }
}

# For development purposes, we'll create a self-signed certificate
# This is not recommended for production
resource "tls_private_key" "main" {
  count     = var.domain_name == null ? 1 : 0
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_self_signed_cert" "main" {
  count           = var.domain_name == null ? 1 : 0
  private_key_pem = tls_private_key.main[0].private_key_pem

  subject {
    common_name         = "*.elb.amazonaws.com"
    organization        = "ECG Development"
    organizational_unit = "Development"
  }

  validity_period_hours = 8760 # 1 year

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
  ]

  dns_names = [
    "*.elb.amazonaws.com",
    "*.us-east-1.elb.amazonaws.com"
  ]
}

# Import self-signed certificate to ACM for development
resource "aws_acm_certificate" "self_signed" {
  count = var.domain_name == null ? 1 : 0
  
  certificate_body = tls_self_signed_cert.main[0].cert_pem
  private_key      = tls_private_key.main[0].private_key_pem

  tags = {
    Name        = "${var.project_name}-${var.environment}-self-signed-cert"
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}