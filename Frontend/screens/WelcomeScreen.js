import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Dimensions,
  Image 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { BlurView } from 'expo-blur';
import { SharedElement } from 'react-navigation-shared-element';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={['#4C44B9', '#263077']}
      style={styles.container}
    >
      <View style={styles.backgroundElements}>
        <Animated.View style={[styles.blob, { top: '10%', left: '5%', opacity: 0.3 }]}>

        </Animated.View>
        <Animated.View style={[styles.blob, { bottom: '15%', right: '8%', opacity: 0.2 }]}>
          
        </Animated.View>
      </View>

      <Animated.View 
        style={[
          styles.contentContainer, 
          { 
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ] 
          }
        ]}
      >
        <View style={styles.logoContainer}>
          <SharedElement id="logo">

          </SharedElement>
        </View>

        <Text style={styles.title}>A.M.I.E</Text>
        <Text style={styles.subtitle}>Alzheimer's Memory & Identity Enhancer</Text>
        
        <View style={styles.descriptionContainer}>
          <BlurView intensity={15} tint="light" style={styles.blur}>
            <Text style={styles.description}>
              A compassionate companion designed to preserve memories and enhance quality of life for those with Alzheimer's.
            </Text>
          </BlurView>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('UserType')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#7B6CFF', '#5E54CC']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>Get Started</Text>
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
  },
  blob: {
    position: 'absolute',
  },
  contentContainer: {
    width: '88%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 42,
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    color: '#E0E0FF',
    textAlign: 'center',
    marginBottom: 40,
  },
  descriptionContainer: {
    width: '100%',
    marginBottom: 40,
    borderRadius: 16,
    overflow: 'hidden',
  },
  blur: {
    padding: 20,
    borderRadius: 16,
  },
  description: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  button: {
    width: '90%',
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
