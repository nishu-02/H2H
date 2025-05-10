import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');

export default function SummaryScreen({ navigation, route }) {
  const { userType, caregiverName, relation, patientInfo, memories } = route.params || {};
  
  const [sound, setSound] = useState();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {

    playWelcomeSound();
    

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
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 1200,
        delay: 300,
        useNativeDriver: true,
      })
    ]).start();


    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();
    
    // Trigger success haptic feedback
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1000);
    
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);
  
  const playWelcomeSound = async () => {
    try {

      const soundAsset = require('../assets/sounds/welcome-chime.mp3');
      if (!soundAsset) {
        console.log('Sound asset not found');
        return;
      }
      
      const { sound } = await Audio.Sound.createAsync(
        soundAsset,
        { shouldPlay: true, volume: 0.5 }
      );
      setSound(sound);
    } catch (error) {
      console.log('Error loading sound', error);
      // Continue execution even if sound fails to load
    }
  };

  const handleGoToHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to home screen
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  const getPatientDisplayName = () => {
    if (patientInfo) {
      return patientInfo.nickname || patientInfo.name || 'User';
    }
    return 'User';
  };

  return (
    <LinearGradient
      colors={['#4C44B9', '#263077']}
      style={styles.container}
    >
      <View style={styles.backgroundElements}>
        <Animated.View 
          style={[
            styles.successBackground,
            {
              opacity: successAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.8]
              }),
              transform: [
                { scale: successAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1.2]
                })}
              ]
            }
          ]}
        />
      </View>

      <Animated.View 
        style={[
          styles.contentContainer, 
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.headerContainer}>
          <Animated.View 
            style={[
              styles.logoContainer,
              {
                transform: [{ scale: pulseAnim }]
              }
            ]}
          >
            <BlurView intensity={15} tint="light" style={styles.logoBlur} />
          </Animated.View>
          
          <Text style={styles.welcomeText}>Welcome to A.M.I.E</Text>
          <Text style={styles.patientName}>{getPatientDisplayName()}</Text>
          
          <Text style={styles.setupCompleteText}>Setup Complete!</Text>
        </View>
        
        <View style={styles.summaryContainer}>
          <BlurView intensity={15} tint="light" style={styles.summaryBlur}>
            <Text style={styles.summaryTitle}>Your Journey Begins</Text>
            
            <View style={styles.summaryItem}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="person" size={20} color="#7B6CFF" />
              </View>
              <Text style={styles.summaryText}>
                Profile created {userType === 'caregiver' ? `by ${caregiverName} (${relation})` : 'successfully'}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="images" size={20} color="#7B6CFF" />
              </View>
              <Text style={styles.summaryText}>
                {memories && memories.length > 0 
                  ? `${memories.length} ${memories.length === 1 ? 'memory' : 'memories'} added to Memory Vault` 
                  : 'Memory Vault ready for your precious memories'}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="settings" size={20} color="#7B6CFF" />
              </View>
              <Text style={styles.summaryText}>
                Personalized settings configured
              </Text>
            </View>
            
            <View style={styles.lastSummaryItem}>
              <Text style={styles.quoteSummary}>
                "A.M.I.E is designed to create a calm and familiar space for your journey."
              </Text>
            </View>
            
            <View style={styles.accessibilityOptions}>
              <TouchableOpacity style={styles.accessibilityButton} activeOpacity={0.8}>
                <Ionicons name="volume-high" size={18} color="#FFFFFF" />
                <Text style={styles.accessibilityText}>Audio Guide</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.accessibilityButton} activeOpacity={0.8}>
                <MaterialIcons name="text-format" size={18} color="#FFFFFF" />
                <Text style={styles.accessibilityText}>Text Size</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.accessibilityButton} activeOpacity={0.8}>
                <Ionicons name="color-palette" size={18} color="#FFFFFF" />
                <Text style={styles.accessibilityText}>Theme</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
        
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleGoToHome}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#7B6CFF', '#5E54CC']}
            style={styles.startButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.startButtonText}>Start Your Journey</Text>
            <Ionicons name="arrow-forward" size={22} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBackground: {
    position: 'absolute',
    width: width * 2,
    height: width * 2,
    borderRadius: width,
    backgroundColor: 'rgba(123, 108, 255, 0.2)',
  },
  contentContainer: {
    width: '90%',
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    shadowColor: "#7B6CFF",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 10,
    backgroundColor: 'rgba(123, 108, 255, 0.3)',
  },
  logoBlur: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  welcomeText: {
    fontFamily: Platform.OS === 'ios' ? 'Poppins-Regular' : 'Poppins-Regular',
    fontSize: 18,
    color: '#CCCCFF',
    marginBottom: 5,
  },
  patientName: {
    fontFamily: Platform.OS === 'ios' ? 'Poppins-Bold' : 'Poppins-Bold',
    fontSize: 28,
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  setupCompleteText: {
    fontFamily: Platform.OS === 'ios' ? 'Poppins-Medium' : 'Poppins-Medium',
    fontSize: 20,
    color: '#FFFFFF',
    backgroundColor: 'rgba(123, 108, 255, 0.3)',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 15,
  },
  summaryContainer: {
    width: '100%',
    marginBottom: 30,
    borderRadius: 20,
    overflow: 'hidden',
  },
  summaryBlur: {
    padding: 20,
    borderRadius: 20,
  },
  summaryTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Poppins-Bold' : 'Poppins-Bold',
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 15,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E9E6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  summaryText: {
    flex: 1,
    fontSize: 16,
    color: '#EFEFFF',
    fontFamily: Platform.OS === 'ios' ? 'Poppins-Regular' : 'Poppins-Regular',
  },
  lastSummaryItem: {
    marginTop: 15,
    marginBottom: 10,
  },
  quoteSummary: {
    fontStyle: 'italic',
    fontSize: 14,
    color: '#DDDDFF',
    fontFamily: Platform.OS === 'ios' ? 'Poppins-Italic' : 'Poppins-Italic',
    textAlign: 'center',
  },
  accessibilityOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  accessibilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7B6CFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  accessibilityText: {
    marginLeft: 6,
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Poppins-Medium' : 'Poppins-Medium',
  },
  startButton: {
    width: '100%',
  },
  startButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Poppins-Bold' : 'Poppins-Bold',
  },
});