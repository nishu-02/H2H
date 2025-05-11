from django.db import models
from django.conf import settings
from users.models import UserProfile

def user_audio_path(instance, filename):
    # Generate path like: audio_files/user_id/filename
    return f'audio_files/{instance.user.id}/{filename}'

class AudioMemory(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    audio_file = models.FileField(upload_to=user_audio_path)
    transcription = models.TextField(blank=True, null=True)
    score = models.FloatField(null=True, blank=True)  # Sentiment score
    timestamp = models.DateTimeField(auto_now_add=True)

    # NEW FIELDS BELOW
    sentiment_label = models.CharField(max_length=50, blank=True, null=True)
    memory_references = models.TextField(blank=True, null=True)
    routine_references = models.TextField(blank=True, null=True)
    time_indicators = models.TextField(blank=True, null=True)
    location_indicators = models.TextField(blank=True, null=True)
    severity_indicators = models.TextField(blank=True, null=True)  
    potential_concerns = models.TextField(blank=True, null=True)
   
    # Processing status
    processing_complete = models.BooleanField(default=False)
    processing_error = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Audio Memory {self.id} - {self.timestamp.strftime('%Y-%m-%d %H:%M')}"