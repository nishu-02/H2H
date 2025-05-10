import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getUserProfile } from '../api/apiService';
import { auth } from '../api/firebaseConfig';

const { width, height } = Dimensions.get('window');

const confusionTriggers = [
  'TV or Movies', 'Time Pressure', 'Sudden Changes'
];

export default function PatientInfoScreen({ navigation, route }) {
  const [patientName, setPatientName] = useState('');
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [language, setLanguage] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState([]);
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Start animations
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
      Animated.timing(formAnim, {
        toValue: 1,
        duration: 1000,
        delay: 300,
        useNativeDriver: true,
      })
    ]).start();
    
    // Check authentication status
    checkAuthAndFetchProfile();
  }, []);

  const checkAuthAndFetchProfile = async () => {
    try {
      if (auth.currentUser) {
        console.log('User is authenticated:', auth.currentUser.uid);
        fetchUserProfile();
      } else {
        console.log('No user is authenticated');
        setError('You must be logged in to view this screen');
        setLoading(false);
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      setError('Authentication error. Please try logging in again.');
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      // Get UID from route params or from Firebase Auth
      const uid = route.params?.uid || auth.currentUser?.uid;
      
      if (!uid) {
        throw new Error('No user ID available');
      }
      
      console.log('Fetching profile for user:', uid);
      const userData = await getUserProfile(uid);
      
      // Set the fetched data
      setPatientName(userData.name || '');
      // Set nickname as first name
      setNickname(userData.name?.split(" ")[0] || '');
      setAge(userData.age?.toString() || '');
      setGender(userData.gender || '');
      setLanguage(userData.language || '');
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setError('Failed to load profile data. Please try again.');
      setLoading(false);
    }
  };

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return;
      }
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setProfileImage(result.assets[0].uri);
    }
  };

  const toggleTrigger = (trigger) => {
    if (selectedTriggers.includes(trigger)) {
      setSelectedTriggers(selectedTriggers.filter(item => item !== trigger));
    } else {
      setSelectedTriggers([...selectedTriggers, trigger]);
    }
  };

  const handleNext = () => {
    if (patientName && age) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate('MemoryVault', {
        patientInfo: {
          name: patientName,
          nickname,
          age,
          gender,
          language,
          triggers: selectedTriggers,
          profileImage,
          uid: auth.currentUser?.uid // Pass the UID to the next screen
        }
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      // Navigate to login screen
      navigation.navigate('Login');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out. Please try again.');
    }
  };

  const isFormValid = patientName && age;

  if (loading) {
    return (
      <LinearGradient
        colors={['#4C44B9', '#263077']}
        style={[styles.container, styles.loadingContainer]}
      >
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading profile data...</Text>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient
        colors={['#4C44B9', '#263077']}
        style={[styles.container, styles.errorContainer]}
      >
        <Ionicons name="alert-circle-outline" size={60} color="#FFFFFF" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={checkAuthAndFetchProfile}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        {!auth.currentUser && (
          <TouchableOpacity
            style={[styles.retryButton, { marginTop: 10, backgroundColor: '#555' }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.retryButtonText}>Go to Login</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#4C44B9', '#263077']}
      style={styles.container}
    >
      <View style={styles.backgroundElements}>
        <Animated.View style={[styles.blob, { top: '15%', left: '8%', opacity: 0.2 }]} />
        <Animated.View style={[styles.blob, { bottom: '20%', right: '5%', opacity: 0.3 }]} />
      </View>

      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>About the Patient</Text>
          <Text style={styles.headerSubtitle}>Help us create a personalized experience</Text>
        </View>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.profileImageContainer,
            {
              opacity: formAnim,
              transform: [
                {
                  translateY: formAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
            <BlurView intensity={20} tint="light" style={styles.imagePickerBlur}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.uploadPlaceholder} />
              )}
              <View style={styles.cameraButton}>
                <Ionicons name="camera" size={22} color="#FFFFFF" />
              </View>
            </BlurView>
          </TouchableOpacity>
          <Text style={styles.imageHelperText}>Patient photo helps create visual recognition</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: formAnim,
              transform: [
                {
                  translateY: formAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <BlurView intensity={15} tint="light" style={styles.formBlur}>
            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter full name"
                  placeholderTextColor="#A9A9FC"
                  value={patientName}
                  onChangeText={(text) => {
                    setPatientName(text);
                    // Auto-update nickname when full name changes
                    const firstNameFromFullName = text.split(" ")[0];
                    if (firstNameFromFullName) {
                      setNickname(firstNameFromFullName);
                    }
                  }}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nickname or Preferred Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="What they like to be called"
                  placeholderTextColor="#A9A9FC"
                  value={nickname}
                  onChangeText={setNickname}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { width: '45%' }]}>
                <Text style={styles.inputLabel}>Age*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Age"
                  placeholderTextColor="#A9A9FC"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.inputContainer, { width: '45%' }]}>
                <Text style={styles.inputLabel}>Gender</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Gender"
                  placeholderTextColor="#A9A9FC"
                  value={gender}
                  onChangeText={setGender}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Primary Language</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Primary language"
                  placeholderTextColor="#A9A9FC"
                  value={language}
                  onChangeText={setLanguage}
                />
              </View>
            </View>
          </BlurView>
        </Animated.View>

        <Animated.View
          style={[
            styles.triggersContainer,
            {
              opacity: formAnim,
              transform: [
                {
                  translateY: formAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [60, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <BlurView intensity={15} tint="light" style={styles.triggersBlur}>
            <Text style={styles.triggersTitle}>Known Confusion Triggers</Text>
            <Text style={styles.triggersSubtitle}>
              Select factors that might cause distress
            </Text>

            <View style={styles.tagsContainer}>
              {confusionTriggers.map((trigger, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.tagButton,
                    selectedTriggers.includes(trigger) && styles.tagSelected,
                  ]}
                  onPress={() => toggleTrigger(trigger)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tagText,
                      selectedTriggers.includes(trigger) && styles.tagTextSelected,
                    ]}
                  >
                    {trigger}
                  </Text>
                  {selectedTriggers.includes(trigger) && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#7B6CFF"
                      style={styles.tagIcon}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </BlurView>
        </Animated.View>

        <Animated.View
          style={[
            styles.noteContainer,
            {
              opacity: formAnim,
              transform: [
                {
                  translateY: formAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [80, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.noteText}>
            * indicates required fields
          </Text>
        </Animated.View>
      </ScrollView>

      <Animated.View
        style={[
          styles.nextButtonContainer,
          {
            opacity: formAnim,
            transform: [{ translateY: formAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [120, 0],
            })}],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.nextButton,
            !isFormValid && styles.nextButtonDisabled
          ]}
          onPress={handleNext}
          disabled={!isFormValid}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  blob: {
    position: 'absolute',
    width: 300,
    height: 300,
    backgroundColor: '#5E3CA9',
    borderRadius: 150,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 10,
  },
  signOutButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 10,
  },
  headerTextContainer: {
    marginLeft: 40,
  },
  headerTitle: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#B8B8D1',
    marginTop: 5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  imagePickerBlur: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  uploadPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#f1f1f1',
    borderRadius: 40,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#7B6CFF',
    borderRadius: 20,
    padding: 5,
  },
  imageHelperText: {
    marginTop: 10,
    color: '#A9A9FC',
    fontSize: 14,
  },
  formContainer: {
    marginTop: 40,
  },
  formBlur: {
    borderRadius: 20,
    padding: 20,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  inputContainer: {
    width: '100%',
  },
  inputLabel: {
    color: '#A9A9FC',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    height: 45,
    borderColor: '#A9A9FC',
    borderWidth: 1,
    borderRadius: 10,
    paddingLeft: 10,
    fontSize: 16,
    color: '#FFFFFF',
  },
  triggersContainer: {
    marginTop: 40,
  },
  triggersBlur: {
    borderRadius: 20,
    padding: 20,
  },
  triggersTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  triggersSubtitle: {
    color: '#B8B8D1',
    fontSize: 14,
    marginTop: 10,
  },
  tagsContainer: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    marginTop: 10,
  },
  tagButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagSelected: {
    backgroundColor: '#7B6CFF',
  },
  tagText: {
    fontSize: 14,
    color: '#7B6CFF',
  },
  tagTextSelected: {
    color: '#FFFFFF',
  },
  tagIcon: {
    marginLeft: 5,
  },
  noteContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  noteText: {
    color: '#B8B8D1',
    fontSize: 14,
  },
  nextButtonContainer: {
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
  },
  nextButton: {
    backgroundColor: '#7B6CFF',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  nextButtonDisabled: {
    backgroundColor: '#7B7B7B',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 15,
    fontSize: 16,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    marginTop: 15,
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 40,
  },
  retryButton: {
    backgroundColor: '#7B6CFF',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});