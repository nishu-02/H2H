# users/apps.py
from django.apps import AppConfig
import firebase_admin
from firebase_admin import credentials
import os

class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'
    
    def ready(self):
        # This code will be executed when the app is ready
        try:
            # Check if Firebase is already initialized
            firebase_admin.get_app()
            print("Firebase already initialized")
        except ValueError:
            # Firebase not initialized, do it now
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            service_account_path = os.path.join(base_dir, 'users', 'serviceAccountKey.json')
            
            # Check if the service account key exists
            if not os.path.exists(service_account_path):
                print(f"Firebase service account key not found at: {service_account_path}")
                return
                
            # Load the credentials and initialize Firebase Admin SDK
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized successfully")