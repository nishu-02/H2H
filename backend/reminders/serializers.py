from rest_framework import serializers
from .models import Reminder, Wallpaper

class ReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reminder
        fields = ['id', 'title', 'description', 'time', 'frequency', 'created_at']
        read_only_fields = ['user']  # User will be set in perform_create

class WallpaperSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wallpaper
        fields = ['id', 'image', 'description', 'uploaded_by', 'created_at']