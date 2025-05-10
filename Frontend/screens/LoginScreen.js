import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  Image,
  Modal,
  FlatList,
  Dimensions,
  StatusBar
} from 'react-native';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from 'firebase/auth';
import { app } from '../api/firebaseConfig';
import { registerUser } from '../api/apiService';

const { width, height } = Dimensions.get('window');

// Custom input component for consistency
const CustomInput = ({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType }) => (
  <View style={styles.inputWrapper}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#a0aec0"
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType || 'default'}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
    />
  </View>
);

// Custom dropdown component
const CustomDropdown = ({ options, selectedValue, onValueChange, placeholder, label }) => {
  const [visible, setVisible] = useState(false);
  const [displayLabel, setDisplayLabel] = useState(placeholder);

  useEffect(() => {
    // Set initial label based on selected value
    const selected = options.find(option => option.value === selectedValue);
    if (selected) {
      setDisplayLabel(selected.label);
    }
  }, [selectedValue, options]);

  const selectItem = (item) => {
    onValueChange(item.value);
    setDisplayLabel(item.label);
    setVisible(false);
  };

  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity 
        style={styles.dropdownButton} 
        onPress={() => setVisible(true)}
      >
        <Text style={[
          styles.dropdownButtonText,
          displayLabel === placeholder && styles.placeholderText
        ]}>
          {displayLabel}
        </Text>
        <View style={styles.dropdownIconContainer}>
          <Text style={styles.dropdownIcon}>▼</Text>
        </View>
      </TouchableOpacity>
      
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setVisible(false)}
        >
          <View style={styles.dropdownModal}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>{`Select ${label}`}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={styles.dropdownModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({item}) => (
                <TouchableOpacity 
                  style={[
                    styles.dropdownItem,
                    selectedValue === item.value && styles.dropdownItemSelected
                  ]} 
                  onPress={() => selectItem(item)}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    selectedValue === item.value && styles.dropdownItemTextSelected
                  ]}>
                    {item.label}
                  </Text>
                  {selectedValue === item.value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const LoginScreen = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form fields for login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Additional fields for registration
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [language, setLanguage] = useState('en');
  
  // Options for dropdowns
  const genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
    { label: 'Prefer not to say', value: 'prefer_not_to_say' },
  ];
  
  const languageOptions = [
    { label: 'English', value: 'en' },
    { label: 'Spanish', value: 'es' },
    { label: 'French', value: 'fr' },
    { label: 'German', value: 'de' },
    { label: 'Chinese', value: 'zh' },
    { label: 'Japanese', value: 'ja' },
    { label: 'Hindi', value: 'hi' },
  ];
  
  const auth = getAuth(app);
  const googleProvider = new GoogleAuthProvider();

  useEffect(() => {
    // Reset form fields when switching between login and register
    setEmail('');
    setPassword('');
    setName('');
    setAge('');
    setGender('');
    setLanguage('');
    setError('');
    setSuccess('');
  }, [isLogin]);

  useEffect(() => {
    // Check if user is already logged in
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        setSuccess(`Logged in as ${user.email}`);
        // Navigate to home screen
        navigation.navigate('HomeScreenWallpaper');
      }
    });

    return () => unsubscribe();
  }, [auth, navigation]);

  const handleEmailPasswordAuth = async () => {
    if (!validateForm()) {
      setError('Please fill all required fields');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (isLogin) {
        // Handle login
        await signInWithEmailAndPassword(auth, email, password);
        setSuccess('Login successful!');
        navigation.navigate('Home');
      } else {
        // Handle registration
        // First create Firebase account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        navigation.navigate('Welcome');
        
        // Format data for backend registration
        const userData = {
          firebase_uid: user.uid,
          email: email,
          name: name,
          age: parseInt(age),
          gender: gender,
          language: language
        };
        
        try {
          // Then register with your backend
          await registerUser(userData);
          setSuccess('Registration successful!');
          navigation.navigate('Welcome');
        } catch (backendErr) {
          // If backend registration fails, handle the error while keeping Firebase auth
          console.error("Backend registration error:", backendErr);
          
          // Check if it's already registered (which is OK - we can proceed)
          if (backendErr.response && 
              backendErr.response.data && 
              backendErr.response.data.error && 
              backendErr.response.data.error.includes("User already exists")) {
            // This is fine - user exists in both Firebase and backend
            setSuccess('Login successful!');
            navigation.navigate('Home');
          } else {
            // Some other backend error
            setError(`Registration issue: ${backendErr.response?.data?.error || 'Backend error'}`);
          }
        }
      }
    } catch (err) {
      console.error("Firebase auth error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // Note: Google Sign-In on React Native requires additional setup with Expo or native modules
    // This is a simplified implementation - you'll need to use a library like expo-auth-session
    
    Alert.alert(
      "Implementation Note", 
      "Google Sign-in requires additional setup. For Expo, consider using expo-auth-session."
    );
    
    // Placeholder for Google Sign-In implementation
  };

  const validateForm = () => {
    if (!email || !password) return false;
    if (!isLogin && (!name || !age || !gender)) return false;
    return true;
  };

  const renderRegistrationFields = () => {
    if (!isLogin) {
      return (
        <>
          <CustomInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="John Doe"
          />

          <CustomInput
            label="Age"
            value={age}
            onChangeText={setAge}
            placeholder="25"
            keyboardType="numeric"
          />

          <CustomDropdown
            label="Gender"
            options={genderOptions}
            selectedValue={gender}
            onValueChange={(value) => setGender(value)}
            placeholder="Select Gender"
          />

          <CustomDropdown
            label="Preferred Language"
            options={languageOptions}
            selectedValue={language}
            onValueChange={(value) => setLanguage(value)}
            placeholder="Select Language"
          />
        </>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#6d5cae" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Background Elements */}
            <View style={styles.backgroundElements}>
              <View style={[styles.bgElement, styles.bgElement1]} />
              <View style={[styles.bgElement, styles.bgElement2]} />
              <View style={[styles.bgElement, styles.bgElement3]} />
              <View style={[styles.bgElement, styles.bgElement4]} />
            </View>
            
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                 <Image
                  source={require('../assets/brain-icon.png')}
                  style={styles.logoImage}
                  defaultSource={require('../assets/brain-icon.png')}
                  fallbackSource={
                    <View style={styles.logoCircle}>
                      <Text style={styles.logoText}>A</Text>
                    </View>
                  }
                />
                </View>
              </View>
              <Text style={styles.title}>A.M.I.E</Text>
              <Text style={styles.subtitle}>Assistant for Memory, Identity & Emotion</Text>
            </View>
            
            {/* Welcome Section */}
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeHeading}>
                {isLogin ? 'Welcome Back' : 'Join A.M.I.E.'}
              </Text>
              <Text style={styles.welcomeSubheading}>
                {isLogin 
                  ? 'Sign in to continue your memory journey' 
                  : 'Create an account to start your memory journey'}
              </Text>
            </View>

            {/* Form Container */}
            <View style={styles.formCard}>
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {success ? (
                <View style={styles.successContainer}>
                  <Text style={styles.successText}>{success}</Text>
                </View>
              ) : null}

              <View style={styles.formContainer}>
                <CustomInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                />

                <CustomInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry
                />

                {renderRegistrationFields()}

                <TouchableOpacity
                  style={[
                    styles.button,
                    validateForm() ? styles.buttonActive : styles.buttonDisabled
                  ]}
                  onPress={handleEmailPasswordAuth}
                  disabled={!validateForm() || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {isLogin ? 'Sign In' : 'Create Account'}
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.googleButton}
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                >
                  <View style={styles.googleIconContainer}>
                    <Image
                      source={{
                        uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg'
                      }}
                      style={styles.googleIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.switchButton}
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text style={styles.switchButtonText}>
                {isLogin
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <Text style={styles.switchButtonTextHighlight}>
                  {isLogin ? "Sign up" : "Sign in"}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6d5cae',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  backgroundElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: -1,
    overflow: 'hidden',
  },
  bgElement: {
    position: 'absolute',
    borderRadius: 100,
  },
  bgElement1: {
    width: 400,
    height: 400,
    backgroundColor: 'rgba(110, 86, 207, 0.4)',
    top: -200,
    right: -200,
    transform: [{ rotate: '15deg' }],
  },
  bgElement2: {
    width: 300,
    height: 300,
    backgroundColor: 'rgba(94, 114, 228, 0.3)',
    top: 50,
    left: -150,
    transform: [{ rotate: '45deg' }],
  },
  bgElement3: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(136, 84, 208, 0.25)',
    bottom: -50,
    right: -50,
    transform: [{ rotate: '30deg' }],
  },
  bgElement4: {
    width: 150,
    height: 150,
    backgroundColor: 'rgba(17, 205, 239, 0.2)',
    bottom: 200,
    left: 0,
    transform: [{ rotate: '60deg' }],
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 50 : 30,
    paddingBottom: 20,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 12,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#6d5cae',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.5,
  },
  welcomeSection: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 25,
    paddingHorizontal: 24,
  },
  welcomeHeading: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubheading: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 26,
    paddingTop: 35,
    paddingBottom: 25,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 18,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
    paddingLeft: 2,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
  },
  // Custom dropdown styles
  dropdownButton: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#1f2937',
  },
  placeholderText: {
    color: '#a0aec0',
  },
  dropdownIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 20,
  },
  dropdownModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    maxHeight: 350,
    width: '90%',
    alignSelf: 'center',
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
  },
  dropdownModalClose: {
    fontSize: 20,
    color: '#6b7280',
    padding: 4,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownItemSelected: {
    backgroundColor: '#eff6ff',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#374151',
  },
  dropdownItemTextSelected: {
    color: '#6d5cae',
    fontWeight: '500',
  },
  checkmark: {
    color: '#6d5cae',
    fontSize: 18,
    fontWeight: 'bold',
  },
  button: {
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 22,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  buttonActive: {
    backgroundColor: '#6d5cae',
  },
  buttonDisabled: {
    backgroundColor: '#b2a1de',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  switchButton: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  switchButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
  switchButtonTextHighlight: {
    color: '#6d5cae',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
    logoImage: {
    width: 60,
    height: 60,
    borderRadius: 50,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 15,
    flex: 1,
  },
  successContainer: {
    backgroundColor: '#dcfce7',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  successText: {
    color: '#166534',
    fontSize: 15,
    flex: 1,
  },
});

export default LoginScreen;