// import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import { 
//   View, 
//   StyleSheet, 
//   ScrollView,
//   TouchableOpacity,
//   KeyboardAvoidingView,
//   Platform
// } from 'react-native';
// import {
//   Appbar, 
//   Card, 
//   Text, 
//   Button, 
//   Chip, 
//   Divider, 
//   ActivityIndicator,
//   Portal,
//   Dialog,
//   Snackbar,
//   IconButton,
//   RadioButton,
//   Surface
// } from 'react-native-paper';
// import { auth } from '../api/firebaseConfig';
// import * as Speech from 'expo-speech';
// import { GEMINI_API_KEY, GEMINI_API_URL } from '../api/firebaseConfig';
// import { memoryJson } from '../api/apiService';
// import axios from 'axios';

// const MemoryQuiz = ({ navigation }) => {
//   // State
//   const [memories, setMemories] = useState([]);
//   const [positiveMemories, setPositiveMemories] = useState([]);
//   const [quizMemories, setQuizMemories] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [initialLoading, setInitialLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [snackbarVisible, setSnackbarVisible] = useState(false);
//   const [snackbarMessage, setSnackbarMessage] = useState('');
//   const [isSpeaking, setIsSpeaking] = useState(false);
  
//   // Quiz specific states
//   const [currentMemoryIndex, setCurrentMemoryIndex] = useState(0);
//   const [currentQuestion, setCurrentQuestion] = useState('');
//   const [userKnowsEvent, setUserKnowsEvent] = useState(null);
//   const [quizActive, setQuizActive] = useState(false);
//   const [memoryDetails, setMemoryDetails] = useState('');
//   const [memoryDetailsLoading, setMemoryDetailsLoading] = useState(false);
//   const [showDetails, setShowDetails] = useState(false);
//   const [selectedMemory, setSelectedMemory] = useState(null);
//   const [dialogVisible, setDialogVisible] = useState(false);
//   const [isTitleLoading, setIsTitleLoading] = useState(false);
  
//   // Effects
//   useEffect(() => {
//     checkAuth();
//     fetchMemories();
    
//     return () => {
//       // Stop any ongoing speech
//       if (isSpeaking) {
//         Speech.stop();
//       }
//     };
//   }, []);

//   // Filter positive memories and randomize quiz order once memories are loaded
//   useEffect(() => {
//     if (memories.length > 0) {
//       // Filter out memories with positive sentiment only
//       const positive = memories.filter(mem => 
//         mem.sentiment_label && 
//         mem.sentiment_label.toLowerCase() === 'positive'
//       );
      
//       setPositiveMemories(positive);
      
//       // Create randomized quiz array
//       if (positive.length > 0) {
//         const randomized = shuffleArray([...positive]);
//         setQuizMemories(randomized);
//       } else {
//         showSnackbar('No positive memories found for quiz');
//       }
//     }
//   }, [memories]);

//   // Start the memory quiz once positive memories are prepared
//   useEffect(() => {
//     if (quizMemories.length > 0 && !quizActive) {
//       startMemoryQuiz();
//     }
//   }, [quizMemories]);

//   // Helper functions
//   const checkAuth = () => {
//     if (!auth.currentUser) {
//       setError('Authentication error. Please log in.');
//       showSnackbar('Authentication error. Please log in.');
//       navigation.navigate('Login');
//     }
//   };
// // ...existing code...

//   const showSnackbar = (message) => {
//     setSnackbarMessage(message);
//     setSnackbarVisible(true);
//   };

//   // Fisher-Yates shuffle algorithm for randomizing memories
//   const shuffleArray = (array) => {
//     const newArray = [...array];
//     for (let i = newArray.length - 1; i > 0; i--) {
//       const j = Math.floor(Math.random() * (i + 1));
//       [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
//     }
//     return newArray;
//   };

//   const fetchMemories = async () => {
//     try {
//       setInitialLoading(true);
//       const uid = auth.currentUser?.uid;
//       if (!uid) {
//         throw new Error('User not authenticated');
//       }
//       // Use hardcoded memoryJson
//       const response = await memoryJson(uid);
//       // The export endpoint returns an array of memories directly
//       const memories = Array.isArray(response) ? response : response.memories || [];
//       // Sort by timestamp (newest first)
//       memories.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
//       setMemories(memories);
//     } catch (err) {
//       console.error('Error fetching memories:', err);
//       setError(`Failed to load your memory data: ${err.message}`);
//       showSnackbar('Failed to load memories. Please check your connection.');
//     } finally {
//       setInitialLoading(false);
//     }
//   };

//   // Convert GMT to IST (GMT+5:30)
//   const convertToIST = (timestamp) => {
//     if (!timestamp) return new Date();
    
//     const date = new Date(timestamp);
//     // Add 5 hours and 30 minutes to convert from GMT to IST
//     return new Date(date.getTime() + (5 * 60 + 30) * 60 * 1000);
//   };

//   // Text-to-speech functions
//   const speakText = (text) => {
//     if (!text) return;
    
//     // Stop any ongoing speech first
//     Speech.stop();
    
