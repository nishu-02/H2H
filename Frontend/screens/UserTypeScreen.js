
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Dimensions,
  TextInput,
  ScrollView 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SharedElement } from 'react-navigation-shared-element';
import LottieView from 'lottie-react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function UserTypeScreen({ navigation }) {
  const [userType, setUserType] = useState(null);
  const [relation, setRelation] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const optionsAnim = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

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
      ...optionsAnim.map((anim, index) => 
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          delay: 300 + (index * 150),
          useNativeDriver: true,
        })
      )
    ]).start();
  }, []);

  const handleContinue = () => {
    if ((userType === 'caregiver' && caregiverName && relation) || userType === 'patient') {
      navigation.navigate('PatientInfo', { userType, caregiverName, relation });
    }
  };

  return (
    <LinearGradient
      colors={['#4C44B9', '#263077']}
      style={styles.container}
    >
      <View style={styles.backgroundElements}>
        <Animated.View style={[styles.blob, { top: '5%', right: '10%', opacity: 0.2 }]}>

        </Animated.View>
        <Animated.View style={[styles.blob, { bottom: '10%', left: '5%', opacity: 0.3 }]}>

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
          <Text style={styles.headerTitle}>Who's Setting Up A.M.I.E?</Text>
          <Text style={styles.headerSubtitle}>Select who will be using the app</Text>
        </View>
      </Animated.View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.illustrationContainer}>

        </View>

        <View style={styles.optionsContainer}>
          <Animated.View 
            style={[
              styles.optionCard,
              { 
                opacity: optionsAnim[0],
                transform: [{ translateY: optionsAnim[0].interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })}]
              },
              userType === 'patient' && styles.optionCardSelected
            ]}
          >
            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => setUserType('patient')}
              activeOpacity={0.9}
            >
              <BlurView intensity={20} tint="light" style={styles.optionBlur}>
                <View style={styles.optionIcon}>

                </View>
                <Text style={styles.optionText}>I am the Patient</Text>
                {userType === 'patient' && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={24} color="#7B6CFF" />
                  </View>
                )}
              </BlurView>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View 
            style={[
              styles.optionCard,
              { 
                opacity: optionsAnim[1],
                transform: [{ translateY: optionsAnim[1].interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })}]
              },
              userType === 'caregiver' && styles.optionCardSelected
            ]}
          >
            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => setUserType('caregiver')}
              activeOpacity={0.9}
            >
              <BlurView intensity={20} tint="light" style={styles.optionBlur}>
                <View style={styles.optionIcon}>

                </View>
                <Text style={styles.optionText}>I'm a Family Member or Caregiver</Text>
                {userType === 'caregiver' && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={24} color="#7B6CFF" />
                  </View>
                )}
              </BlurView>
            </TouchableOpacity>
          </Animated.View>

          {userType === 'caregiver' && (
            <Animated.View 
              style={[
                styles.caregiverInfoContainer,
                { 
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <BlurView intensity={15} tint="light" style={styles.caregiverInfoBlur}>
                <Text style={styles.caregiverInfoTitle}>Your Information</Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Your Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your name"
                    placeholderTextColor="#A9A9FC"
                    value={caregiverName}
                    onChangeText={setCaregiverName}
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Relationship to Patient</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="E.g., Son, Daughter, Nurse"
                    placeholderTextColor="#A9A9FC"
                    value={relation}
                    onChangeText={setRelation}
                  />
                </View>
              </BlurView>
            </Animated.View>
          )}
        </View>
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
          style={[
            styles.button,
            (!userType || (userType === 'caregiver' && (!caregiverName || !relation))) && styles.buttonDisabled
          ]}
          onPress={handleContinue}
          disabled={!userType || (userType === 'caregiver' && (!caregiverName || !relation))}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#7B6CFF', '#5E54CC']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

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
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#CCCCFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  illustrationContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  illustration: {
    width: 300,
    height: 200,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  optionCard: {
    marginBottom: 15,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  optionCardSelected: {
    borderColor: '#7B6CFF',
    borderWidth: 2,
    shadowColor: "#7B6CFF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  optionButton: {
    width: '100%',
  },
  optionBlur: {
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  optionText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  checkmark: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
  },
  caregiverInfoContainer: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  caregiverInfoBlur: {
    padding: 20,
    borderRadius: 16,
  },
  caregiverInfoTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 15,
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
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(38, 48, 119, 0.8)',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  button: {
    height: 60,
    borderRadius: 30,
    shadowColor: "#7B6CFF",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    height: '100%',
    width: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
});
