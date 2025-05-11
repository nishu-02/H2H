import os
import re
import nltk
import time
from functools import lru_cache
from nltk.sentiment import SentimentIntensityAnalyzer
from transformers import pipeline, AutoTokenizer, logging

# Suppress warnings
logging.set_verbosity_error()

# Global variables to store models
_whisper_model = None
_vader_analyzer = None
_distilbert_analyzer = None
_tokenizer = None

# NLTK setup - only download data when needed
def setup_nltk():
    try:
        nltk.download('vader_lexicon', quiet=True)
        nltk.download('punkt', quiet=True)
    except Exception as e:
        print(f"Warning: Failed to download NLTK resources: {e}")

# Lazy loading functions for models
def get_vader_analyzer():
    global _vader_analyzer
    if _vader_analyzer is None:
        print("🔧 Initializing VADER sentiment analyzer...")
        setup_nltk()
        _vader_analyzer = SentimentIntensityAnalyzer()
        print("✅ VADER analyzer initialized")
    return _vader_analyzer

def get_distilbert():
    global _distilbert_analyzer, _tokenizer
    if _distilbert_analyzer is None:
        print("🔧 Initializing DistilBERT model...")
        start_time = time.time()
        _distilbert_analyzer = pipeline(
            "sentiment-analysis",
            model="distilbert/distilbert-base-uncased-finetuned-sst-2-english"
        )
        _tokenizer = AutoTokenizer.from_pretrained("distilbert/distilbert-base-uncased-finetuned-sst-2-english")
        load_time = time.time() - start_time
        print(f"✅ DistilBERT model initialized in {load_time:.2f} seconds")
    return _distilbert_analyzer, _tokenizer

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        print(f"🎤 Loading WhisperModel for transcription...")
        start_loading = time.time()
        
        # Try both implementations with clear error handling
        whisper_impl = None
        error_messages = []
        
        # First try faster_whisper
        try:
            # Import here to avoid loading at startup
            from faster_whisper import WhisperModel
            whisper_impl = "faster_whisper"
            _whisper_model = WhisperModel("small", device="cpu", compute_type="int8")
            load_time = time.time() - start_loading
            print(f"✅ faster-whisper model loaded in {load_time:.2f} seconds")
        except Exception as e:
            error_messages.append(f"faster-whisper error: {str(e)}")
            
        # If that failed, try regular whisper
        if _whisper_model is None:
            try:
                import whisper
                whisper_impl = "whisper"
                _whisper_model = whisper.load_model("base")
                load_time = time.time() - start_loading
                print(f"✅ Regular whisper model loaded in {load_time:.2f} seconds")
            except Exception as e:
                error_messages.append(f"regular whisper error: {str(e)}")
        
        # If both failed, raise an error with details
        if _whisper_model is None:
            error_details = "\n".join(error_messages)
            print(f"❌ Failed to load any whisper implementation:\n{error_details}")
            raise ImportError(f"No whisper implementation available:\n{error_details}")
            
        # Store the implementation type
        if _whisper_model is not None:
            _whisper_model._whisper_impl = whisper_impl
            
    return _whisper_model

