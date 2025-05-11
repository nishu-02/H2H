// screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { auth, signOut } from '../api/firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Set user name
    if (auth.currentUser?.displayName) {
      setUserName(auth.currentUser.displayName.split(' ')[0]);
    }

    // Set current time in 12-hour format
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
      setCurrentTime(`${hours}:${formattedMinutes} ${ampm}`);

      // Set current date in a easily readable format
      const options = { weekday: 'long', month: 'long', day: 'numeric' };
      setCurrentDate(now.toLocaleDateString('en-US', options));
    };

    updateTime();
    const timeInterval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(timeInterval);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigation.navigate('LoginScreen');
    } catch (error) {
      console.error('Sign-out error:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" translucent />
      <SafeAreaView style={styles.safeAreaTop} />
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#1E3A5F', '#2C5282']}
          style={styles.background}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Memory Patterns Background */}
        <View style={styles.patternContainer}>
          <View style={[styles.memoryPattern, { top: '10%', left: '5%' }]} />
          <View style={[styles.memoryPattern, { top: '30%', right: '7%' }]} />
          <View style={[styles.memoryPattern, { bottom: '25%', left: '15%' }]} />
          <View style={[styles.memoryPattern, { bottom: '10%', right: '10%' }]} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header with Memory Aid Information */}
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <View style={styles.timeContainer}>
                <FontAwesome5 name="clock" size={18} color="#A0C4FF" style={styles.clockIcon} />
                <Text style={styles.timeText}>{currentTime}</Text>
              </View>
              <Text style={styles.dateText}>{currentDate}</Text>
              <Text style={styles.welcomeText}>
                Welcome{userName ? `, ${userName}` : ''}
              </Text>
            </View>

            <View style={styles.logoContainer} onPress={() => navigation.navigate('ProfileScreen')}>
              <View style={styles.logoBackground}>
                <Text style={styles.logoText} onPress={() => navigation.navigate('ProfileScreen')}>A</Text>
              </View>
            </View>
          </View>

          {/* App Title with Neuron Design */}
          <View style={styles.titleContainer}>
            <View style={styles.neuronLeft} />
            <Text style={styles.title}>AMIE</Text>
            <View style={styles.neuronRight} />
          </View>

          <Text style={styles.subtitle}>
            Assistant for Memory, Identity & Emotion
          </Text>

          {/* Memory Status Card */}
          <View style={styles.memoryStatusCard}>
            <View style={styles.statusIconContainer}>
              <FontAwesome5 name="brain" size={28} color="#FFF" solid />
            </View>
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>Memory Companion Active</Text>
              <Text style={styles.statusDescription}>
                Your assistant is helping you remember important details and stay connected with loved ones
              </Text>
            </View>
          </View>

          {/* Quick Access Memory Tools */}
          <View style={styles.quickToolsContainer}>
            <Text style={styles.sectionTitle}>Memory Tools</Text>
            <View style={styles.quickTools}>
              <TouchableOpacity style={styles.quickTool} onPress={() => navigation.navigate('ReminderScreen')}>
                <View style={styles.quickToolIcon}>
                  <FontAwesome5 name="bell" size={22} color="#FFF" solid />
                </View>
                <Text style={styles.quickToolText}>Reminders</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickTool} onPress={() => navigation.navigate('AudioUploadScreen')}>
                <View style={styles.quickToolIcon}>
                  <FontAwesome5 name="microphone" size={22} color="#FFF" solid />
                </View>
                <Text style={styles.quickToolText}>Voice</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickTool} onPress={() => navigation.navigate('MemoryVault')}>
                <View style={styles.quickToolIcon}>
                  <FontAwesome5 name="user" size={22} color="#FFF" solid />
                </View>
                <Text style={styles.quickToolText}>Add Faces</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Memory Support Features */}
          <Text style={styles.sectionTitle}>Memory Support</Text>
          <View style={styles.featuresContainer}>
            {/* Memory Quiz Card for Alzheimer's Patients */}
            <TouchableOpacity
              style={styles.featureCard}
              onPress={() => navigation.navigate('MemoryQuiz')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#805AD5', '#6B46C1']} // Calmer and memory-supporting tones
                style={styles.cardBackground}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <FontAwesome5 name="question-circle" size={22} color="#FFF" solid />
                  </View>
                  <Text style={styles.cardTitle}>Memory Quiz</Text>
                </View>
                <Text style={styles.cardDescription}>
                  Simple quizzes to stimulate memory and support cognitive health
                </Text>
                <View style={styles.cardFooter}>
                  <View style={styles.connectionDots}>
                    <View style={styles.dot} />
                    <View style={styles.dotLine} />
                    <View style={styles.dot} />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Audio Memories Card */}
            <TouchableOpacity
              style={styles.featureCard}
              onPress={() => navigation.navigate('AudioUploadScreen')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#38B2AC', '#319795']}
                style={styles.cardBackground}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <FontAwesome5 name="microphone" size={22} color="#FFF" solid />
                  </View>
                  <Text style={styles.cardTitle}>Voice Memories</Text>
                </View>
                <Text style={styles.cardDescription}>
                  Record stories and memories for later recall
                </Text>
                <View style={styles.cardFooter}>
                  <View style={styles.connectionDots}>
                    <View style={styles.dot} />
                    <View style={styles.dotLine} />
                    <View style={styles.dot} />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Face Recognition Card */}
            <TouchableOpacity
              style={styles.featureCard}
              onPress={() => navigation.navigate('FaceRecognitionScreen')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#0F2027', '#805AD5', '#2C5364']} // You can keep or customize gradient
                style={styles.cardBackground}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <FontAwesome5 name="camera" size={22} color="#FFF" solid />
                  </View>
                  <Text style={styles.cardTitle}>Face Recognition</Text>
                </View>
                <Text style={styles.cardDescription}>
                  Scan and identify faces using advanced recognition technology
                </Text>
                <View style={styles.cardFooter}>
                  <View style={styles.connectionDots}>
                    <View style={styles.dot} />
                    <View style={styles.dotLine} />
                    <View style={styles.dot} />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/*  Memory Recall Assistant Card */}
            <TouchableOpacity
              style={styles.featureCard}
              onPress={() => navigation.navigate('MemoryQAScreen')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}  // Soothing memory colors
                style={styles.cardBackground}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <FontAwesome5 name="brain" size={22} color="#FFF" solid />
                  </View>
                  <Text style={styles.cardTitle}>Memory Recall</Text>
                </View>
                <Text style={styles.cardDescription}>
                  Recall past events and moments by just saying a word.
                </Text>
                <View style={styles.cardFooter}>
                  <View style={styles.connectionDots}>
                    <View style={styles.dot} />
                    <View style={styles.dotLine} />
                    <View style={styles.dot} />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>


            {/* Photo Gallery Card */}
            <TouchableOpacity
              style={styles.featureCard}
              onPress={() => navigation.navigate('WallpaperUploadScreen')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#ED64A6', '#D53F8C']}
                style={styles.cardBackground}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <FontAwesome5 name="images" size={22} color="#FFF" solid />
                  </View>
                  <Text style={styles.cardTitle}>Memory Gallery</Text>
                </View>
                <Text style={styles.cardDescription}>
                  Visual memories and face recognition support
                </Text>
                <View style={styles.cardFooter}>
                  <View style={styles.connectionDots}>
                    <View style={styles.dot} />
                    <View style={styles.dotLine} />
                    <View style={styles.dot} />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Random Memory Moment Card */}
            <TouchableOpacity
              style={styles.featureCard}
              onPress={() => navigation.navigate('RandomEventScreen')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#38A169', '#2F855A']}
                style={styles.cardBackground}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <FontAwesome5 name="random" size={22} color="#FFF" solid />
                  </View>
                  <Text style={styles.cardTitle}>Memory Moments</Text>
                </View>
                <Text style={styles.cardDescription}>
                  Rediscover random memories with voice narration
                </Text>
                <View style={styles.cardFooter}>
                  <View style={styles.connectionDots}>
                    <View style={styles.dot} />
                    <View style={styles.dotLine} />
                    <View style={styles.dot} />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Emotional Support & Settings */}
          <Text style={styles.sectionTitle}>Customization & Settings</Text>
          <View style={styles.featuresContainer}>
            {/* Home Display Card */}
            <TouchableOpacity
              style={styles.featureCard}
              onPress={() => navigation.navigate('HomeScreenWallpaper')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#F6AD55', '#ED8936']}
                style={styles.cardBackground}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <FontAwesome5 name="home" size={22} color="#FFF" solid />
                  </View>
                  <Text style={styles.cardTitle}>Home Display</Text>
                </View>
                <Text style={styles.cardDescription}>
                  Customize display for comfort and recognition
                </Text>
                <View style={styles.cardFooter}>
                  <View style={styles.connectionDots}>
                    <View style={styles.dot} />
                    <View style={styles.dotLine} />
                    <View style={styles.dot} />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Permissions Card */}
            <TouchableOpacity
              style={styles.featureCard}
              onPress={() => navigation.navigate('PermissionsDebug')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#718096', '#4A5568']}
                style={styles.cardBackground}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <FontAwesome5 name="cog" size={22} color="#FFF" solid />
                  </View>
                  <Text style={styles.cardTitle}>Settings</Text>
                </View>
                <Text style={styles.cardDescription}>
                  Permissions, privacy, and caregiver access
                </Text>
                <View style={styles.cardFooter}>
                  <View style={styles.connectionDots}>
                    <View style={styles.dot} />
                    <View style={styles.dotLine} />
                    <View style={styles.dot} />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

          </View>

          {/* Daily Memory Tip */}
          <View style={styles.memoryTipContainer}>
            <View style={styles.memoryTipHeader}>
              <FontAwesome5 name="lightbulb" size={18} color="#FFD700" solid />
              <Text style={styles.memoryTipTitle}>Memory Tip</Text>
            </View>
            <Text style={styles.memoryTipText}>
              Regular routines help strengthen memory. Try to perform daily
              activities at the same time each day.
            </Text>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.9}
          >
            <FontAwesome5 name="sign-out-alt" size={20} color="#1E3A5F" style={styles.signOutIcon} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          {/* Footer with Brain Health Message */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>AMIE v1.0</Text>
            <View style={styles.footerDivider}>
              <View style={styles.footerLine} />
              <FontAwesome5 name="brain" size={14} color="#A0C4FF" style={styles.footerIcon} />
              <View style={styles.footerLine} />
            </View>
            <Text style={styles.footerSubtext}>Supporting cognitive health</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeAreaTop: {
    flex: 0,
    backgroundColor: '#1E3A5F',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#1E3A5F',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  patternContainer: {
    position: 'absolute',
    width: width,
    height: height,
    overflow: 'hidden',
  },
  memoryPattern: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 15,
    borderColor: 'rgba(160, 196, 255, 0.08)',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 20, // Increased padding at the top
    paddingBottom: 25,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  clockIcon: {
    marginRight: 6,
  },
  timeText: {
    fontSize: 16,
    color: '#A0C4FF',
    fontWeight: '500',
  },
  dateText: {
    fontSize: 14,
    color: '#E2E8F0',
    marginBottom: 6,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBackground: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#4299E1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  neuronLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(160, 196, 255, 0.2)',
    marginRight: 10,
  },
  neuronRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(160, 196, 255, 0.2)',
    marginLeft: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#A0C4FF',
    textAlign: 'center',
    marginBottom: 22,
  },
  memoryStatusCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(66, 153, 225, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 22,
    borderLeftWidth: 4,
    borderLeftColor: '#4299E1',
  },
  statusIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4299E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  statusTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  statusDescription: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
  },
  quickToolsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    paddingLeft: 2,
  },
  quickTools: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickTool: {
    width: '30%',
    backgroundColor: 'rgba(66, 153, 225, 0.15)',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  quickToolIcon: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#4299E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickToolText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  featureCard: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.5,
  },
  cardBackground: {
    height: 180,
    padding: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  cardDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
    marginBottom: 'auto',
  },
  cardFooter: {
    marginTop: 'auto',
  },
  connectionDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  dotLine: {
    height: 2,
    width: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 3,
  },
  memoryTipContainer: {
    backgroundColor: 'rgba(237, 137, 54, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ED8936',
  },
  memoryTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  memoryTipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FBD38D',
    marginLeft: 8,
  },
  memoryTipText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  signOutIcon: {
    marginRight: 10,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E3A5F',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  footerText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  footerDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    width: '60%',
  },
  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(160, 196, 255, 0.3)',
  },
  footerIcon: {
    marginHorizontal: 10,
  },
  footerSubtext: {
    fontSize: 13,
    color: '#A0C4FF',
  },
});