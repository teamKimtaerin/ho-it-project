# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  # Frontend static files origin
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.frontend.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }
  
  # Video storage origin
  origin {
    domain_name              = aws_s3_bucket.video_storage.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.video_storage.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }

  # API origin
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB-Backend"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "${var.project_name} ${var.environment} CloudFront Distribution"
  
  # Custom domain aliases
  aliases = ["ho-it.site", "www.ho-it.site"]

  # Logging configuration
  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.cloudfront_logs.bucket_domain_name
    prefix          = "access-logs/"
  }

  # Default cache behavior for frontend static files
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend.id}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]

      cookies {
        forward = "none"
      }
    }

    # Temporarily removed function association to fix API routing
    # function_association {
    #   event_type   = "viewer-request"
    #   function_arn = aws_cloudfront_function.url_rewrite.arn
    # }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # API cache behavior
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB-Backend"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["*"]

      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # Video streaming cache behavior
  ordered_cache_behavior {
    path_pattern           = "/videos/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.video_storage.id}"
    compress               = false
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]

      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  price_class = "PriceClass_100" # Use only US, Canada and Europe edge locations

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = "arn:aws:acm:us-east-1:084828586938:certificate/ae2eb383-27f0-481c-a0aa-000a27e78049"
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-cloudfront"
    Environment = var.environment
  }
}

# CloudFront Function for request routing
resource "aws_cloudfront_function" "url_rewrite" {
  name    = "${var.project_name}-${var.environment}-url-rewrite"
  runtime = "cloudfront-js-1.0"
  comment = "URL rewrite function for SPA routing"
  publish = true
  code = <<-EOF
function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // Skip rewriting for API paths
    if (uri.startsWith("/api/")) {
        return request;
    }

    // Check whether the URI is missing a file name.
    if (uri.endsWith("/")) {
        request.uri += "index.html";
    }
    // Check whether the URI is missing a file extension.
    else if (!uri.includes(".")) {
        request.uri += "/index.html";
    }

    return request;
}
EOF
}

# Create CloudFront function file
resource "local_file" "cloudfront_function" {
  content = <<-EOT
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Check whether the URI is missing a file name.
    if (uri.endsWith('/')) {
        request.uri += 'index.html';
    }
    // Check whether the URI is missing a file extension.
    else if (!uri.includes('.')) {
        request.uri += '/index.html';
    }
    
    return request;
}
EOT

  filename = "${path.module}/cloudfront_functions/url_rewrite.js"
}

# Create the directory for CloudFront functions
resource "null_resource" "create_cf_function_dir" {
  provisioner "local-exec" {
    command = "mkdir -p ${path.module}/cloudfront_functions"
  }
}