# Transcribe audio using Faster-Whisper or regular Whisper
def transcribe_audio(file_path):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Audio file not found: {file_path}")
        
    print(f"🎤 Starting transcription for: {os.path.basename(file_path)}")
    print(f"🎤 File size: {os.path.getsize(file_path)/1024/1024:.2f} MB")
    
    # Lazy load the model
    model = get_whisper_model()
    
    transcribe_start = time.time()
    text = ""
    
    try:
        # Determine which whisper implementation we're using by checking module name
        model_type = type(model).__module__
        print(f"🎤 Using model type: {model_type}")
        
        if 'whisper' in model_type and 'faster_whisper' not in model_type:
            # Regular whisper
            print("🎤 Using regular whisper transcription")
            result = model.transcribe(file_path)
            text = result["text"]
        else:
            # Faster whisper
            print("🎤 Using faster-whisper transcription")
            segments, _ = model.transcribe(file_path, beam_size=5)
            
            print("🎤 Processing segments...")
            text_segments = []
            for i, seg in enumerate(segments):
                text_segments.append(seg.text)
                if i < 3:  # Print first few segments to show progress
                    print(f"🎤 Segment {i+1}: {seg.text}")
            
            if len(text_segments) > 3:
                print(f"🎤 ... and {len(text_segments) - 3} more segments")
                
            text = " ".join(text_segments)
        
        transcribe_time = time.time() - transcribe_start
        print(f"✅ Transcription completed in {transcribe_time:.2f} seconds")
        print(f"✅ Total text length: {len(text)} characters")
        
        return text.strip()
    
    except Exception as e:
        transcribe_time = time.time() - transcribe_start
        print(f"❌ Transcription failed after {transcribe_time:.2f} seconds: {str(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        
        # Import traceback here to avoid circular imports
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        
        # Return empty string to indicate failure
        return ""

# Analyze individual phrase - returns dictionary with detailed sentiment analysis
def analyze_phrase_detailed(phrase):
    print(f"😀 Starting detailed sentiment analysis...")
    print(f"😀 Text length: {len(phrase)} characters")
    
    # Lazy load models
    vader_analyzer = get_vader_analyzer()
    distilbert_analyzer, tokenizer = get_distilbert()
    
    # Truncate if needed
    tokens = tokenizer.encode(phrase, truncation=False)
    if len(tokens) > 512:
        print(f"⚠️ Text too long ({len(tokens)} tokens), truncating to 512 tokens")
        phrase = tokenizer.decode(tokens[:512], skip_special_tokens=True)
    
    print(f"😀 Running VADER sentiment analysis...")
    vader_start = time.time()
    vader_scores = vader_analyzer.polarity_scores(phrase)
    vader_time = time.time() - vader_start
    print(f"✅ VADER analysis completed in {vader_time:.2f} seconds")
    
    print(f"😀 Running DistilBERT sentiment analysis...")
    distilbert_start = time.time()
    distilbert_result = distilbert_analyzer(phrase, truncation=True)[0]
    distilbert_time = time.time() - distilbert_start
    print(f"✅ DistilBERT analysis completed in {distilbert_time:.2f} seconds")

    sentiment = get_sentiment_label(vader_scores['compound'])
    
    print(f"📊 Sentiment: {sentiment}")
    print(f"📊 VADER compound score: {vader_scores['compound']:.4f}")
    print(f"📊 DistilBERT: {distilbert_result['label']} ({distilbert_result['score']:.4f})")

    return {
        "text": phrase,
        "vader_sentiment": sentiment,
        "vader_compound": vader_scores['compound'],
        "distilbert_label": distilbert_result['label'],
        "distilbert_score": distilbert_result['score']
    }

# Simple version that returns just the compound score (for backward compatibility)
def analyze_phrase(phrase):
    print(f"😀 Starting sentiment analysis...")
    vader_analyzer = get_vader_analyzer()
    vader_scores = vader_analyzer.polarity_scores(phrase)
    vader_compound = vader_scores['compound']
    print(f"📊 Final sentiment score (VADER compound): {vader_compound:.4f}")
    return vader_compound

def get_sentiment_label(score):
    """Convert numerical score to sentiment label"""
    if score >= 0.05:
        return "Positive"
    elif score <= -0.05:
        return "Negative"
    else:
        return "Neutral"

# Advanced analysis functions from the second file
def find_memory_references(text):
    """Identify potential memory references in text"""
    memory_indicators = [
        "remember", "recall", "memory", "memories", "forget", "forgot", 
        "forgotten", "reminded", "reminds", "reminiscent", "lost",
        "missing", "missed", "gone", "passed away", "died", "death"
    ]
    
    found_indicators = []
    for indicator in memory_indicators:
        if re.search(r'\b' + re.escape(indicator) + r'\b', text.lower()):
            found_indicators.append(indicator)
    
    # If we found indicators, also include the full text as context
    if found_indicators:
        found_indicators.append(text)
        
    return ", ".join(found_indicators) if found_indicators else None

def find_routine_references(text):
    """Identify potential routine references in text"""
    routine_indicators = [
        "breakfast", "lunch", "dinner", "meal", "eating", "sleeping", "sleep",
        "waking up", "wake up", "shower", "bath", "medication", "medicine",
        "exercise", "walk", "walking", "running", "jogging", "working",
        "studying", "reading", "watching", "listening", "cook", "cooking",
        "cleaning", "laundry", "shopping", "commute", "commuting", "driving",
        "travel", "traveling", "routine", "habit", "schedule", "appointment"
    ]
    
    found_indicators = []
    for indicator in routine_indicators:
        if re.search(r'\b' + re.escape(indicator) + r'\b', text.lower()):
            found_indicators.append(indicator)
            
    return ", ".join(found_indicators) if found_indicators else None

def find_time_indicators(text):
    """Identify time references in text"""
    time_indicators = [
        "today", "yesterday", "tomorrow", "now", "later", "soon", "earlier",
        "morning", "afternoon", "evening", "night", "midnight", "noon",
        "last night", "last week", "last month", "last year", "next week",
        "next month", "next year", "day", "week", "month", "year",
        "january", "february", "march", "april", "may", "june", "july",
        "august", "september", "october", "november", "december",
        "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
        "right now", "currently", "moment", "instant", "immediately"
    ]
    
    found_indicators = []
    for indicator in time_indicators:
        if re.search(r'\b' + re.escape(indicator) + r'\b', text.lower()):
            found_indicators.append(indicator)
            
    # Also try to find specific times like "3:00" or dates like "2023-04-27"
    time_pattern = r'\d{1,2}:\d{2}'
    date_pattern = r'\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{2,4}'
    
    time_matches = re.findall(time_pattern, text)
    date_matches = re.findall(date_pattern, text)
    
    found_indicators.extend(time_matches)
    found_indicators.extend(date_matches)
            
    return ", ".join(found_indicators) if found_indicators else None

def find_location_indicators(text):
    """Identify location references in text"""
    location_indicators = [
        "home", "house", "apartment", "room", "bedroom", "bathroom", "kitchen",
        "living room", "office", "work", "school", "college", "university",
        "hospital", "clinic", "doctor", "store", "shop", "restaurant", "cafe",
        "park", "garden", "street", "road", "avenue", "boulevard", "highway",
        "city", "town", "village", "country", "state", "province", "region",
        "continent", "world", "planet", "space", "universe", "here", "there"
    ]
    
    # Major cities and countries to look for
    cities_countries = [
        "new york", "london", "paris", "tokyo", "berlin", "rome", "madrid",
        "moscow", "beijing", "delhi", "mumbai", "sydney", "melbourne",
        "usa", "uk", "france", "germany", "japan", "china", "india", "australia"
    ]
    
    location_indicators.extend(cities_countries)
    
    found_indicators = []
    for indicator in location_indicators:
        if re.search(r'\b' + re.escape(indicator) + r'\b', text.lower()):
            found_indicators.append(indicator)
            
    return ", ".join(found_indicators) if found_indicators else None

def find_severity_indicators(text):
    """Identify intensity/severity indicators in text"""
    severity_indicators = [
        "very", "extremely", "incredibly", "really", "quite", "totally",
        "absolutely", "completely", "utterly", "terribly", "awful", "horrible",
        "severe", "serious", "critical", "emergency", "urgent", "desperate",
        "hopeless", "helpless", "alone", "lonely", "isolated", "abandoned",
        "scared", "frightened", "terrified", "panic", "anxiety", "depression",
        "sad", "unhappy", "miserable", "suicidal", "die", "death", "kill",
        "harm", "hurt", "pain", "suffering", "agony", "distress", "crisis"
    ]
    
    found_indicators = []
    for indicator in severity_indicators:
        if re.search(r'\b' + re.escape(indicator) + r'\b', text.lower()):
            found_indicators.append(indicator)
    
    # If we found severe indicators, also include the full text as context
    if any(indicator in ["suicidal", "die", "death", "kill", "harm"] for indicator in found_indicators):
        found_indicators.append(text)
            
    return ", ".join(found_indicators) if found_indicators else None

def identify_potential_concerns(text, sentiment_score):
    """Identify potential concerns based on content and sentiment"""
    concerns = []
    
    # Check for extreme negative sentiment
    if sentiment_score <= -0.6:
        concerns.append("Highly negative emotional state")
    
    # Check for specific keywords indicating various concerns
    if re.search(r'\b(suicid|kill myself|end my life|take my life)\b', text.lower()):
        concerns.append("Potential suicidal ideation")
    
    if re.search(r'\b(lonely|alone|isolated|no friends|nobody cares)\b', text.lower()):
        concerns.append("Feelings of loneliness or isolation")
    
    if re.search(r'\b(depress|anxiety|anxious|panic|fear|scared|terrified)\b', text.lower()):
        concerns.append("Potential mental health concerns")
    
    if re.search(r'\b(hurt|pain|ache|sick|ill|disease|condition|symptom)\b', text.lower()):
        concerns.append("Physical health concerns")
    
    if re.search(r'\b(lost|died|passed away|death|funeral)\b', text.lower()):
        concerns.append("Negative feelings about memory")
        
    if re.search(r'\b(forgot|forget|don\'t remember|can\'t recall|memory problem)\b', text.lower()):
        concerns.append("Memory-related concerns")
    
    if re.search(r'\b(eat|food|appetite|hungry|meal)\b', text.lower()) and sentiment_score < -0.1:
        concerns.append("Difficulties with eating or appetite")
    
    if re.search(r'\b(sleep|insomnia|tired|exhausted|fatigue)\b', text.lower()) and sentiment_score < -0.1:
        concerns.append("Sleep issues")
    
    return ", ".join(concerns) if concerns else None

def analyze_text_comprehensive(text):
    """
    Perform comprehensive text analysis returning all metrics
    """
    # Get sentiment score (VADER compound)
    sentiment_score = analyze_phrase(text)
    
    # Get sentiment label
    sentiment_label = get_sentiment_label(sentiment_score)
    
    # Get additional analysis
    memory_references = find_memory_references(text)
    routine_references = find_routine_references(text)
    time_indicators = find_time_indicators(text)
    location_indicators = find_location_indicators(text)
    severity_indicators = find_severity_indicators(text)
    potential_concerns = identify_potential_concerns(text, sentiment_score)
    
    result = {
        'sentiment_score': sentiment_score,
        'sentiment_label': sentiment_label,
        'memory_references': memory_references,
        'routine_references': routine_references,
        'time_indicators': time_indicators,
        'location_indicators': location_indicators,
        'severity_indicators': severity_indicators,
        'potential_concerns': potential_concerns
    }
    
    print("📊 Comprehensive analysis results:")
    for key, value in result.items():
        if value is not None:
            print(f"📊 {key}: {value}")
    
    return result

# Print a startup message without loading any models
print("🚀 Enhanced audio and text analysis module loaded (models will be loaded on demand)")