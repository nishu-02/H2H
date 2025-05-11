from rest_framework import serializers
from .models import AudioMemory

class AudioMemorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AudioMemory
        fields = [
            'id', 'user', 'audio_file', 'timestamp', 'transcription', 'score', 
            'sentiment_label', 'memory_references', 'routine_references',
            'time_indicators', 'location_indicators', 'severity_indicators',
            'potential_concerns', 'processing_complete', 'processing_error'
        ]
        read_only_fields = [
            'id', 'timestamp', 'transcription', 'score', 
            'sentiment_label', 'memory_references', 'routine_references',
            'time_indicators', 'location_indicators', 'severity_indicators',
            'potential_concerns', 'processing_complete', 'processing_error',
            'user'
        ]

class AudioMemoryJSONSerializer(serializers.ModelSerializer):
    class Meta:
        model = AudioMemory
        fields = [
            'id', 'user', 'audio_file', 'timestamp', 'transcription', 'score',
            'sentiment_label', 'memory_references', 'routine_references',
            'time_indicators', 'location_indicators', 'severity_indicators',
            'potential_concerns', 'processing_complete', 'processing_error'
        ]
        read_only_fields = [
            'id', 'timestamp', 'transcription', 'score',
            'sentiment_label', 'memory_references', 'routine_references',
            'time_indicators', 'location_indicators', 'severity_indicators',
            'potential_concerns', 'processing_complete', 'processing_error',
            'user'
        ]

    def to_representation(self, instance):
        """
        Convert model instance to JSON format
        """
        data = super().to_representation(instance)
        
        # Convert list-like strings to actual lists
        list_fields = ['memory_references', 'routine_references', 
                      'time_indicators', 'location_indicators', 
                      'severity_indicators', 'potential_concerns']
        
        for field in list_fields:
            if data.get(field):
                # Convert string representation of list to actual list
                if isinstance(data[field], str):
                    try:
                        import ast
                        data[field] = ast.literal_eval(data[field])
                    except:
                        data[field] = []
                        
        return data
