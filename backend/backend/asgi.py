"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

from memory import routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Initialize Django
django_asgi_app = get_asgi_application()

# 🔥 Import middleware AFTER Django has been set up
from .middleware import FirebaseAuthMiddleware

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": FirebaseAuthMiddleware(
        URLRouter(
            routing.websocket_urlpatterns
        )
    ),
})
