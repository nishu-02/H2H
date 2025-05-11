from django.urls import path
from .views import RegisterFace, IdentifyFaces, ListRegisteredFaces, DeleteFace, BulkRegisterFaces

urlpatterns = [
    path("register-face/", RegisterFace.as_view(), name="register-face"),
    path("bulk-register-faces/", BulkRegisterFaces.as_view(), name="bulk-register-faces"),
    path("identify-faces/", IdentifyFaces.as_view(), name="identify-faces"),
    path("list-faces/", ListRegisteredFaces.as_view(), name="list-faces"),
    path("delete-face/<str:person_name>/", DeleteFace.as_view(), name="delete-face"),
]