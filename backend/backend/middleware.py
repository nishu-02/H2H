from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from firebase_admin import auth

class FirebaseAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        firebase_uid = None
        
        # Extract the Firebase UID from the Authorization header
        authorization_header = dict(scope.get('headers', [])).get(b'authorization', None)
        if authorization_header:
            firebase_uid = authorization_header.decode().split(' ')[-1]
        
        if firebase_uid:
            print(f"UID extracted: {firebase_uid}")
            scope['user'] = await self.get_user_from_uid(firebase_uid)
        else:
            print("No UID found in Authorization header")
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def get_user_from_uid(self, uid):
        from users.models import UserProfile

        try:
            return UserProfile.objects.get(firebase_uid=uid)
        except UserProfile.DoesNotExist:
            return AnonymousUser()
