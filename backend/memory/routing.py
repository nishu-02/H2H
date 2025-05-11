from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/face-recognition/', consumers.FaceRecognitionConsumer.as_asgi()),
]