//     setIsSpeaking(true);
//     Speech.speak(text, {
//       language: 'en-US',
//       pitch: 1.0,
//       rate: 0.9,
//       onDone: () => setIsSpeaking(false),
//       onError: (error) => {
//         console.error('Speech error:', error);
//         setIsSpeaking(false);
//         showSnackbar('Could not play speech');
//       }
//     });
//   };

//   const stopSpeaking = () => {
//     Speech.stop();
//     setIsSpeaking(false);
//   };

//   // Function to generate a title from memory text using Gemini API
//   const generateMemoryTitleWithGemini = async (memoryText) => {
//     if (!memoryText || !GEMINI_API_KEY) {
//       return generateMemoryTitleFallback(memoryText);
//     }
    
//     try {
//       setIsTitleLoading(true);
      
//       // Prepare the prompt for Gemini to generate a concise title
//       const prompt = `
// Generate a concise, engaging title (5-7 words maximum) for this memory text. 
// Focus on the main event, emotion, or location in the text. 
// Do not use generic titles like "Memory" or "Recollection".
// Do not include quotation marks in your title.
// Just return the title directly without explanation.

// Memory text: "${memoryText}"
// `;

//       // Call Gemini API
//       const response = await axios.post(
//         `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
//         {
//           contents: [
//             {
//               parts: [
//                 { text: prompt }
//               ]
//             }
//           ],
//           generationConfig: {
//             temperature: 0.2,
//             maxOutputTokens: 50
//           }
//         },
//         {
//           headers: {
//             'Content-Type': 'application/json'
//           },
//           timeout: 10000 // 10 second timeout
//         }
//       ).catch(error => {
//         console.error('Gemini API title generation error:', error.response?.data || error.message);
//         throw new Error('Failed to generate title with AI');
//       });
      
//       const generatedTitle = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      
//       if (generatedTitle) {
//         // Clean up title (remove quotes if any and trim)
//         return generatedTitle.replace(/["']/g, '').trim();
//       } else {
//         throw new Error('Empty title generated');
//       }
//     } catch (err) {
//       console.error('Error generating memory title with Gemini:', err);
//       return generateMemoryTitleFallback(memoryText);
//     } finally {
//       setIsTitleLoading(false);
//     }
//   };

//   // Fallback title generator if Gemini fails
//   const generateMemoryTitleFallback = (memoryText) => {
//     if (!memoryText) return "Untitled memory";
    
//     // Extract potential keywords
//     const words = memoryText.split(' ');
    
//     // If the text is very short, just use it as the title
//     if (words.length <= 5) return memoryText;
    
//     // Try to identify key topics in the text
//     // Look for phrases after "about", "regarding", "discussing", etc.
//     const topicMatches = memoryText.match(/(?:about|regarding|discussing|on|of|for|with)\s+([^,.!?;]+)/i);
//     if (topicMatches && topicMatches[1] && topicMatches[1].length < 50 && topicMatches[1].length > 10) {
//       return `Memory about ${topicMatches[1].trim()}`;
//     }
    
//     // Try to extract names of people
//     const nameMatches = memoryText.match(/(?:with|and|by|from|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
//     if (nameMatches && nameMatches[1]) {
//       return `Memory with ${nameMatches[1]}`;
//     }
    
//     // Look for location indicators
//     const locationMatches = memoryText.match(/(?:at|in|near|from|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
//     if (locationMatches && locationMatches[1]) {
//       return `Memory at ${locationMatches[1]}`;
//     }
    
//     // Try to identify a meaningful title from the first sentence
//     const firstSentenceMatch = memoryText.match(/^[^.!?]+[.!?]/);
//     if (firstSentenceMatch && firstSentenceMatch[0].length < 60) {
//       // Shorten the sentence if needed
//       const shortTitle = firstSentenceMatch[0].trim();
//       if (shortTitle.length < 40) return shortTitle;
//       return shortTitle.substring(0, 37) + '...';
//     }
    
//     // Extract key phrases based on common speech patterns
//     const actionMatches = memoryText.match(/(?:I|we)\s+([a-z]+ed|went|saw|visited|met|talked|spoke|had|made)/i);
//     if (actionMatches) {
//       const nextWords = memoryText.substring(memoryText.indexOf(actionMatches[0]) + actionMatches[0].length);
//       const contextWords = nextWords.split(/[,.!?;]/, 1)[0].trim();
//       if (contextWords.length < 30) {
//         return `${actionMatches[0]}${contextWords}`;
//       }
//     }
    
//     // If we can't extract a good title using the above methods, 
//     // create a descriptive title from the first 6-7 words
//     return words.slice(0, 6).join(' ') + '...';
//   };

//   // Memory quiz functions
//   const startMemoryQuiz = () => {
//     if (quizMemories.length === 0) {
//       showSnackbar('No positive memories available for quiz');
//       return;
//     }
    
//     setQuizActive(true);
//     setCurrentMemoryIndex(0);
//     presentMemoryQuestion(0);
//   };

