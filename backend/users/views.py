from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import UserProfile
from .serializers import UserRegisterSerializer, UserProfileSerializer
from django.shortcuts import get_object_or_404
from firebase_admin import auth
from .authentication import firebase_auth_required    

class RegisterView(APIView):
    def post(self, request):
        firebase_uid = request.data.get('firebase_uid')
        if not firebase_uid:
            return Response({"error": "Firebase UID is required"}, status=400)

        try:
            # Verifying UID is valid
            firebase_user = auth.get_user(firebase_uid)
            email = firebase_user.email
            
            # Check if user exists by either UID or email
            user_by_uid = UserProfile.objects.filter(firebase_uid=firebase_uid).exists()
            user_by_email = UserProfile.objects.filter(email=email).exists()
            
            if user_by_uid:
                return Response({"error": "User already exists with this Firebase UID"}, status=400)
            
            if user_by_email:
                # Update the existing user's Firebase UID
                user = UserProfile.objects.get(email=email)
                user.firebase_uid = firebase_uid
                user.save()
                return Response({
                    "message": "User profile updated with new Firebase UID",
                    "data": UserRegisterSerializer(user).data
                }, status=status.HTTP_200_OK)
                
            # Create new user
            serializer = UserRegisterSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "message": "User registered successfully",
                    "data": serializer.data
                }, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except auth.UserNotFoundError:
            return Response({"error": "Invalid Firebase UID"}, status=400)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

class ProfileView(APIView):
    @firebase_auth_required  # Apply the decorator to the view
    def get(self, request):
        # Access user from request.user (which was set in the decorator)
        user_profile = request.user  # This is the UserProfile instance attached in the decorator
        serializer = UserProfileSerializer(user_profile)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UpdateProfileView(APIView):
    @firebase_auth_required
    def patch(self, request):
        # Updating the profile for the authenticated user
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    "message": "The profile data is updated successfully",
                    "data": serializer.data
                },
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
