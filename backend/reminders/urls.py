from django.urls import path
from .views import GetallReminder, ReminderListCreateView, ReminderDeleteView, UploadWallpaper, GetRandomWallpaper
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('create/', ReminderListCreateView.as_view(), name='reminder-list-create'),
    path('reminder/<int:pk>/', ReminderDeleteView.as_view(), name='reminder-delete'),
    path('getall/', GetallReminder.as_view(), name='get-all-reminders'),
   
    # Wallpaper upload endpoint
    path('upload_wallpaper/', UploadWallpaper.as_view(), name='upload_wallpaper'),
    path('random_wallpaper/', GetRandomWallpaper.as_view(), name='random_wallpaper'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)