//   const presentMemoryQuestion = async (index) => {
//     if (index >= quizMemories.length) {
//       // End of memories, restart from beginning or show completion
//       showSnackbar('You have reviewed all your positive memories!');
//       setQuizActive(false);
//       return;
//     }
    
//     const memory = quizMemories[index];
//     setSelectedMemory(memory);
    
//     // Convert timestamp to IST
//     const istDate = convertToIST(memory.timestamp);
    
//     const formattedDate = istDate.toLocaleDateString('en-US', { 
//       weekday: 'long', 
//       month: 'long', 
//       day: 'numeric',
//       year: 'numeric'
//     });
    
//     const formattedTime = istDate.toLocaleTimeString('en-US', {
//       hour: 'numeric',
//       minute: 'numeric',
//       hour12: true
//     });
    
//     // Get title from Gemini or generate one as fallback
//   // Use input_text for memory text if transcription is not present
//   const memoryText = memory.transcription || memory.input_text || '';
//   const memoryTitle = memory.title || await generateMemoryTitleWithGemini(memoryText);
    
//     // Generate question from memory
//   let question = `Do you remember ${memoryTitle} ? `;
    
//     setCurrentQuestion(question);
//     setShowDetails(false);
//     setUserKnowsEvent(null);
//     setMemoryDetails('');
    
//     // Automatically speak the question
//     speakText(question);
//   };

//   const handleUserResponse = async (knows) => {
//     setUserKnowsEvent(knows);
    
//     if (knows) {
//       // User remembers - show brief summary with the first part of the memory text
//       const memoryText = selectedMemory.transcription || selectedMemory.input_text || '';
//       const previewText = memoryText.length > 100 
//         ? memoryText.substring(0, 100) + '...' 
//         : memoryText;
//       const briefSummary = `Great! The memory was: "${previewText}"`;
//       setMemoryDetails(briefSummary);
//       setShowDetails(true);
//       speakText(briefSummary);
//     } else {
//       // User doesn't remember - generate detailed explanation
//       await generateDetailedMemoryExplanation();
//     }
//   };

//   const generateDetailedMemoryExplanation = async () => {
//     try {
//       setMemoryDetailsLoading(true);
      
//       // Format memory data for detailed explanation
//       const memory = selectedMemory;
//       // Convert timestamp to IST
//       const istDate = convertToIST(memory.timestamp);
      
//       const formattedDate = istDate.toLocaleDateString('en-US', { 
//         weekday: 'long', 
//         month: 'long', 
//         day: 'numeric' 
//       });
      
//       const formattedTime = istDate.toLocaleTimeString('en-US', {
//         hour: 'numeric',
//         minute: 'numeric',
//         hour12: true
//       });
      
//       // Create context information
//       let contextInfo = '';
//       if (memory.sentiment_label) contextInfo += `Emotional tone: ${memory.sentiment_label}\n`;
      
//       // Either use Gemini to create a detailed explanation or create one directly
//       if (GEMINI_API_KEY) {
//         // Prepare the prompt for Gemini
//         const prompt = `
// You are Recall, a personal AI memory assistant for someone with memory difficulties. You need to help the user recall a memory they've forgotten.

// Here's the memory:
// Date: ${formattedDate}
// Time: ${formattedTime}
// Memory text: "${memory.transcription}"
// ${contextInfo}

// Please create a detailed but supportive explanation of what happened in this memory. Write directly to the user in a warm, conversational way. 
// Focus on helping them recall the event with details, emotions, and context.
// Keep your explanation under 120 words
// `;

//         // Call Gemini API
//         const response = await axios.post(
//           `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
//           {
//             contents: [
//               {
//                 parts: [
//                   { text: prompt }
//                 ]
//               }
//             ],
//             generationConfig: {
//               temperature: 0.2,
//               maxOutputTokens: 200
//             }
//           },
//           {
//             headers: {
//               'Content-Type': 'application/json'
//             },
//             timeout: 15000 // 15 second timeout
//           }
//         ).catch(error => {
//           console.error('Gemini API error:', error.response?.data || error.message);
//           throw new Error(`AI service error: ${error.response?.data?.error?.message || 'Unknown error'}`);
//         });
        
//         const generatedExplanation = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        
//         if (generatedExplanation) {
//           // Format memory data for detailed explanation
//           const memory = selectedMemory;
//           // Convert timestamp to IST
//           const istDate = convertToIST(memory.timestamp);
//           const formattedDate = istDate.toLocaleDateString('en-US', { 
//             weekday: 'long', 
//             month: 'long', 
//             day: 'numeric' 
//           });
//           const formattedTime = istDate.toLocaleTimeString('en-US', {
//             hour: 'numeric',
//             minute: 'numeric',
//             hour12: true
//           });
//           // Use input_text for memory text if transcription is not present
//           const memoryText = memory.transcription || memory.input_text || '';
//           // Create context information
//           let contextInfo = '';
//           if (memory.sentiment_label) contextInfo += `Emotional tone: ${memory.sentiment_label}\n`;
//           // Either use Gemini to create a detailed explanation or create one directly
//           if (GEMINI_API_KEY) {
//             // Prepare the prompt for Gemini
//             const prompt = `
//     You are Recall, a personal AI memory assistant for someone with memory difficulties. You need to help the user recall a memory they've forgotten.

