import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import {
  Appbar, 
  Card, 
  Text, 
  TextInput,
  Button, 
  Chip, 
  Divider, 
  ActivityIndicator,
  Surface,
  Portal,
  Dialog,
  Snackbar,
  IconButton
} from 'react-native-paper';
import axios from 'axios';
import { auth } from '../api/firebaseConfig';
import Papa from 'papaparse';
import * as Speech from 'expo-speech';
// ...existing code...
import { GEMINI_API_KEY, GEMINI_API_URL } from '../api/firebaseConfig';
import { MEMORY_API } from '../api/apiService';


const MemoryQAScreen = ({ navigation }) => {
  // State
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [answerLoading, setAnswerLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [recentQuestions, setRecentQuestions] = useState([
    "What did I do yesterday?",
    "How was my meeting with Sarah?",
    "What did I have for breakfast today?",
    "What are my plans for the weekend?",
    "Did I take my medication today?"
  ]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Effects
  useEffect(() => {
    checkAuth();
    fetchMemories();
    // Stop any ongoing speech
    return () => {
      if (isSpeaking) {
        Speech.stop();
      }
    };
  }, []);
// ...existing code...

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

  // Functions
  const checkAuth = () => {
    if (!auth.currentUser) {
      setError('Authentication error. Please log in.');
      showSnackbar('Authentication error. Please log in.');
      navigation.navigate('Login');
    }
  };

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

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
    } catch (err) {
      console.error('Error fetching memories:', err);
      setError(`Failed to load your memory data: ${err.message}`);
      showSnackbar('Failed to load memories. Please check your connection.');
    } finally {
      setInitialLoading(false);
    }
  };

  const askQuestion = async () => {
    if (!question.trim()) {
      showSnackbar('Please enter a question');
      return;
    }

    try {
      setAnswerLoading(true);
      setAnswer('');
      setSelectedMemory(null); // Reset selected memory
      
      // Stop any ongoing speech when asking a new question
      if (isSpeaking) {
        stopSpeaking();
      }
      
      // Save question to recent questions
      if (!recentQuestions.includes(question)) {
        const updatedQuestions = [question, ...recentQuestions.slice(0, 4)];
        setRecentQuestions(updatedQuestions);
      }
      
      // Format memories for the prompt
      let memoryContext = '';
      if (memories.length === 0) {
        // Handle no memories case
        setAnswer("I don't have any memories stored yet. Try recording some memories first, then I can help you recall them.");
        setAnswerLoading(false);
        return;
      }
      
      memories.slice(0, 20).forEach((memory, index) => {
        memoryContext += `Memory ${index + 1} (${new Date(memory.timestamp).toLocaleString()}):\n`;
        memoryContext += `Text: "${memory.input_text}"\n`;
        memoryContext += `Sentiment: ${memory.sentiment_label || 'Neutral'}\n`;
        if (memory.location_indicators) memoryContext += `Location: ${memory.location_indicators}\n`;
        if (memory.time_indicators) memoryContext += `Time: ${memory.time_indicators}\n`;
        memoryContext += '\n';
      });
      
      // Prepare the prompt for Gemini
      const prompt = `
You are Recall, a personal AI memory assistant. Your job is to help the user recall information from their audio memory transcripts.

Here are the most recent transcripts from the user's audio memories:

${memoryContext}

The user is asking the following question about their memories:
"${question}"

Please answer their question based ONLY on the information provided in the memory transcripts above.
If the answer can be found in the memories, provide it clearly and concisely.
If the answer cannot be found in the available memories, respond with "I don't have any memories about that" and suggest what kind of information they might want to record in the future.
Always cite specific memories when answering by mentioning when they occurred.
Be conversational and helpful.
`;

      // Call Gemini API with updated URL and error handling
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
            maxOutputTokens: 512
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
      
      // Extract the response text from the updated Gemini API response structure
      const generatedAnswer = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!generatedAnswer) {
        throw new Error('Received empty response from AI service');
      }
      
      setAnswer(generatedAnswer);
      
      // Find relevant memories based on keywords in question and answer
      findRelevantMemories(question, generatedAnswer);
      
      // Automatically speak the answer
      setTimeout(() => {
        speakText("Here's what I found: " + generatedAnswer);
      }, 500);
      
    } catch (err) {
      console.error('Error asking question:', err);
      setAnswer("I'm sorry, I couldn't process your question. Please try again later.");
      showSnackbar(`Failed to get an answer: ${err.message}`);
    } finally {
      setAnswerLoading(false);
    }
  };

  const findRelevantMemories = (question, answer) => {
    try {
      // Check if the answer indicates no memories were found
      const noMemoriesFound = answer.toLowerCase().includes("don't have any memories about that") || 
                            answer.toLowerCase().includes("i don't have any memories");
      
      if (noMemoriesFound) {
        setSelectedMemory(null);
        return;
      }
      
      // Extract keywords from question and answer
      const combined = question + " " + answer;
      const words = combined.toLowerCase().split(/\s+/);
      const keywords = words.filter(word => 
        word.length > 3 && 
        !["what", "when", "where", "which", "about", "have", "this", "that", "with", "from"].includes(word)
      );
      
      // Find memories that contain these keywords
      const relevantMemories = memories.filter(memory => {
        if (!memory?.input_text) return false;
        const text = memory.input_text.toLowerCase();
        return keywords.some(keyword => text.includes(keyword));
      });
      
      // If we found relevant memories, set the most relevant one
      if (relevantMemories.length > 0) {
        setSelectedMemory(relevantMemories[0]);
      } else {
        setSelectedMemory(null);
      }
    } catch (e) {
      console.error("Error finding relevant memories:", e);
    }
  };

  const handleQuickQuestion = (q) => {
    setQuestion(q);
    askQuestion();
  };

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
        <Appbar.Content title="Ask Your Memories" />
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
                onPress={() => navigation.navigate('AudioUploadScreen')} 
                style={styles.recordButton}
              >
                Record Your First Memory
              </Button>
            </View>
          ) : (
            <>
              <Card style={styles.questionCard}>
                <Card.Content>
                  <Text style={styles.cardTitle}>Ask About Your Memories</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      label="What would you like to remember?"
                      value={question}
                      onChangeText={setQuestion}
                      style={styles.textInput}
                      multiline
                      mode="outlined"
                    />
                    <View style={styles.inputActions}>
                      {/* Microphone functionality removed */}
// ...existing code...
                      <IconButton
                        icon="send"
                        size={24}
                        onPress={askQuestion}
                        disabled={answerLoading || !question.trim()}
                        style={styles.actionButton}
                      />
                    </View>
                  </View>
                  
                  {isListening && (
                    <View style={styles.listeningIndicator}>
                      <Text style={styles.listeningText}>Listening...</Text>
                      <ActivityIndicator size="small" color="#6200EE" />
                    </View>
                  )}
                  
                  <Text style={styles.quickQuestionsTitle}>Quick Questions</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipContainer}
                  >
                    {recentQuestions.map((q, index) => (
                      <Chip 
                        key={index} 
                        style={styles.chip}
                        onPress={() => handleQuickQuestion(q)}
                        mode="outlined"
                      >
                        {q}
                      </Chip>
                    ))}
                  </ScrollView>
                </Card.Content>
              </Card>

              {answerLoading ? (
                <Card style={styles.answerCard}>
                  <Card.Content style={styles.answerLoadingContainer}>
                    <ActivityIndicator size="large" color="#6200EE" />
                    <Text style={styles.loadingText}>Searching your memories...</Text>
                  </Card.Content>
                </Card>
              ) : answer ? (
                <Card style={styles.answerCard}>
                  <Card.Content>
                    <View style={styles.answerHeader}>
                      <Text style={styles.answerTitle}>Here's what I found:</Text>
                      <IconButton
                        icon={isSpeaking ? "volume-off" : "volume-high"}
                        size={24}
                        onPress={isSpeaking ? stopSpeaking : () => speakText("Here's what I found: " + answer)}
                        color={isSpeaking ? "#F44336" : "#6200EE"}
                      />
                    </View>
                    <Text style={styles.answerText}>{answer}</Text>
                    
                    {answer.toLowerCase().includes("don't have any memories about that") || 
                    answer.toLowerCase().includes("i don't have any memories") ? (
                      <View style={styles.noMemoriesFound}>
                        <Text style={styles.noMemoriesFoundText}>
                          No memories found for this query
                        </Text>
                        <Button 
                          mode="outlined" 
                          onPress={() => navigation.navigate('AudioUploadScreen')} 
                          style={styles.recordButton}
                        >
                          Record New Memory
                        </Button>
                      </View>
                    ) : selectedMemory ? (
                      <>
                        <Divider style={styles.divider} />
                        <Text style={styles.relatedTitle}>Related Memory:</Text>
                        <TouchableOpacity 
                          style={styles.relatedMemory}
                          onPress={() => setDialogVisible(true)}
                        >
                          <View style={styles.memoryHeader}>
                            <Text style={styles.memoryTimestamp}>{formatDate(selectedMemory.timestamp)}</Text>
                            <Chip 
                              mode="outlined" 
                              style={{ backgroundColor: getSentimentColor(selectedMemory.sentiment_label) + '20' }}
                              textStyle={{ color: getSentimentColor(selectedMemory.sentiment_label) }}
                            >
                              {selectedMemory.sentiment_label || 'Neutral'}
                            </Chip>
                          </View>
                          
                          <Text style={styles.memoryPreview} numberOfLines={2}>
                            {selectedMemory.input_text}
                          </Text>
                          <Text style={styles.tapForMore}>Tap to view full memory</Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                  </Card.Content>
                </Card>
              ) : null}
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
            {selectedMemory && (
              <>
                <Text style={styles.dialogTimestamp}>
                  {formatDate(selectedMemory.timestamp)}
                </Text>
                
                <Surface style={styles.transcriptSurface}>
                  <Text style={styles.transcriptText}>
                    {selectedMemory.input_text}
                  </Text>
                </Surface>
                
                <Divider style={styles.divider} />
                
                <Text style={styles.metadataTitle}>Memory Metadata</Text>
                <View style={styles.metadataList}>
                  <Text style={styles.metadataItem}>
                    <Text style={styles.metadataLabel}>Sentiment: </Text>
                    <Text style={{ color: getSentimentColor(selectedMemory.sentiment_label) }}>
                      {selectedMemory.sentiment_label || 'Neutral'} ({selectedMemory.sentiment_score || '0'})
                    </Text>
                  </Text>
                  
                  {selectedMemory.time_indicators && (
                    <Text style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Time References: </Text>
                      {selectedMemory.time_indicators}
                    </Text>
                  )}
                  
                  {selectedMemory.location_indicators && (
                    <Text style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Location: </Text>
                      {selectedMemory.location_indicators}
                    </Text>
                  )}
                  
                  {selectedMemory.memory_references && (
                    <Text style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Memory References: </Text>
                      {selectedMemory.memory_references}
                    </Text>
                  )}
                  
                  {selectedMemory.routine_references && (
                    <Text style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Routine References: </Text>
                      {selectedMemory.routine_references}
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
  questionCard: {
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'column',
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    marginLeft: 8,
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'flex-start',
  },
  listeningText: {
    color: '#6200EE',
    marginRight: 8,
  },
  quickQuestionsTitle: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  chipContainer: {
    paddingVertical: 8,
  },
  chip: {
    marginRight: 8,
  },
  answerCard: {
    marginBottom: 16,
    elevation: 2,
  },
  answerLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  answerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  answerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  answerText: {
    fontSize: 16,
    lineHeight: 24,
  },
  divider: {
    marginVertical: 16,
  },
  relatedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  relatedMemory: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
  },
  memoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  memoryTimestamp: {
    color: '#757575',
    fontSize: 12,
  },
  memoryPreview: {
    fontSize: 14,
    marginBottom: 4,
  },
  tapForMore: {
    fontSize: 12,
    color: '#6200EE',
    textAlign: 'right',
    marginTop: 4,
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
  metadataItem: {
    marginBottom: 8,
  },
  metadataLabel: {
    fontWeight: 'bold',
  },
  noMemoriesFound: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  noMemoriesFoundText: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
    textAlign: 'center',
  }
});

export default MemoryQAScreen;