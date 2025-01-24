import os

# Create static directory if it doesn't exist
static_dir = os.path.join(os.path.dirname(__file__), 'static')
os.makedirs(static_dir, exist_ok=True)
print(f"Created static directory at {static_dir}")