//     Here's the memory:
//     Date: ${formattedDate}
//     Time: ${formattedTime}
//     Memory text: "${memoryText}"
//     ${contextInfo}

//     Please create a detailed but supportive explanation of what happened in this memory. Write directly to the user in a warm, conversational way. 
//     Focus on helping them recall the event with details, emotions, and context.
//     Keep your explanation under 120 words
//     `;
//             // Call Gemini API
//             const response = await axios.post(
//               `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
//               {
//                 contents: [
//                   {
//                     parts: [
//                       { text: prompt }
//                     ]
//                   }
//                 ],
//                 generationConfig: {
//                   temperature: 0.2,
//                   maxOutputTokens: 200
//                 }
//               },
//               {
//                 headers: {
//                   'Content-Type': 'application/json'
//                 },
//                 timeout: 15000 // 15 second timeout
//               }
//             ).catch(error => {
//               console.error('Gemini API error:', error.response?.data || error.message);
//               throw new Error(`AI service error: ${error.response?.data?.error?.message || 'Unknown error'}`);
//             });
//             const generatedExplanation = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
//             if (generatedExplanation) {
//               setMemoryDetails(generatedExplanation);
//               speakText(generatedExplanation);
//             } else {
//               throw new Error('Failed to generate memory explanation');
//             }
//           } else {
//             // Fallback to direct explanation if no API key
//             const explanation = `Let me remind you about this memory from ${formattedDate} at ${formattedTime}. \n \nYou said: "${memoryText}"\n\n${contextInfo ? `Additional context: ${contextInfo}` : ''}\n\nThis seemed to be a ${memory.sentiment_label || 'neutral'} memory for you.`;
//             setMemoryDetails(explanation);
//             speakText(explanation);
//           }
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Appbar.Header>
//         <Appbar.BackAction onPress={() => navigation.goBack()} />
//         <Appbar.Content title="Memory Quiz" subtitle="Positive Memories" />
//         <Appbar.Action icon="refresh" onPress={restartQuizWithNewOrder} />
//       </Appbar.Header>

//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         style={styles.keyboardAvoid}
//       >
//         <ScrollView 
//           style={styles.scrollView}
//           contentContainerStyle={styles.scrollContent}
//         >
//           {initialLoading ? (
//             <View style={styles.loadingContainer}>
//               <ActivityIndicator size="large" color="#6200EE" />
//               <Text style={styles.loadingText}>Loading your memories...</Text>
//             </View>
//           ) : error ? (
//             <View style={styles.errorContainer}>
//               <Text style={styles.errorText}>{error}</Text>
//               <Button mode="contained" onPress={fetchMemories} style={styles.retryButton}>
//                 Retry
//               </Button>
//             </View>
//           ) : positiveMemories.length === 0 ? (
//             <View style={styles.noMemoriesContainer}>
//               <Text style={styles.noMemoriesText}>
//                 {memories.length === 0 
//                   ? "You don't have any memories stored yet."
//                   : "You don't have any positive memories stored yet."}
//               </Text>
//               <Button 
//                 mode="contained" 
//                 onPress={() => navigation.navigate('RecordMemory')} 
//                 style={styles.recordButton}
//               >
//                 Record A New Memory
//               </Button>
//             </View>
//           ) : (
//             <>
//               <Card style={styles.quizCard}>
//                 <Card.Content>
//                   <View style={styles.memoryCounter}>
//                     <Text style={styles.memoryCounterText}>
//                       Memory {currentMemoryIndex + 1} of {quizMemories.length}
//                     </Text>
//                     {isTitleLoading && (
//                       <View style={styles.titleLoading}>
//                         <ActivityIndicator size="small" color="#6200EE" />
//                         <Text style={styles.titleLoadingText}>Preparing question...</Text>
//                       </View>
//                     )}
//                   </View>
                  
//                   {!isTitleLoading && (
//                     <View style={styles.questionContainer}>
//                       <Text style={styles.questionText}>{currentQuestion}</Text>
//                       <View style={styles.speechControls}>
//                         <IconButton
//                           icon={isSpeaking ? "volume-off" : "volume-high"}
//                           size={24}
//                           onPress={isSpeaking ? stopSpeaking : () => speakText(currentQuestion)}
//                           color={isSpeaking ? "#F44336" : "#6200EE"}
//                         />
//                       </View>
//                     </View>
//                   )}

//                   {!showDetails && !isTitleLoading && (
//                     <View style={styles.responseButtons}>
//                       <Button 
//                         mode="contained" 
//                         onPress={() => handleUserResponse(true)}  
//                         style={[styles.responseButton, userKnowsEvent === true ? styles.selectedButton : null]}
//                         disabled={userKnowsEvent !== null}
//                       >
//                         Yes, I Remember
//                       </Button>
//                       <Button 
//                         mode="contained" 
//                         onPress={() => handleUserResponse(false)}
//                         style={[styles.responseButton, userKnowsEvent === false ? styles.selectedButton : null, {backgroundColor: '#FFA000'}]}
//                         disabled={userKnowsEvent !== null}
//                       >
//                         No, I Don't Remember
//                       </Button>
//                     </View>
//                   )}

