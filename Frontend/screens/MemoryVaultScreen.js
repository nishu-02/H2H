import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { TextInput } from 'react-native-gesture-handler';
import { auth } from '../api/firebaseConfig';
import { registerFace } from '../api/apiService'; // Import the API service function

const { width, height } = Dimensions.get('window');

const memoryCategories = [
  { id: 'family', icon: 'people', label: 'Family' },
  { id: 'event', icon: 'calendar', label: 'Event' },
  { id: 'place', icon: 'location', label: 'Place' },
  { id: 'routine', icon: 'time', label: 'Routine' },
  { id: 'hobby', icon: 'musical-notes', label: 'Hobby' }
];

export default function MemoryVaultScreen({ navigation, route }) {
  const { userType, caregiverName, relation, patientInfo } = route.params || {};
  
  const [memories, setMemories] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentMemory, setCurrentMemory] = useState(null);
  const [memoryName, setMemoryName] = useState('');
  const [memoryRelation, setMemoryRelation] = useState('');
  const [memoryCategory, setMemoryCategory] = useState('');
  const [memoryImage, setMemoryImage] = useState(null);
  const [memoryDescription, setMemoryDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 1000,
        delay: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    if (isModalVisible) {
      Animated.timing(modalAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isModalVisible]);

  const pickImage = async () => {
    try {
      // Request permissions
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant camera roll permissions to make this work!');
          return;
        }
      }

      // Launch image picker
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setMemoryImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const openAddMemoryModal = () => {
    setCurrentMemory(null);
    setMemoryName('');
    setMemoryRelation('');
    setMemoryCategory('');
    setMemoryImage(null);
    setMemoryDescription('');
    setUploadProgress(0);
    setIsModalVisible(true);
  };

  const uploadImageToAPI = async () => {
    if (!memoryImage || !memoryName) {
      Alert.alert('Missing Information', 'Please provide at least a name and image');
      return null;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert(
          "Authentication Error",
          "You're not logged in. Please log in and try again.",
          [{ text: "OK", onPress: () => navigation.navigate('Login') }]
        );
        return null;
      }

      // Get the uid from the current user
      const uid = currentUser.uid;
      
      // Create form data for the image upload
      const formData = new FormData();
      
      // Get file extension from URI
      const imageUri = Platform.OS === 'ios' ? memoryImage.replace('file://', '') : memoryImage;
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image';
      
      // Add the image to form data
      formData.append('image', {
        uri: imageUri,
        type,
        name: filename
      });
      
      // Add the person name to form data
      formData.append('person_name', memoryName);
      
      // Upload using the API service
      const response = await registerFace(uid, formData);
      return response;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload image to server');
      return null;
    }
  };

  const saveMemory = async () => {
    if (!memoryName || !memoryImage) {
      Alert.alert('Missing Information', 'Please provide at least a name and image');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setIsLoading(true);
    setUploadProgress(10);
    
    try {
      // Upload the image to the API
      setUploadProgress(30);
      const apiResponse = await uploadImageToAPI();
      setUploadProgress(70);
      
      if (!apiResponse) {
        setIsLoading(false);
        return;
      }
      
      // Create local memory object
      const newMemory = {
        id: Date.now().toString(),
        name: memoryName,
        relation: memoryRelation,
        category: memoryCategory,
        image: memoryImage,
        description: memoryDescription,
        apiData: apiResponse // Store any data returned from the API
      };
      
      setUploadProgress(90);
      setMemories([...memories, newMemory]);
      
      // Complete the upload
      setUploadProgress(100);
      setIsLoading(false);
      setIsModalVisible(false);
      
      // Play success animation and notify user
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `${memoryName} has been added to the Memory Vault!`);
      
    } catch (error) {
      console.error('Error saving memory:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to save memory. Please try again.');
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Summary', {
      userType,
      caregiverName,
      relation,
      patientInfo,
      memories
    });
  };

  const handleFinish = () => {
    if (memories.length === 0) {
      Alert.alert(
        'No Memories Added',
        'Are you sure you want to continue without adding any memories?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => handleSkip() }
        ]
      );
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Summary', {
      userType,
      caregiverName,
      relation,
      patientInfo,
      memories
    });
  };

  // Return the component UI
  return (
    <LinearGradient
      colors={['#4C44B9', '#263077']}
      style={styles.container}
    >
      <View style={styles.backgroundElements}>
        <Animated.View style={[styles.blob, { top: '10%', right: '5%', opacity: 0.2 }]}>

        </Animated.View>
        <Animated.View style={[styles.blob, { bottom: '5%', left: '10%', opacity: 0.3 }]}>
        </Animated.View>
      </View>

      <Animated.View 
        style={[
          styles.header, 
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Memory Vault</Text>
          <Text style={styles.headerSubtitle}>Add important people & memories</Text>
        </View>
      </Animated.View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.introContainer,
            {
              opacity: contentAnim,
              transform: [{ translateY: contentAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })}]
            }
          ]}
        >
          <BlurView intensity={15} tint="light" style={styles.introBlur}>
            <View style={styles.introHeader}>
              <View style={styles.introIconContainer}>

              </View>
              <View style={styles.introTextContainer}>
                <Text style={styles.introTitle}>
                  Let's help A.M.I.E recognize people and memories
                </Text>
                <Text style={styles.introSubtitle}>
                  Add faces and moments that matter most to create a familiar space
                </Text>
              </View>
            </View>
          </BlurView>
        </Animated.View>

        {memories.length > 0 && (
          <Animated.View 
            style={[
              styles.memoriesContainer,
              {
                opacity: contentAnim,
                transform: [{ translateY: contentAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0]
                })}]
              }
            ]}
          >
            <BlurView intensity={15} tint="light" style={styles.memoriesBlur}>
              <Text style={styles.memoriesTitle}>Added Memories</Text>
              
              <View style={styles.memoriesGrid}>
                {memories.map((memory, index) => (
                  <View key={memory.id} style={styles.memoryCard}>
                    <Image source={{ uri: memory.image }} style={styles.memoryImage} />
                    <View style={styles.memoryOverlay}>
                      <BlurView intensity={70} tint="dark" style={styles.memoryTextContainer}>
                        <Text numberOfLines={1} style={styles.memoryName}>{memory.name}</Text>
                        {memory.relation ? (
                          <Text numberOfLines={1} style={styles.memoryRelation}>{memory.relation}</Text>
                        ) : null}
                      </BlurView>
                      {memory.category && (
                        <View style={styles.categoryBadge}>
                          <Ionicons 
                            name={memoryCategories.find(c => c.id === memory.category)?.icon || 'heart'} 
                            size={12} 
                            color="#FFFFFF" 
                          />
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </BlurView>
          </Animated.View>
        )}

        <Animated.View 
          style={[
            styles.addButtonContainer,
            {
              opacity: contentAnim,
              transform: [{ translateY: contentAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [60, 0]
              })}]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.addButton}
            onPress={openAddMemoryModal}
            activeOpacity={0.8}
          >
            <BlurView intensity={15} tint="light" style={styles.addButtonBlur}>
              <LinearGradient
                colors={['rgba(123, 108, 255, 0.5)', 'rgba(94, 84, 204, 0.5)']}
                style={styles.addButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="add" size={32} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add New Memory</Text>
              </LinearGradient>
            </BlurView>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View 
          style={[
            styles.importContainer,
            {
              opacity: contentAnim,
              transform: [{ translateY: contentAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [80, 0]
              })}]
            }
          ]}
        >
          <BlurView intensity={10} tint="light" style={styles.importBlur}>
            <TouchableOpacity style={styles.importButton} activeOpacity={0.8}>
              <MaterialIcons name="cloud-upload" size={24} color="#A9A9FC" />
              <Text style={styles.importText}>Import from Google Drive</Text>
            </TouchableOpacity>
          </BlurView>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Animated.View 
        style={[
          styles.footer, 
          { 
            opacity: fadeAnim
          }
        ]}
      >
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.6}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.finishButton}
          onPress={handleFinish}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#7B6CFF', '#5E54CC']}
            style={styles.finishButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.finishButtonText}>Finish Setup</Text>
            <Ionicons name="checkmark" size={22} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Add Memory Modal */}
      <Modal
        visible={isModalVisible}
        transparent={false}
        animationType="none"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            {
              backgroundColor: 'rgba(0.4, 0.7, 0.9, 0.4)', 
              opacity: modalAnim
            }
          ]}
        >
          <TouchableOpacity 
            style={{ flex: 1 }}
            activeOpacity={1} 
            onPress={() => !isLoading && setIsModalVisible(false)}
          >
            <BlurView intensity={100} tint="dark" style={{ flex: 1 }}>
              <Animated.View 
                style={[
                  styles.modalContainer,
                  {
                    transform: [
                      { 
                        translateY: modalAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [300, 0]
                        })
                      }
                    ]
                  }
                ]}
              >
                <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                  <BlurView intensity={0} tint="" style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Add to Memory Vault</Text>
                      {!isLoading && (
                        <TouchableOpacity 
                          style={styles.closeButton}
                          onPress={() => setIsModalVisible(false)}
                        >
                          <Ionicons name="close" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <ScrollView 
                      style={styles.modalScroll}
                      showsVerticalScrollIndicator={false}
                    >
                      <TouchableOpacity 
                        style={styles.imagePickerContainer}
                        onPress={pickImage}
                        activeOpacity={0.9}
                      >
                        {memoryImage ? (
                          <Image source={{ uri: memoryImage }} style={styles.memoryPickedImage} />
                        ) : (
                          <LinearGradient
                            colors={['rgba(123, 108, 255, 0.3)', 'rgba(94, 84, 204, 0.3)']}
                            style={styles.imagePlaceholder}
                          >

                            <Text style={styles.uploadText}>Tap to upload photo</Text>
                          </LinearGradient>
                        )}
                        
                        <View style={styles.imagePickerOverlay}>
                          <Ionicons name="camera" size={18} color="#FFFFFF" />
                        </View>
                      </TouchableOpacity>

                      <View style={styles.inputRow}>
                        <View style={styles.inputContainer}>
                          <Text style={styles.inputLabel}>Name*</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="Person's name"
                            placeholderTextColor="#A9A9FC"
                            value={memoryName}
                            onChangeText={setMemoryName}
                          />
                        </View>
                      </View>

                      <View style={styles.inputRow}>
                        <View style={styles.inputContainer}>
                          <Text style={styles.inputLabel}>Relationship</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="E.g., Son, Friend, Caregiver"
                            placeholderTextColor="#A9A9FC"
                            value={memoryRelation}
                            onChangeText={setMemoryRelation}
                          />
                        </View>
                      </View>

                      <Text style={[styles.inputLabel, { marginBottom: 10 }]}>Memory Category</Text>
                      <View style={styles.categoriesContainer}>
                        {memoryCategories.map((category) => (
                          <TouchableOpacity
                            key={category.id}
                            style={[
                              styles.categoryOption,
                              memoryCategory === category.id && styles.categorySelected
                            ]}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setMemoryCategory(category.id);
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons 
                              name={category.icon} 
                              size={20} 
                              color={memoryCategory === category.id ? '#7B6CFF' : '#CCCCFF'} 
                            />
                            <Text 
                              style={[
                                styles.categoryText,
                                memoryCategory === category.id && styles.categoryTextSelected
                              ]}
                            >
                              {category.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <View style={styles.inputRow}>
                        <View style={styles.inputContainer}>
                          <Text style={styles.inputLabel}>Description (Optional)</Text>
                          <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Add a short description or memory"
                            placeholderTextColor="#A9A9FC"
                            value={memoryDescription}
                            onChangeText={setMemoryDescription}
                            multiline={true}
                            numberOfLines={4}
                            textAlignVertical="top"
                          />
                        </View>
                      </View>
                    </ScrollView>

                    {isLoading && (
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View 
                            style={[
                              styles.progressFill, 
                              { width: `${uploadProgress}%` }
                            ]} 
                          />
                        </View>
                        <Text style={styles.progressText}>{uploadProgress}%</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.saveButton,
                        (!memoryName || !memoryImage) && styles.saveButtonDisabled,
                        isLoading && styles.saveButtonLoading
                      ]}
                      onPress={saveMemory}
                      disabled={!memoryName || !memoryImage || isLoading}
                      activeOpacity={0.8}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.saveButtonText}>Save to Memory Vault</Text>
                      )}
                    </TouchableOpacity>
                  </BlurView>
                </TouchableOpacity>
              </Animated.View>
            </BlurView>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </LinearGradient>
  );
}


// Styles would remain the same as your original code
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  blob: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  introContainer: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  introBlur: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  introHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  introIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  introTextContainer: {
    flex: 1,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  introSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  memoriesContainer: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  memoriesBlur: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  memoriesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  memoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  memoryCard: {
    width: width * 0.42,
    height: width * 0.42 * 1.3,
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  memoryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  memoryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  memoryTextContainer: {
    borderRadius: 8,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  memoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  memoryRelation: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  categoryBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(123, 108, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonContainer: {
    marginBottom: 20,
  },
  addButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  addButtonBlur: {
    borderRadius: 16,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  importContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  importBlur: {
    borderRadius: 16,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  importText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#A9A9FC',
    marginLeft: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 10,
    backgroundColor: 'rgba(38, 48, 119, 0.9)',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  skipButtonText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#CCCCFF',
  },
  finishButton: {
    flex: 1,
    height: 56,
    marginLeft: 15,
    borderRadius: 28,
    shadowColor: "#7B6CFF",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  finishButtonGradient: {
    height: '100%',
    width: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  finishButtonText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    minHeight: height * 0.6,
    maxHeight: height * 0.9,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: '#FFFFFF',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    maxHeight: height * 0.65,
  },
  imagePickerContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  memoryPickedImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(123, 108, 255, 0.1)',
  },
  uploadText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#CCCCFF',
    marginTop: 10,
  },
  imagePickerOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7B6CFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputRow: {
    marginBottom: 15,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#CCCCFF',
    marginBottom: 5,
  },
  input: {
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 15,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 15,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 10,
    marginBottom: 10,
  },
  categorySelected: {
    backgroundColor: 'rgba(123, 108, 255, 0.2)',
    borderWidth: 1,
    borderColor: '#7B6CFF',
  },
  categoryText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#CCCCFF',
    marginLeft: 5,
  },
  categoryTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
  },
  saveButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7B6CFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonLoading: {
    opacity: 0.8,
  },
  saveButtonText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
});