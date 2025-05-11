from functools import wraps
from rest_framework.response import Response
from firebase_admin import auth
from .models import UserProfile

def firebase_auth_required(view_func):
    @wraps(view_func)
    def _wrapped_view(view_instance, request, *args, **kwargs):
        firebase_uid = request.META.get('HTTP_AUTHORIZATION')

        if not firebase_uid:
            return Response({"error": "Firebase UID is required"}, status=400)

        try:
            firebase_user = auth.get_user(firebase_uid)
            user = UserProfile.objects.filter(firebase_uid=firebase_uid).first()

            if not user:
                return Response({"error": "User not registered"}, status=401)

            request.user = user
            return view_func(view_instance, request, *args, **kwargs)

        except auth.UserNotFoundError:
            return Response({"error": "Invalid Firebase UID"}, status=400)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
    return _wrapped_view