//                   {memoryDetailsLoading && (
//                     <View style={styles.loadingDetails}>
//                       <ActivityIndicator size="small" color="#6200EE" />
//                       <Text style={styles.loadingText}>Generating memory details...</Text>
//                     </View>
//                   )}

//                   {showDetails && (
//                     <View style={styles.detailsContainer}>
//                       <Surface style={styles.detailsSurface}>
//                         <Text style={styles.detailsText}>{memoryDetails}</Text>
//                       </Surface>
                      
//                       <Button 
//                         mode="contained" 
//                         onPress={() => setDialogVisible(true)}
//                         style={styles.viewCompleteButton}
//                       >
//                         View Complete Memory
//                       </Button>
                      
//                       <Button 
//                         mode="contained" 
//                         onPress={moveToNextMemory}
//                         style={styles.nextButton}
//                       >
//                         Next Memory
//                       </Button>
//                     </View>
//                   )}
//                 </Card.Content>
//               </Card>
//             </>
//           )}
//         </ScrollView>
//       </KeyboardAvoidingView>
      
//       {/* Memory Detail Dialog */}
//       <Portal>
//         <Dialog 
//           visible={dialogVisible} 
//           onDismiss={() => setDialogVisible(false)}
//           style={styles.dialog}
//         >
//           <Dialog.Title>Memory Details</Dialog.Title>
//           <Dialog.Content>
//             {selectedMemory && (
//               <>
//                 <Text style={styles.dialogTimestamp}>
//                   {formatDate(selectedMemory.timestamp)}
//                 </Text>
                
//                 <Surface style={styles.transcriptSurface}>
//                   <Text style={styles.transcriptText}>
//                     {selectedMemory.transcription || selectedMemory.input_text || ''}
//                   </Text>
//                 </Surface>
                
//                 <Divider style={styles.divider} />
                
//                 <Text style={styles.metadataTitle}>Memory Metadata</Text>
//                 <View style={styles.metadataList}>
//                   <Text style={styles.metadataItem}>
//                     <Text style={styles.metadataLabel}>Sentiment: </Text>
//                     <Text style={{ color: getSentimentColor(selectedMemory.sentiment_label) }}>
//                       {selectedMemory.sentiment_label || 'Neutral'} {selectedMemory.score ? `(${selectedMemory.score})` : ''}
//                     </Text>
//                   </Text>
                  
//                   {selectedMemory.time_indicators && (
//                     <Text style={styles.metadataItem}>
//                       <Text style={styles.metadataLabel}>Time References: </Text>
//                       {selectedMemory.time_indicators}
//                     </Text>
//                   )}
                  
//                   {selectedMemory.location_indicators && (
//                     <Text style={styles.metadataItem}>
//                       <Text style={styles.metadataLabel}>Location: </Text>
//                       {selectedMemory.location_indicators}
//                     </Text>
//                   )}
                  
//                   {selectedMemory.memory_references && (
//                     <Text style={styles.metadataItem}>
//                       <Text style={styles.metadataLabel}>Memory References: </Text>
//                       {selectedMemory.memory_references}
//                     </Text>
//                   )}
                  
//                   {selectedMemory.routine_references && (
//                     <Text style={styles.metadataItem}>
//                       <Text style={styles.metadataLabel}>Routine References: </Text>
//                       {selectedMemory.routine_references}
//                     </Text>
//                   )}
//                 </View>
//               </>
//             )}
//           </Dialog.Content>
//           <Dialog.Actions>
//             <Button onPress={() => setDialogVisible(false)}>Close</Button>
//           </Dialog.Actions>
//         </Dialog>
//       </Portal>
      
