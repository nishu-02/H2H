from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from .models import Reminder, Wallpaper
from .serializers import ReminderSerializer, WallpaperSerializer
from users.models import UserProfile
import firebase_admin
from firebase_admin import auth
from rest_framework.response import Response
from users.authentication import firebase_auth_required
from rest_framework.decorators import api_view
from rest_framework import status
from django.conf import settings
from django.db.models import Count
from rest_framework.views import APIView
import random
import os

from datetime import timedelta
from django.utils import timezone
from .tasks import send_reminder

class ReminderListCreateView(generics.ListCreateAPIView):
    serializer_class = ReminderSerializer

    def get_queryset(self):
        # Get Firebase UID from the Authorization header
        firebase_uid = self.request.headers.get('Authorization')

        if not firebase_uid:
            raise ValidationError({'error': 'Firebase UID is required in the Authorization header'})

        # Filter reminders based on the user's Firebase UID
        try:
            user_profile = UserProfile.objects.get(firebase_uid=firebase_uid)
        except UserProfile.DoesNotExist:
            raise ValidationError({'error': f"User profile not found for UID: {firebase_uid}"})

        return Reminder.objects.filter(user=user_profile)

    def perform_create(self, serializer):
        firebase_uid = self.request.headers.get('Authorization')
        if not firebase_uid:
            raise ValidationError({'error': 'Firebase UID is required in the Authorization header'})

        try:
            user_profile = UserProfile.objects.get(firebase_uid=firebase_uid)
            reminder = serializer.save(user=user_profile)

            # Schedule the task
            send_reminder.apply_async(
                (reminder.id,),
                eta=reminder.time
            )
        except UserProfile.DoesNotExist:
            raise ValidationError({'error': f"User profile not found for UID: {firebase_uid}"})



class ReminderDeleteView(generics.DestroyAPIView):
    serializer_class = ReminderSerializer

    def get_queryset(self):
        # Get Firebase UID from the Authorization header
        firebase_uid = self.request.headers.get('Authorization')
        print(firebase_uid)

        if not firebase_uid:
            raise ValidationError({'error': 'Firebase UID is required in the Authorization header'})

        try:
            user_profile = UserProfile.objects.get(firebase_uid=firebase_uid)
        except UserProfile.DoesNotExist:
            raise ValidationError({'error': f"User profile not found for UID: {firebase_uid}"})

        return Reminder.objects.filter(user=user_profile)

class GetallReminder(generics.ListAPIView):
    serializer_class = ReminderSerializer

    def get_queryset(self):
        # Get Firebase UID from the Authorization header
        firebase_uid = self.request.headers.get('Authorization')
        print(firebase_uid)

        if not firebase_uid:
            raise ValidationError({'error': 'Firebase UID is required in the Authorization header'})

        try:
            user_profile = UserProfile.objects.get(firebase_uid=firebase_uid)
        except UserProfile.DoesNotExist:
            raise ValidationError({'error': f"User profile not found for UID: {firebase_uid}"})

        return Reminder.objects.filter(user=user_profile)


class UploadWallpaper(APIView):
    """Class-based view to upload a new wallpaper"""
    
    @firebase_auth_required
    def post(self, request, *args, **kwargs):
        """Upload a new wallpaper"""
        try:
            # Handle file upload
            if 'image' not in request.FILES:
                return Response({'detail': 'No image file provided.'},
                                status=status.HTTP_400_BAD_REQUEST)
            
            image = request.FILES['image']
            description = request.data.get('description', '')
            user = request.user  # Now we can use request.user directly
            
            wallpaper = Wallpaper.objects.create(
                image=image,
                description=description,
                uploaded_by=user
            )
            
            serializer = WallpaperSerializer(wallpaper)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': f'Error uploading wallpaper: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GetRandomWallpaper(APIView):
    """Fixed implementation that handles missing files"""
    
    @firebase_auth_required
    def get(self, request, *args, **kwargs):
        """Get a random wallpaper with robust file handling"""
        try:
            print("📸 Fetching random wallpaper...")
            
            # Get authenticated user from request
            user = request.user
            print(f"👤 User authenticated: {user}")
            
            # Check if there are any wallpapers
            wallpaper_count = Wallpaper.objects.aggregate(count=Count('id'))['count']
            print(f"📊 Found {wallpaper_count} wallpapers in database")
            
            if wallpaper_count == 0:
                print("❌ No wallpapers found in database")
                return Response(
                    {'error': 'No wallpapers available in the system'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get multiple random wallpapers to try in case some files are missing
            max_attempts = min(5, wallpaper_count)
            valid_wallpaper = None
            
            # Try up to 5 random wallpapers to find one with a valid file
            for attempt in range(max_attempts):
                random_index = random.randint(0, wallpaper_count - 1)
                random_wallpaper = Wallpaper.objects.all()[random_index]
                print(f"🎲 Trying wallpaper #{random_wallpaper.id} (attempt {attempt+1}/{max_attempts})")
                
                # Skip wallpapers with no image field
                if not random_wallpaper.image:
                    print(f"⚠️ Wallpaper #{random_wallpaper.id} has no image field")
                    continue
                
                # Skip wallpapers with missing files
                try:
                    file_exists = os.path.exists(random_wallpaper.image.path)
                    if not file_exists:
                        print(f"⚠️ Wallpaper #{random_wallpaper.id} file not found on disk")
                        continue
                    
                    # We found a valid wallpaper
                    valid_wallpaper = random_wallpaper
                    print(f"✅ Found valid wallpaper #{valid_wallpaper.id}")
                    break
                    
                except Exception as file_error:
                    print(f"⚠️ Error checking file for wallpaper #{random_wallpaper.id}: {str(file_error)}")
                    continue
            
            # If no valid wallpaper was found
            if valid_wallpaper is None:
                print("❌ No valid wallpapers with existing files found")
                return Response(
                    {'error': 'No valid wallpapers with existing files found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Use the valid wallpaper
            try:
                # Generate URL even if the file doesn't exist locally
                image_url = request.build_absolute_uri(valid_wallpaper.image.url)
                
                response_data = {
                    'id': valid_wallpaper.id,
                    'image_url': image_url,
                    'description': valid_wallpaper.description,
                    'file_name': os.path.basename(valid_wallpaper.image.name)
                }
                
                print("✅ Successfully retrieved wallpaper")
                return Response(response_data, status=status.HTTP_200_OK)
                
            except Exception as e:
                print(f"❌ Error preparing response: {str(e)}")
                return Response(
                    {'error': f'Error preparing wallpaper response: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            print(f"❌ Global error: {str(e)}")
            return Response(
                {'error': f'Error retrieving wallpaper: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )