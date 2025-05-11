import firebase_admin
from firebase_admin import credentials
import os

# Determine the base directory of the project
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Path to the service account key
service_account_path = os.path.join(base_dir, 'users', 'serviceAccountKey.json')

# Check if the service account key exists
if not os.path.exists(service_account_path):
    raise FileNotFoundError(f"Firebase service account key not found at: {service_account_path}")

# Load the credentials and initialize Firebase Admin SDK
cred = credentials.Certificate(service_account_path)

# Initialize the Firebase Admin SDK
firebase_admin.initialize_app(cred)

print("Firebase Admin SDK initialized successfully")