//       {/* Snackbar for notifications */}
//       <Snackbar
//         visible={snackbarVisible}
//         onDismiss={() => setSnackbarVisible(false)}
//         duration={3000}
//         action={{
//           label: 'Dismiss',
//           onPress: () => setSnackbarVisible(false),
//         }}
//       >
//         {snackbarMessage}
//       </Snackbar>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f5f5f5',
//   },
//   keyboardAvoid: {
//     flex: 1,
//   },
//   scrollView: {
//     flex: 1,
//   },
//   scrollContent: {
//     padding: 16,
//     paddingBottom: 32,
//   },
//   loadingContainer: {
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 40,
//   },
//   loadingText: {
//     marginTop: 16,
//     color: '#6200EE',
//   },
//   titleLoading: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: 8,
//   },
//   titleLoadingText: {
//     marginLeft: 8,
//     color: '#6200EE',
//     fontSize: 14,
//   },
//   errorContainer: {
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   errorText: {
//     color: '#F44336',
//     textAlign: 'center',
//     marginBottom: 16,
//   },
//   retryButton: {
//     marginTop: 16,
//   },
//   noMemoriesContainer: {
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 40,
//   },
//   noMemoriesText: {
//     fontSize: 16,
//     textAlign: 'center',
//     marginBottom: 20,
//     color: '#757575',
//   },
//   recordButton: {
//     marginTop: 10,
//   },
//   quizCard: {
//     marginBottom: 16,
//     elevation: 4,
//   },
//   memoryCounter: {
//     marginBottom: 12,
//     alignItems: 'center',
//   },
//   memoryCounterText: {
//     color: '#757575',
//     fontSize: 14,
//   },
//   questionContainer: {
//     backgroundColor: '#EDE7F6',
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 16,
//   },
//   questionText: {
//     fontSize: 18,
//     lineHeight: 26,
//     marginBottom: 8,
//   },
//   speechControls: {
//     flexDirection: 'row',
//     justifyContent: 'flex-end',
//   },
//   responseButtons: {
//     flexDirection: 'column',
//     justifyContent: 'space-between',
//     marginTop: 8,
//     marginBottom: 16,
//   },
//   responseButton: {
//     marginBottom: 12,
//     paddingVertical: 6,
//   },
//   selectedButton: {
//     opacity: 0.7,
//   },
//   loadingDetails: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     padding: 16,
//   },
//   detailsContainer: {
//     marginTop: 16,
//   },
//   detailsSurface: {
//     padding: 16,
//     borderRadius: 12,
//     backgroundColor: '#F5F5F5',
//     marginBottom: 16,
//   },
//   detailsText: {
//     fontSize: 16,
//     lineHeight: 24,
//   },
//   viewCompleteButton: {
//     marginBottom: 12,
//     backgroundColor: '#5E35B1',
//   },
//   nextButton: {
//     backgroundColor: '#00897B',
//   },
//   divider: {
//     marginVertical: 16,
//   },
//   dialog: {
//     maxHeight: '80%',
//   },
//   dialogTimestamp: {
//     color: '#757575',
//     marginBottom: 16,
//   },

//   transcriptSurface: {
//     padding: 16,
//     elevation: 1,
//     backgroundColor: '#F5F5F5',
//     borderRadius: 8,
//   },
//   transcriptText: {
//     fontSize: 16,
//   },
//   metadataTitle: {
//     fontSize: 18,
//     marginBottom: 8,
//   },
//   metadataList: {
//     backgroundColor: '#F5F5F5',
//     padding: 16,
//     borderRadius: 8,
//   },
//   metadataItem: {
//     marginBottom: 8,
//   },
//   metadataLabel: {
//     fontWeight: 'bold',
//   }
// });

// export default MemoryQuiz;

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform
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
  RadioButton,
  Surface
} from 'react-native-paper';
import axios from 'axios';
import { auth } from '../api/firebaseConfig';
import Papa from 'papaparse';
import * as Speech from 'expo-speech';
import { GEMINI_API_KEY, GEMINI_API_URL } from '../api/firebaseConfig';
import { MEMORY_API } from '../api/apiService';

