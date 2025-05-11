import json
import pickle
import base64
import io
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.apps import apps
from asgiref.sync import sync_to_async
from PIL import Image

class FaceRecognitionConsumer(AsyncWebsocketConsumer):
    @database_sync_to_async
    def get_user(self, firebase_uid):
        try:
            UserProfile = apps.get_model('users', 'UserProfile')
            user = UserProfile.objects.filter(firebase_uid=firebase_uid).first()
            
            if user:
                return user
            return None
        except Exception as e:
            print(f"Error in get_user: {str(e)}")
            return None
            
    @database_sync_to_async
    def get_face_recognition_system(self):
        """Get the FaceRecognitionSystem class."""
        try:
            # This approach will import the module containing FaceRecognitionSystem
            app_name = 'memory'  # Replace with your actual app name
            module = __import__(f'{memory}.FT', fromlist=['FaceRecognitionSystem'])
            return getattr(module, 'FaceRecognitionSystem')
        except Exception as e:
            print(f"Error importing FaceRecognitionSystem: {str(e)}")
            return None
    
    @sync_to_async
    def process_face_recognition(self, image_data, user):
        """Process face recognition using the FaceRecognitionSystem."""
        try:
            # Import your FaceRecognitionSystem dynamically
            from django.apps import apps
            app_config = apps.get_app_config('memory')  # Replace with your actual app name
            module = __import__(f"{app_config.name}.FT", fromlist=['FaceRecognitionSystem'])
            FaceRecognitionSystem = getattr(module, 'FaceRecognitionSystem')
            
            # Process the image with FaceRecognitionSystem
            results = FaceRecognitionSystem.identify_faces(user, image_data)
            
            if not results:
                return {
                    "type": "face_detection_result",
                    "message": "No known faces identified",
                    "identified_people": []
                }
            
            # Format the confidence values as strings with percentage
            for result in results:
                result['confidence'] = f"{result['confidence']:.2f}%"
                
            return {
                "type": "face_detection_result",
                "message": "Face identification completed",
                "identified_people": results
            }
            
        except Exception as e:
            print(f"Error in process_face_recognition: {str(e)}")
            return {
                "type": "error",
                "message": f"Error processing image: {str(e)}"
            }

    async def connect(self):
        # Extract token from the query string in URL
        query_params = self.scope['query_string'].decode()
        firebase_uid = None
        
        # Look for token in the query parameters
        for param in query_params.split('&'):
            if param.startswith('token='):
                firebase_uid = param.split('=')[1]
                break

        if not firebase_uid:
            print("No valid Bearer token found in URL query string")
            await self.close(code=4001)
            return
        
        # Retrieve user from the database
        user = await self.get_user(firebase_uid)
        if not user:
            print(f"User not found for UID: {firebase_uid}")
            await self.close(code=4002)
            return

        # Save user for future reference
        self.user = user
        
        # Accept the WebSocket connection
        await self.accept()
        print(f"WebSocket connected successfully. UID: {firebase_uid}")
        
        # Send a response confirming the connection
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': f'Connected as {self.user.name}'
        }))
        
    async def disconnect(self, close_code):
        # Handle disconnect
        print(f"WebSocket disconnected with code: {close_code}")
        
    async def receive(self, text_data=None, bytes_data=None):
        """Handle incoming WebSocket messages."""
        try:
            if text_data:
                data = json.loads(text_data)
                message_type = data.get('type', '')
                
                if message_type == 'ping':
                    await self.send(text_data=json.dumps({
                        'type': 'pong',
                        'timestamp': data.get('timestamp')
                    }))
                elif message_type == 'image':
                    # Handle base64 encoded image from React Native
                    await self.handle_base64_image(data.get('image', ''))
                else:
                    # Unknown message type
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': f'Unknown message type: {message_type}'
                    }))
                    
            elif bytes_data:
                # Handle binary image data (alternative method)
                await self.handle_binary_image(bytes_data)
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Error processing message: {str(e)}'
            }))
    
    async def handle_base64_image(self, base64_image):
        """Process base64 encoded image data for face recognition."""
        try:
            # Skip the data URL prefix if present
            if ',' in base64_image:
                base64_image = base64_image.split(',')[1]
            
            # Convert base64 to binary
            image_bytes = base64.b64decode(base64_image)
            
            # Create an in-memory file-like object
            image_io = io.BytesIO(image_bytes)
            
            # Process the image
            result = await self.process_face_recognition(image_io, self.user)
            
            # Send the result back to the client
            await self.send(text_data=json.dumps(result))
            
        except Exception as e:
            print(f"Error processing base64 image: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Error processing image: {str(e)}'
            }))
    
    async def handle_binary_image(self, image_bytes):
        """Process binary image data for face recognition."""
        try:
            # Create an in-memory file-like object
            image_io = io.BytesIO(image_bytes)
            
            # Process the image
            result = await self.process_face_recognition(image_io, self.user)
            
            # Send the result back to the client
            await self.send(text_data=json.dumps(result))
            
        except Exception as e:
            print(f"Error processing binary image: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Error processing image: {str(e)}'
            }))