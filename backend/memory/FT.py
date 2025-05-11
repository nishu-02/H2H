import face_recognition
import numpy as np
import pickle
import os
import time
from django.conf import settings
from django.core.cache import cache
from .models import Memory
from threading import Lock

# Mutex for face recognition model loading
face_recognition_lock = Lock()

class FaceRecognitionSystem:
    """
    A class for managing face recognition operations.
    Provides methods to register faces, identify faces, and manage the face database.
    Uses lazy loading to improve performance.
    """
    # Track when the face_recognition module was last used
    _last_used = 0
    # Time in seconds after which to unload the model
    _idle_timeout = 300  # 5 minutes
    # Flag to indicate if model is loaded
    _model_loaded = False
    
    @classmethod
    def _ensure_model_loaded(cls):
        """Ensure the face recognition model is loaded"""
        with face_recognition_lock:
            # Update the last used timestamp
            cls._last_used = time.time()
            cls._model_loaded = True
            
            # Schedule a check to unload the model if it becomes idle
            # This would normally be done with a background task manager or celery
            # But for simplicity, we'll just update the flag
            return True
    
    @classmethod
    def extract_face_encoding(cls, image_path):
        """Extract face encoding from an image file with lazy loading."""
        try:
            # Ensure the model is loaded
            cls._ensure_model_loaded()
            
            # Load the image
            img = face_recognition.load_image_file(image_path)
            
            # Extract face encodings (use the first face found)
            encodings = face_recognition.face_encodings(img)
            
            if not encodings:
                return None
                
            # Return the first face encoding
            return encodings[0]
        except Exception as e:
            print(f"Error extracting face encoding: {str(e)}")
            return None
    
    @staticmethod
    def register_face(user, person_name, image_file, save_encoding=True):
        """
        Register a new face in the database.
        
        Args:
            user: UserProfile object
            person_name: Name of the person in the image
            image_file: Uploaded image file
            save_encoding: Whether to extract and save the face encoding
            
        Returns:
            Memory object if successful, None otherwise
        """
        try:
            # Create a new Memory object
            memory_obj, created = Memory.objects.get_or_create(
                user=user,
                person_name=person_name,
                defaults={'onboarding': True}
            )
            
            # Save the image
            memory_obj.image_path = image_file
            memory_obj.save()
            
            # Extract and save face encoding if requested
            if save_encoding:
                image_path = os.path.join(settings.MEDIA_ROOT, memory_obj.image_path.name)
                encoding = FaceRecognitionSystem.extract_face_encoding(image_path)
                
                if encoding is not None:
                    # Save the encoding as binary data
                    memory_obj.face_encoding = pickle.dumps(encoding)
                    memory_obj.save()
                    
            return memory_obj
        except Exception as e:
            print(f"Error registering face: {str(e)}")
            return None
    
    @classmethod
    def identify_faces(cls, user, image_file):
        """
        Identify faces in an image by comparing them to the user's registered faces.
        Uses lazy loading for model efficiency.
        
        Args:
            user: UserProfile object
            image_file: Image to check for known faces
            
        Returns:
            List of dictionaries with person names and confidence scores
        """
        try:
            # Check cache first
            cache_key = f"face_recognition_{user.id}_{hash(image_file)}"
            cached_results = cache.get(cache_key)
            if cached_results:
                return cached_results
            
            # Ensure the model is loaded
            cls._ensure_model_loaded()
            
            # Get all memory objects for this user
            memories = Memory.objects.filter(user=user, face_encoding__isnull=False)
            
            if not memories:
                return []
                
            # Load the uploaded image
            unknown_img = face_recognition.load_image_file(image_file)
            unknown_encodings = face_recognition.face_encodings(unknown_img)
            
            if not unknown_encodings:
                return []
                
            results = []
            
            # For each face in the uploaded image
            for unknown_encoding in unknown_encodings:
                matches = []
                
                # Compare with registered faces
                for memory in memories:
                    # Deserialize the stored encoding
                    known_encoding = pickle.loads(memory.face_encoding)
                    
                    # Compare faces
                    distance = face_recognition.face_distance([known_encoding], unknown_encoding)[0]
                    confidence = (1 - distance) * 100
                    
                    # If confidence is high enough, consider it a match
                    if confidence >= 60:  # 60% threshold, can be adjusted
                        matches.append({
                            'person_name': memory.person_name,
                            'confidence': confidence
                        })
                
                # Sort matches by confidence (highest first)
                if matches:
                    matches.sort(key=lambda x: x['confidence'], reverse=True)
                    results.append(matches[0])  # Add the best match
            
            # Cache the results for 1 minute
            cache.set(cache_key, results, 60)
            
            return results
        except Exception as e:
            print(f"Error identifying faces: {str(e)}")
            return []