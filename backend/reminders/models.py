from django.db import models
from django.conf import settings

# Create your models here.

class Reminder(models.Model):
    user = models.ForeignKey('users.UserProfile', on_delete=models.CASCADE, related_name='reminders')
    title = models.CharField(max_length=255)
    description = models.TextField()
    time = models.DateTimeField()
    frequency = models.CharField(max_length=50, choices=[
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ])
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title}"
        
from users.models import UserProfile

class Wallpaper(models.Model):
    image = models.ImageField(upload_to='wallpapers/')
    description = models.CharField(max_length=255, default='No description provided')
    uploaded_by = models.ForeignKey(UserProfile, on_delete=models.CASCADE)  # Reference UserProfile
    created_at = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    def __str__(self):
        return f"Wallpaper {self.id} by {self.uploaded_by}"