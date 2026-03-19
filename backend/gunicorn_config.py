import os

# Gunicorn configuration
bind = f"0.0.0.0:{os.environ.get('PORT', '5000')}"
workers = 1  # Keep to 1 for memory-heavy ML models on free tier
timeout = 120  # Allow extra time for the first model load (warm-up)
keepalive = 2
log_level = 'info'
accesslog = '-'
errorlog = '-'
