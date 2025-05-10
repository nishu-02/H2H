import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image
} from 'react-native';
import {
  Appbar, 
  Card, 
  Text, 
  Button, 
  Chip, 
  Divider, 
  ActivityIndicator,
  Portal,
  Dialog,
  Snackbar,
  IconButton,
  Surface
} from 'react-native-paper';
import axios from 'axios';
import { auth } from '../api/firebaseConfig';
import Papa from 'papaparse';
import * as Speech from 'expo-speech';
import { GEMINI_API_KEY, GEMINI_API_URL } from '../api/firebaseConfig';
import { MEMORY_API } from '../api/apiService';


import { LinearGradient } from 'expo-linear-gradient';

const RandomEventScreen = ({ navigation }) => {
  // State variables
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentMemory, setCurrentMemory] = useState(null);
  const [memoryContext, setMemoryContext] = useState('');
  const [error, setError] = useState(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [memoryInsight, setMemoryInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);

  // Effects
  useEffect(() => {
    checkAuth();
    fetchMemories();
    
    return () => {
      // Stop any ongoing speech when unmounting component
      if (isSpeaking) {
        Speech.stop();
      }
    };
  }, []);

  // Auth check
  const checkAuth = () => {
    if (!auth.currentUser) {
      setError('Authentication error. Please log in.');
      showSnackbar('Authentication error. Please log in.');
      navigation.navigate('Login');
    }
  };

  // Show snackbar notifications
  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  // Fetch memories from API
  const fetchMemories = async () => {
    try {
      setInitialLoading(true);
      const uid = auth.currentUser?.uid;
      
      if (!uid) {
        throw new Error('User not authenticated');
      }
      
      // Using axios with proper error handling
      const response = await axios.get(MEMORY_API, {
        headers: {
          'Authorization': uid
        },
        timeout: 10000 // 10 second timeout
      }).catch(error => {
        // Detailed error handling for Axios errors
        if (error.response) {
          // Server responded with a status code outside the 2xx range
          console.error('Server error:', error.response.status, error.response.data);
          throw new Error(`Server error: ${error.response.status}`);
        } else if (error.request) {
          // Request was made but no response received
          console.error('Network error - no response received');
          throw new Error('Network error: Unable to connect to server');
        } else {
          // Something happened in setting up the request
          console.error('Request setup error:', error.message);
          throw new Error(`Request error: ${error.message}`);
        }
      });
      
      // Parse CSV data
      const parsedData = Papa.parse(response.data, { 
        header: true, 
        skipEmptyLines: true,
        dynamicTyping: true,
        delimitersToGuess: [',', '\t', '|', ';'] // More robust CSV parsing
      });
      
      if (parsedData.errors.length > 0) {
        console.warn('CSV parsing had errors:', parsedData.errors);
      }
      
      // Filter out entries with empty input_text
      const validMemories = parsedData.data.filter(item => item.input_text && item.input_text.trim() !== '');
      
      // Sort by timestamp (newest first)
      validMemories.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setMemories(validMemories);
      
      // If there are memories, prepare memory context
      if (validMemories.length > 0) {
        let context = '';
        validMemories.slice(0, 20).forEach((memory, index) => {
          context += `Memory ${index + 1} (${new Date(memory.timestamp).toLocaleString()}):\n`;
          context += `Text: "${memory.input_text}"\n`;
          context += `Sentiment: ${memory.sentiment_label || 'Neutral'}\n`;
          if (memory.location_indicators) context += `Location: ${memory.location_indicators}\n`;
          if (memory.time_indicators) context += `Time: ${memory.time_indicators}\n`;
          context += '\n';
        });
        setMemoryContext(context);
      }
    } catch (err) {
      console.error('Error fetching memories:', err);
      setError(`Failed to load your memory data: ${err.message}`);
      showSnackbar('Failed to load memories. Please check your connection.');
    } finally {
      setInitialLoading(false);
    }
  };

  // Text-to-speech functions
  const speakText = (text) => {
    if (!text) return;
    
    // Stop any ongoing speech first
    Speech.stop();
    
    setIsSpeaking(true);
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.9,
      onDone: () => setIsSpeaking(false),
      onError: (error) => {
        console.error('Speech error:', error);
        setIsSpeaking(false);
        showSnackbar('Could not play speech');
      }
    });
  };

  const stopSpeaking = () => {
    Speech.stop();
    setIsSpeaking(false);
  };

