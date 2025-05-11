from django.db import models
from users.models import UserProfile

# Create your models here.

def person_directory_path(instance, filename):
    # Generate path like: memory_images/user_id/filename
    return f'memory_images/{instance.user.id}/{filename}'

class Memory(models.Model):
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    person_name = models.CharField(max_length=100) # Name of the person in the memory
    image_path = models.ImageField(upload_to=person_directory_path) # Path to the image
    face_encoding = models.BinaryField(null=True, blank=True) # Face encoding data
    onboarding = models.BooleanField(default=False) # Whether the memory is onboarding
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'person_name') # Ensure unique person name per user
    
    def __str__(self):
        return f"Memory {self.id} - {self.person_name} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"