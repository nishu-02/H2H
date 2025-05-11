from django.shortcuts import get_object_or_404
from .models import AudioMemory
from users.models import UserProfile
from .serializers import AudioMemorySerializer, AudioMemoryJSONSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from users.authentication import firebase_auth_required
from .audio_processing import transcribe_audio, analyze_text_comprehensive
import os
import logging
import time
import threading
import datetime
import traceback

# Set up logging
logger = logging.getLogger(__name__)

def process_audio_in_background(audio_memory_id):
    """
    Process audio file in background thread
    """
    from .models import AudioMemory  # Import here to avoid circular imports
    
    try:
        # Get the audio memory object
        audio_memory = AudioMemory.objects.get(id=audio_memory_id)
        
        print("\n" + "="*50)
        print(f"🎵 STARTING BACKGROUND PROCESSING FOR AUDIO #{audio_memory_id} 🎵")
        print("="*50)
        
        # File path info
        audio_path = audio_memory.audio_file.path
        print(f"📁 Audio file path: {audio_path}")
        
        # Verify file exists and is readable
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file does not exist at {audio_path}")
            
        if not os.access(audio_path, os.R_OK):
            raise PermissionError(f"Cannot read audio file at {audio_path}")
            
        # Check file size
        file_size = os.path.getsize(audio_path)
        print(f"📊 File size: {file_size / 1024 / 1024:.2f} MB")
        
        if file_size == 0:
            raise ValueError("Audio file is empty (0 bytes)")
            
        # Transcription begins
        print("\n" + "-"*40)
        print("🎤 STARTING TRANSCRIPTION PROCESS...")
        print("-"*40)
        start_time = time.time()
        
        try:
            text = transcribe_audio(audio_path)
            
            if not text or text.strip() == "":
                print("⚠️ Warning: Transcription returned empty text")
                text = "[No speech detected]"
                
            transcription_time = time.time() - start_time
            print(f"⏱️ Transcription completed in {transcription_time:.2f} seconds")
            print(f"📝 Transcription result:\n{text}")
            
            # Store the transcription
            audio_memory.transcription = text
            print("💾 Transcription saved to model")
            
        except Exception as e:
            error_msg = f"Transcription failed: {str(e)}"
            print(f"❌ {error_msg}")
            print(f"❌ Traceback: {traceback.format_exc()}")
            
            # Save error but continue with analysis if we can
            audio_memory.processing_error = error_msg
            audio_memory.save()
            
            # If we can't continue, re-raise
            if not text:
                raise
        
        # Comprehensive analysis begins
        print("\n" + "-"*40)
        print("🔍 STARTING COMPREHENSIVE TEXT ANALYSIS...")
        print("-"*40)
        start_time = time.time()
        
        try:
            # Get comprehensive analysis
            analysis_results = analyze_text_comprehensive(text)
            
            analysis_time = time.time() - start_time
            print(f"⏱️ Analysis completed in {analysis_time:.2f} seconds")
            
            # Store all analysis results
            audio_memory.score = round(analysis_results['sentiment_score'], 4)
            audio_memory.sentiment_label = analysis_results['sentiment_label']
            audio_memory.memory_references = analysis_results['memory_references']
            audio_memory.routine_references = analysis_results['routine_references']
            audio_memory.time_indicators = analysis_results['time_indicators']
            audio_memory.location_indicators = analysis_results['location_indicators']
            audio_memory.severity_indicators = analysis_results['severity_indicators']
            audio_memory.potential_concerns = analysis_results['potential_concerns']
            
            # Print analysis results
            print(f"📊 Sentiment score: {audio_memory.score}")
            print(f"🏷️ Sentiment label: {audio_memory.sentiment_label}")
            print(f"🧠 Memory references: {audio_memory.memory_references}")
            print(f"⏰ Routine references: {audio_memory.routine_references}")
            print(f"📅 Time indicators: {audio_memory.time_indicators}")
            print(f"📍 Location indicators: {audio_memory.location_indicators}")
            print(f"⚠️ Severity indicators: {audio_memory.severity_indicators}")
            print(f"🚨 Potential concerns: {audio_memory.potential_concerns}")
            
        except Exception as e:
            error_msg = f"Analysis failed: {str(e)}"
            print(f"❌ {error_msg}")
            print(f"❌ Traceback: {traceback.format_exc()}")
            
            # If there's already an error, append to it
            if audio_memory.processing_error:
                audio_memory.processing_error += f"; {error_msg}"
            else:
                audio_memory.processing_error = error_msg
        
        # Update processing status - mark as complete even if we had partial errors
        audio_memory.processing_complete = True
        
        # Save changes
        print("💾 Saving final data to database...")
        audio_memory.save()
        
        print("\n" + "="*50)
        print(f"✅ AUDIO #{audio_memory_id} PROCESSED SUCCESSFULLY ✅")
        print("="*50 + "\n")
        
    except Exception as e:
        print(f"❌ ERROR PROCESSING AUDIO #{audio_memory_id}: {str(e)}")
        print(f"❌ Error type: {type(e).__name__}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        
        # Try to update the status in the database
        try:
            audio_memory = AudioMemory.objects.get(id=audio_memory_id)
            audio_memory.processing_error = f"{type(e).__name__}: {str(e)}"
            audio_memory.processing_complete = True  # Mark as complete even with error
            audio_memory.save()
            print("💾 Error status saved to database")
        except Exception as db_error:
            print(f"❌ Could not update error status in database: {str(db_error)}")


class AudioMemoryListCreateView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    @firebase_auth_required
    def post(self, request, *args, **kwargs):
        # Clear visual separators in console for easy tracking
        print("\n" + "="*50)
        print("🎵 RECEIVING AUDIO MEMORY REQUEST 🎵")
        print("="*50)
        
        # Debug information
        print(f"📝 Request received at: {time.strftime('%H:%M:%S')}")
        print(f"📝 Content-Type: {request.headers.get('Content-Type')}")
        
        # For testing only - remove in production
        user = request.user
        print(f"👤 Processing for user: {user}")
        
        if 'audio_file' not in request.FILES:
            print("❌ ERROR: No audio_file in request")
            return Response({"error": "No audio file provided"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Basic validation of audio file
        audio_file = request.FILES['audio_file']
        
        # Check file size
        if audio_file.size == 0:
            return Response({"error": "Audio file is empty"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Check file type (basic check, more thorough validation could be added)
        content_type = audio_file.content_type
        valid_types = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 
                       'audio/webm', 'audio/ogg', 'audio/flac', 'audio/x-flac']
                       
        if content_type not in valid_types:
            print(f"⚠️ Warning: Unexpected content type: {content_type}")
        
        print("🔍 Validating request data...")
        serializer = AudioMemorySerializer(data=request.data)
        if serializer.is_valid():
            print("✅ Serializer is valid")
            print("💾 Saving audio file to database...")
            
            try:
                # Set initial processing status
                audio_memory = serializer.save(user=user, processing_complete=False)
                
                # Start background processing
                print(f"🚀 Starting background processing for audio #{audio_memory.id}")
                processing_thread = threading.Thread(
                    target=process_audio_in_background,
                    args=(audio_memory.id,)
                )
                processing_thread.daemon = True
                processing_thread.start()
                
                # Return immediately with the created object
                print(f"✅ Audio file accepted, processing in background")
                return Response({
                    "id": audio_memory.id,
                    "message": "Audio file accepted and processing has started",
                    "status": "processing"
                }, status=status.HTTP_202_ACCEPTED)
                
            except Exception as e:
                print(f"❌ Error initiating processing: {str(e)}")
                return Response({
                    "error": "Failed to process audio file",
                    "details": str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        else:
            print(f"❌ Serializer errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @firebase_auth_required
    def get(self, request, *args, **kwargs):
        user = request.user
        queryset = AudioMemory.objects.filter(user=user)
        serializer = AudioMemorySerializer(queryset, many=True)
        return Response(serializer.data)


class AudioMemoryDetailView(APIView):
    @firebase_auth_required
    def get(self, request, pk, *args, **kwargs):
        user = request.user
        audio_memory = get_object_or_404(AudioMemory, id=pk, user=user)
        serializer = AudioMemorySerializer(audio_memory)
        return Response(serializer.data)

    @firebase_auth_required
    def delete(self, request, pk, *args, **kwargs):
        user = request.user
        audio_memory = get_object_or_404(AudioMemory, id=pk, user=user)
        
        # Delete the file from storage
        if audio_memory.audio_file:
            if os.path.isfile(audio_memory.audio_file.path):
                try:
                    os.remove(audio_memory.audio_file.path)
                except Exception as e:
                    print(f"⚠️ Warning: Could not delete file: {str(e)}")
        
        # Delete the record
        audio_memory.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AudioMemoryExportView(APIView):
    @firebase_auth_required
    def get(self, request, *args, **kwargs):
        """Export audio memory data as CSV"""
        import csv
        from django.http import HttpResponse
        
        user = request.user


        print(f"🔍 Exporting data for user: {user}")
        queryset = AudioMemory.objects.filter(user=user)
        print(f"📊 Found {queryset.count()} audio memories to export")
        
        # Create the HttpResponse object with CSV header
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="audio_memories_{datetime.date.today()}.csv"'
        
        # Create CSV writer
        writer = csv.writer(response)
        
        # Write header
        writer.writerow([
            'timestamp', 'input_text', 'sentiment_score', 'sentiment_label',
            'memory_references', 'routine_references', 'time_indicators',
            'location_indicators', 'severity_indicators', 'potential_concerns'
        ])
        
        # Write data rows with better error handling
        for memory in queryset:
            try:
                writer.writerow([
                    memory.timestamp.strftime("%Y-%m-%d %H:%M:%S") if memory.timestamp else '',
                    memory.transcription or '',
                    memory.score if memory.score is not None else '',
                    memory.sentiment_label or '',
                    memory.memory_references or '',
                    memory.routine_references or '',
                    memory.time_indicators or '',
                    memory.location_indicators or '',
                    memory.severity_indicators or '',
                    memory.potential_concerns or ''
                ])
            except Exception as e:
                print(f"❌ Error exporting memory {memory.id}: {str(e)}")
        
        print(f"✅ CSV export completed with {queryset.count()} records")
        return response

class AudioMemoryJSONExportView(APIView):
    @firebase_auth_required  # Uncomment when ready for production
    def get(self, request, *args, **kwargs):
        """Export audio memory data as JSON"""
        
        # For testing, use the first user
        # user = UserProfile.objects.first()  # Replace with request.user in production
        user = request.user

        
        print(f"🔍 Exporting JSON data for user: {user}")
        queryset = AudioMemory.objects.filter(user=user)
        print(f"📊 Found {queryset.count()} audio memories to export")
        
        try:
            # Use the JSON serializer
            serializer = AudioMemoryJSONSerializer(queryset, many=True)
            
            response_data = {
                "count": queryset.count(),
                "export_date": datetime.date.today().isoformat(),
                "memories": serializer.data
            }
            
            print(f"✅ JSON export completed with {queryset.count()} records")
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"❌ Error during JSON export: {str(e)}")
            return Response(
                {"error": "Failed to export data", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