const MemoryQuiz = ({ navigation }) => {
  // State
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Quiz specific states
  const [currentMemoryIndex, setCurrentMemoryIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [userKnowsEvent, setUserKnowsEvent] = useState(null);
  const [quizActive, setQuizActive] = useState(false);
  const [memoryDetails, setMemoryDetails] = useState('');
  const [memoryDetailsLoading, setMemoryDetailsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  
  // Effects
  useEffect(() => {
    checkAuth();
    fetchMemories();
    
    return () => {
      // Stop any ongoing speech
      if (isSpeaking) {
        Speech.stop();
      }
    };
  }, []);

  // Start the memory quiz once memories are loaded
  useEffect(() => {
    if (memories.length > 0 && !quizActive) {
      startMemoryQuiz();
    }
  }, [memories]);

  // Helper functions
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

  // Convert GMT to IST (GMT+5:30)
  const convertToIST = (timestamp) => {
    if (!timestamp) return new Date();
    
    const date = new Date(timestamp);
    // Add 5 hours and 30 minutes to convert from GMT to IST
    return new Date(date.getTime() + (5 * 60 + 30) * 60 * 1000);
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

  // Function to generate a title from memory text
  const generateMemoryTitle = (memoryText) => {
    if (!memoryText) return "Untitled memory";
    
    // Extract potential keywords
    const words = memoryText.split(' ');
    
    // If the text is very short, just use it as the title
    if (words.length <= 5) return memoryText;
    
    // Try to identify key topics in the text
    // Look for phrases after "about", "regarding", "discussing", etc.
    const topicMatches = memoryText.match(/(?:about|regarding|discussing|on|of|for|with)\s+([^,.!?;]+)/i);
    if (topicMatches && topicMatches[1] && topicMatches[1].length < 50 && topicMatches[1].length > 10) {
      return `Memory about ${topicMatches[1].trim()}`;
    }
    
    // Try to extract names of people
    const nameMatches = memoryText.match(/(?:with|and|by|from|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (nameMatches && nameMatches[1]) {
      return `Memory with ${nameMatches[1]}`;
    }
    
    // Look for location indicators
    const locationMatches = memoryText.match(/(?:at|in|near|from|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (locationMatches && locationMatches[1]) {
      return `Memory at ${locationMatches[1]}`;
    }
    
    // Try to identify a meaningful title from the first sentence
    const firstSentenceMatch = memoryText.match(/^[^.!?]+[.!?]/);
    if (firstSentenceMatch && firstSentenceMatch[0].length < 60) {
      // Shorten the sentence if needed
      const shortTitle = firstSentenceMatch[0].trim();
      if (shortTitle.length < 40) return shortTitle;
      return shortTitle.substring(0, 37) + '...';
    }
    
    // Extract key phrases based on common speech patterns
    const actionMatches = memoryText.match(/(?:I|we)\s+([a-z]+ed|went|saw|visited|met|talked|spoke|had|made)/i);
    if (actionMatches) {
      const nextWords = memoryText.substring(memoryText.indexOf(actionMatches[0]) + actionMatches[0].length);
      const contextWords = nextWords.split(/[,.!?;]/, 1)[0].trim();
      if (contextWords.length < 30) {
        return `${actionMatches[0]}${contextWords}`;
      }
    }
    
    // If we can't extract a good title using the above methods, 
    // create a descriptive title from the first 6-7 words
    return words.slice(0, 6).join(' ') + '...';
  };

  // Memory quiz functions
  const startMemoryQuiz = () => {
    if (memories.length === 0) {
      showSnackbar('No memories available for quiz');
      return;
    }
    
    setQuizActive(true);
    setCurrentMemoryIndex(0);
    presentMemoryQuestion(0);
  };

  const presentMemoryQuestion = (index) => {
    if (index >= memories.length) {
      // End of memories, restart from beginning or show completion
      showSnackbar('You have reviewed all your memories!');
      setQuizActive(false);
      return;
    }
    
    const memory = memories[index];
    setSelectedMemory(memory);
    
    // Convert timestamp to IST
    const istDate = convertToIST(memory.timestamp);
    
    const formattedDate = istDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
    
    const formattedTime = istDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
    
    // Generate a title for the memory instead of showing preview text
    const memoryTitle = memory.title || generateMemoryTitle(memory.input_text);
    
    // Generate question from memory
    let question;
    const timeContext = memory.time_indicators ? ` around "${memory.time_indicators}"` : '';
    const locationContext = memory.location_indicators ? ` at ${memory.location_indicators}` : '';
    
    question = `Do you remember on ${formattedDate} at ${formattedTime}${timeContext}${locationContext}? The memory is about: "${memoryTitle}"`;
    
    setCurrentQuestion(question);
    setShowDetails(false);
    setUserKnowsEvent(null);
    setMemoryDetails('');
    
    // Automatically speak the question
    speakText(question);
  };

  const handleUserResponse = async (knows) => {
    setUserKnowsEvent(knows);
    
    if (knows) {
      // User remembers - show brief summary with the first part of the memory text
      const previewText = selectedMemory.input_text.length > 100 
        ? selectedMemory.input_text.substring(0, 100) + '...' 
        : selectedMemory.input_text;
      const briefSummary = `Great! The memory was: "${previewText}"`;
      setMemoryDetails(briefSummary);
      setShowDetails(true);
      speakText(briefSummary);
    } else {
      // User doesn't remember - generate detailed explanation
      await generateDetailedMemoryExplanation();
    }
  };

  const generateDetailedMemoryExplanation = async () => {
    try {
      setMemoryDetailsLoading(true);
      
      // Format memory data for detailed explanation
      const memory = selectedMemory;
      // Convert timestamp to IST
      const istDate = convertToIST(memory.timestamp);
      
      const formattedDate = istDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
      
      const formattedTime = istDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
      
      // Create context information
      let contextInfo = '';
      if (memory.time_indicators) contextInfo += `Time context: ${memory.time_indicators}\n`;
      if (memory.location_indicators) contextInfo += `Location: ${memory.location_indicators}\n`;
      if (memory.sentiment_label) contextInfo += `Emotional tone: ${memory.sentiment_label}\n`;
      if (memory.memory_references) contextInfo += `Related memories: ${memory.memory_references}\n`;
      if (memory.routine_references) contextInfo += `Related routines: ${memory.routine_references}\n`;
      
      // Either use Gemini to create a detailed explanation or create one directly
      if (GEMINI_API_KEY) {
        // Prepare the prompt for Gemini
        const prompt = `
You are Recall, a personal AI memory assistant for someone with memory difficulties. You need to help the user recall a memory they've forgotten.

Here's the memory:
Date: ${formattedDate}
Time: ${formattedTime}
Memory text: "${memory.input_text}"
${contextInfo}

Please create a detailed but supportive explanation of what happened in this memory. Write directly to the user in a warm, conversational way.
Focus on helping them recall the event with details, emotions, and context.
Keep your explanation under 120 words.
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
              maxOutputTokens: 200
            }
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 15000 // 15 second timeout
          }
        ).catch(error => {
          console.error('Gemini API error:', error.response?.data || error.message);
          throw new Error(`AI service error: ${error.response?.data?.error?.message || 'Unknown error'}`);
        });
        
        const generatedExplanation = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (generatedExplanation) {
          setMemoryDetails(generatedExplanation);
          speakText(generatedExplanation);
        } else {
          throw new Error('Failed to generate memory explanation');
        }
      } else {
        // Fallback to direct explanation if no API key
        const explanation = `Let me remind you about this memory from ${formattedDate} at ${formattedTime}. 
        
You said: "${memory.input_text}"

${contextInfo ? `Additional context: ${contextInfo}` : ''}

This seemed to be a ${memory.sentiment_label || 'neutral'} memory for you.`;

        setMemoryDetails(explanation);
        speakText(explanation);
      }
      
      setShowDetails(true);
    } catch (err) {
      console.error('Error generating memory explanation:', err);
      setMemoryDetails(`I'm sorry, I couldn't generate a detailed explanation for this memory. The original memory was: "${selectedMemory.input_text}"`);
      speakText(`I'm sorry, I couldn't generate a detailed explanation for this memory.`);
      setShowDetails(true);
    } finally {
      setMemoryDetailsLoading(false);
    }
  };

  const moveToNextMemory = () => {
    stopSpeaking();
    const nextIndex = currentMemoryIndex + 1;
    setCurrentMemoryIndex(nextIndex);
    presentMemoryQuestion(nextIndex);
  };

  // Formatting helpers
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      // Convert to IST
      const istDate = convertToIST(timestamp);
      
      return istDate.toLocaleString('en-US', { 
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
        <Appbar.Content title="Memory Quiz" />
        <Appbar.Action icon="refresh" onPress={fetchMemories} />
      </Appbar.Header>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
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
              <Card style={styles.quizCard}>
                <Card.Content>
                  <View style={styles.memoryCounter}>
                    <Text style={styles.memoryCounterText}>
                      Memory {currentMemoryIndex + 1} of {memories.length}
                    </Text>
                  </View>
                  
                  <View style={styles.questionContainer}>
                    <Text style={styles.questionText}>{currentQuestion}</Text>
                    <View style={styles.speechControls}>
                      <IconButton
                        icon={isSpeaking ? "volume-off" : "volume-high"}
                        size={24}
                        onPress={isSpeaking ? stopSpeaking : () => speakText(currentQuestion)}
                        color={isSpeaking ? "#F44336" : "#6200EE"}
                      />
                    </View>
                  </View>

                  {!showDetails && (
                    <View style={styles.responseButtons}>
                      <Button 
                        mode="contained" 
                        onPress={() => handleUserResponse(true)}  
                        style={[styles.responseButton, userKnowsEvent === true ? styles.selectedButton : null]}
                        disabled={userKnowsEvent !== null}
                      >
                        Yes, I Remember
                      </Button>
                      <Button 
                        mode="contained" 
                        onPress={() => handleUserResponse(false)}
                        style={[styles.responseButton, userKnowsEvent === false ? styles.selectedButton : null, {backgroundColor: '#FFA000'}]}
                        disabled={userKnowsEvent !== null}
                      >
                        No, I Don't Remember
                      </Button>
                    </View>
                  )}

                  {memoryDetailsLoading && (
                    <View style={styles.loadingDetails}>
                      <ActivityIndicator size="small" color="#6200EE" />
                      <Text style={styles.loadingText}>Generating memory details...</Text>
                    </View>
                  )}

                  {showDetails && (
                    <View style={styles.detailsContainer}>
                      <Surface style={styles.detailsSurface}>
                        <Text style={styles.detailsText}>{memoryDetails}</Text>
                      </Surface>
                      
                      <Button 
                        mode="contained" 
                        onPress={() => setDialogVisible(true)}
                        style={styles.viewCompleteButton}
                      >
                        View Complete Memory
                      </Button>
                      
                      <Button 
                        mode="contained" 
                        onPress={moveToNextMemory}
                        style={styles.nextButton}
                      >
                        Next Memory
                      </Button>
                    </View>
                  )}
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
                      {selectedMemory.sentiment_label || 'Neutral'} {selectedMemory.sentiment_score ? `(${selectedMemory.sentiment_score})` : ''}
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
  quizCard: {
    marginBottom: 16,
    elevation: 4,
  },
  memoryCounter: {
    marginBottom: 12,
    alignItems: 'center',
  },
  memoryCounterText: {
    color: '#757575',
    fontSize: 14,
  },
  questionContainer: {
    backgroundColor: '#EDE7F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  questionText: {
    fontSize: 18,
    lineHeight: 26,
    marginBottom: 8,
  },
  speechControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  responseButtons: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
  },
  responseButton: {
    marginBottom: 12,
    paddingVertical: 6,
  },
  selectedButton: {
    opacity: 0.7,
  },
  loadingDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  detailsContainer: {
    marginTop: 16,
  },
  detailsSurface: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginBottom: 16,
  },
  detailsText: {
    fontSize: 16,
    lineHeight: 24,
  },
  viewCompleteButton: {
    marginBottom: 12,
    backgroundColor: '#5E35B1',
  },
  nextButton: {
    backgroundColor: '#00897B',
  },
  divider: {
    marginVertical: 16,
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
  }
});

export default MemoryQuiz;