// Get random memory and speak it - filtering out negative memories
const getRandomMemory = () => {
  // Filter out negative memories, only keep positive and neutral
  const positiveNeutralMemories = memories.filter(memory => {
    const sentiment = memory.sentiment_label?.toLowerCase();
    // Keep memories that are positive or neutral (not negative)
    return sentiment !== 'negative';
  });
    
  if (positiveNeutralMemories.length === 0) {
    showSnackbar('No positive or neutral memories available');
    return;
  }
    
  setLoading(true);
    
  // Stop any ongoing speech
  if (isSpeaking) {
    stopSpeaking();
  }
    
  // Reset insight
  setMemoryInsight('');
    
  // Select random memory from filtered list
  const randomIndex = Math.floor(Math.random() * positiveNeutralMemories.length);
  const memory = positiveNeutralMemories[randomIndex];
  setCurrentMemory(memory);
    
  // Prepare speech
  const speechText = `Here's a memory from ${formatDate(memory.timestamp)}. ${memory.input_text}`;
    
  // Speak the memory
  setTimeout(() => {
    speakText(speechText);
    setLoading(false);
  }, 500);
};
  // Generate insight about the memory using Gemini
  const generateInsight = async () => {
    if (!currentMemory) return;
    
    try {
      setInsightLoading(true);
      
      // Prepare the prompt for Gemini
      const prompt = `
You are Recall, a compassionate AI memory assistant for someone with cognitive challenges like Alzheimer's.

Here is a memory transcript from the user:
"${currentMemory.input_text}"

This memory was recorded on ${new Date(currentMemory.timestamp).toLocaleString()}.
Sentiment analysis shows this memory has a ${currentMemory.sentiment_label || 'neutral'} emotional tone.
${currentMemory.location_indicators ? `Location mentioned: ${currentMemory.location_indicators}` : ''}
${currentMemory.time_indicators ? `Time references: ${currentMemory.time_indicators}` : ''}

Please provide:
1. A brief, compassionate insight about this memory (max 2-3 sentences)
2. A gentle reminder of why this memory might be meaningful to the person
3. One question they might ask themselves to further reflect on this memory

Keep your response short, warm, and easily understandable. The response will be read aloud to someone who may have memory difficulties.
`;

      // Call Gemini API
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
        {
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 256
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout for AI response
        }
      ).catch(error => {
        // Handle Gemini API specific errors
        if (error.response && error.response.data) {
          console.error('Gemini API error:', error.response.data);
          throw new Error(`AI service error: ${error.response.data.error?.message || 'Unknown error'}`);
        }
        throw error; // Re-throw if it's another type of error
      });
      
      // Extract the response text
      const generatedInsight = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!generatedInsight) {
        throw new Error('Received empty response from AI service');
      }
      
      setMemoryInsight(generatedInsight);
      
      // Speak the insight
      if (!isSpeaking) {
        setTimeout(() => {
          speakText(generatedInsight);
        }, 500);
      }
      
    } catch (err) {
      console.error('Error generating insight:', err);
      setMemoryInsight("I couldn't generate an insight for this memory right now. Please try again later.");
      showSnackbar(`Failed to generate insight: ${err.message}`);
    } finally {
      setInsightLoading(false);
    }
  };

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        hour: 'numeric', 
        minute: 'numeric',
        hour12: true
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return 'Invalid date';
    }
  };

  // Get color based on sentiment
  const getSentimentColor = (sentiment) => {
    if (!sentiment) return '#9E9E9E';
    
    switch(sentiment.toLowerCase()) {
      case 'positive':
        return '#4CAF50';
      case 'negative':
        return '#F44336';
      case 'neutral':
      default:
        return '#2196F3';
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Memory Moments" subtitle="Revisit Random Memories" />
        <Appbar.Action icon="refresh" onPress={fetchMemories} />
      </Appbar.Header>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {initialLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6200EE" />
              <Text style={styles.loadingText}>Loading your memories...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <Button mode="contained" onPress={fetchMemories} style={styles.retryButton}>
                Retry
              </Button>
            </View>
          ) : memories.length === 0 ? (
            <View style={styles.noMemoriesContainer}>
              <Text style={styles.noMemoriesText}>
                You don't have any memories stored yet.
              </Text>
              <Button 
                mode="contained" 
                onPress={() => navigation.navigate('RecordMemory')} 
                style={styles.recordButton}
              >
                Record Your First Memory
              </Button>
            </View>
          ) : (
            <>
              <Card style={styles.introCard}>
                <LinearGradient
                  colors={['#1E3A5F', '#2C5282']}
                  style={styles.gradientBackground}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Card.Content>
                    <Text style={styles.introTitle}>Memory Moments</Text>
                    <Text style={styles.introText}>
                      Revisit your past moments with a single tap. Each random memory will be read aloud to you.
                    </Text>
                    
                    <View style={styles.statsContainer}>
                      <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{memories.length}</Text>
                        <Text style={styles.statLabel}>Total Memories</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{
                          memories.filter(m => m.sentiment_label?.toLowerCase() === 'positive').length
                        }</Text>
                        <Text style={styles.statLabel}>Positive</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{
                          memories.filter(m => m.location_indicators).length
                        }</Text>
                        <Text style={styles.statLabel}>With Location</Text>
                      </View>
                    </View>
                  </Card.Content>
                </LinearGradient>
              </Card>

              <View style={styles.randomButtonContainer}>
                <Button 
                  mode="contained" 
                  onPress={getRandomMemory}
                  icon="shuffle-variant"
                  loading={loading}
                  disabled={loading || initialLoading}
                  contentStyle={styles.randomButtonContent}
                  style={styles.randomButton}
                >
                  {loading ? "Getting Memory..." : "Random Memory Moment"}
                </Button>
              </View>

              {currentMemory && (
                <Card style={styles.memoryCard}>
                  <Card.Content>
                    <View style={styles.memoryHeader}>
                      <Text style={styles.memoryDate}>{formatDate(currentMemory.timestamp)}</Text>
                      <Chip 
                        mode="outlined" 
                        style={{ backgroundColor: getSentimentColor(currentMemory.sentiment_label) + '20' }}
                        textStyle={{ color: getSentimentColor(currentMemory.sentiment_label) }}
                      >
                        {currentMemory.sentiment_label || 'Neutral'}
                      </Chip>
                    </View>
                    
                    <Surface style={styles.memorySurface}>
                      <Text style={styles.memoryText}>{currentMemory.input_text}</Text>
                    </Surface>
                    
                    <View style={styles.mediaContainer}>
                      {isSpeaking ? (
                        <Button 
                          mode="outlined" 
                          icon="volume-off" 
                          onPress={stopSpeaking}
                          style={styles.mediaButton}
                        >
                          Stop Speaking
                        </Button>
                      ) : (
                        <Button 
                          mode="outlined" 
                          icon="volume-high" 
                          onPress={() => speakText(currentMemory.input_text)}
                          style={styles.mediaButton}
                        >
                          Read Aloud
                        </Button>
                      )}
                      
                      <Button 
                        mode="outlined" 
                        icon="lightbulb-outline" 
                        onPress={generateInsight}
                        loading={insightLoading}
                        disabled={insightLoading}
                        style={styles.mediaButton}
                      >
                        {insightLoading ? "Analyzing..." : "Get Insight"}
                      </Button>
                    </View>

                    {currentMemory.location_indicators && (
                      <View style={styles.metadataContainer}>
                        <View style={styles.metadataItem}>
                          <Text style={styles.metadataLabel}>Location: </Text>
                          <Text style={styles.metadataText}>{currentMemory.location_indicators}</Text>
                        </View>
                      </View>
                    )}
                    
                    {currentMemory.time_indicators && (
                      <View style={styles.metadataContainer}>
                        <View style={styles.metadataItem}>
                          <Text style={styles.metadataLabel}>Time Reference: </Text>
                          <Text style={styles.metadataText}>{currentMemory.time_indicators}</Text>
                        </View>
                      </View>
                    )}
                    
                    {memoryInsight && (
                      <>
                        <Divider style={styles.divider} />
                        <View style={styles.insightContainer}>
                          <Text style={styles.insightTitle}>Memory Insight:</Text>
                          <Text style={styles.insightText}>{memoryInsight}</Text>
                          <IconButton
                            icon={isSpeaking ? "volume-off" : "volume-high"}
                            size={24}
                            onPress={isSpeaking ? stopSpeaking : () => speakText(memoryInsight)}
                            color={isSpeaking ? "#F44336" : "#6200EE"}
                            style={styles.insightSpeakButton}
                          />
                        </View>
                      </>
                    )}
                  </Card.Content>
                </Card>
              )}
              
              <Card style={styles.tipsCard}>
                <Card.Content>
                  <Text style={styles.tipsTitle}>Memory Tips</Text>
                  <View style={styles.tipItem}>
                    <IconButton icon="brain" size={24} color="#6200EE" />
                    <Text style={styles.tipText}>
                      Regularly revisiting memories helps strengthen neural connections.
                    </Text>
                  </View>
                  <View style={styles.tipItem}>
                    <IconButton icon="comment-text-outline" size={24} color="#6200EE" />
                    <Text style={styles.tipText}>
                      Try to discuss memories with family members to add more context.
                    </Text>
                  </View>
                  <View style={styles.tipItem}>
                    <IconButton icon="calendar-clock" size={24} color="#6200EE" />
                    <Text style={styles.tipText}>
                      Set a daily reminder to review memories for best results.
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Memory Detail Dialog */}
      <Portal>
        <Dialog 
          visible={dialogVisible} 
          onDismiss={() => setDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title>Memory Details</Dialog.Title>
          <Dialog.Content>
            {currentMemory && (
              <>
                <Text style={styles.dialogTimestamp}>
                  {formatDate(currentMemory.timestamp)}
                </Text>
                
                <Surface style={styles.transcriptSurface}>
                  <Text style={styles.transcriptText}>
                    {currentMemory.input_text}
                  </Text>
                </Surface>
                
                <Divider style={styles.divider} />
                
                <Text style={styles.metadataTitle}>Memory Metadata</Text>
                <View style={styles.metadataList}>
                  <Text style={styles.metadataItem}>
                    <Text style={styles.metadataLabel}>Sentiment: </Text>
                    <Text style={{ color: getSentimentColor(currentMemory.sentiment_label) }}>
                      {currentMemory.sentiment_label || 'Neutral'} ({currentMemory.sentiment_score || '0'})
                    </Text>
                  </Text>
                  
                  {currentMemory.time_indicators && (
                    <Text style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Time References: </Text>
                      {currentMemory.time_indicators}
                    </Text>
                  )}
                  
                  {currentMemory.location_indicators && (
                    <Text style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Location: </Text>
                      {currentMemory.location_indicators}
                    </Text>
                  )}
                </View>
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Snackbar for notifications */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'Dismiss',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    color: '#6200EE',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 16,
  },
  noMemoriesContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noMemoriesText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#757575',
  },
  recordButton: {
    marginTop: 10,
  },
  introCard: {
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 4,
  },
  gradientBackground: {
    borderRadius: 12,
    padding: 4,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  introText: {
    fontSize: 16,
    color: '#E2E8F0',
    marginBottom: 16,
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#A0C4FF',
    marginTop: 4,
  },
  randomButtonContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  randomButton: {
    borderRadius: 28,
    elevation: 4,
  },
  randomButtonContent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  memoryCard: {
    marginBottom: 16,
    elevation: 2,
  },
  memoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  memoryDate: {
    fontSize: 14,
    color: '#757575',
  },
  memorySurface: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 16,
  },
  memoryText: {
    fontSize: 16,
    lineHeight: 24,
  },
  mediaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mediaButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  metadataContainer: {
    backgroundColor: '#F0F4F8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metadataLabel: {
    fontWeight: 'bold',
    color: '#4A5568',
  },
  metadataText: {
    color: '#4A5568',
  },
  divider: {
    marginVertical: 16,
  },
  insightContainer: {
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    padding: 16,
    position: 'relative',
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2B6CB0',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4A5568',
    paddingRight: 40, // Make room for the speak button
  },
  insightSpeakButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  tipsCard: {
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  dialog: {
    maxHeight: '80%',
  },
  dialogTimestamp: {
    color: '#757575',
    marginBottom: 16,
  },
  transcriptSurface: {
    padding: 16,
    elevation: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  transcriptText: {
    fontSize: 16,
  },
  metadataTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  metadataList: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
  },
});

export default RandomEventScreen;