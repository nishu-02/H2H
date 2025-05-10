import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, StatusBar, Alert, ScrollView, TouchableOpacity } from 'react-native';
import {
  Appbar, Button, Snackbar, Dialog, Portal, Paragraph, Text, 
  Switch, Card, Title, ProgressBar, List, RadioButton, Surface
} from 'react-native-paper';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { auth } from '../api/firebaseConfig';
import { createAudioMemory } from '../api/apiService';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

// Constants
const BACKGROUND_RECORDING_TASK = 'background-recording-task';
const DEFAULT_SEGMENT_DURATION = 1; // minutes

// Helper function to check if current time is within range
const isTimeInRange = (current, start, end) => {
  try {
    const currentMinutes = current.getHours() * 60 + current.getMinutes();
    let startMinutes = start.getHours() * 60 + start.getMinutes();
    let endMinutes = end.getHours() * 60 + end.getMinutes();
    
    // Handle overnight ranges (e.g., 10 PM to 7 AM)
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
      if (currentMinutes < startMinutes) {
        return currentMinutes + (24 * 60) >= startMinutes && currentMinutes + (24 * 60) <= endMinutes;
      }
    }
    
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } catch (error) {
    console.error("Error in isTimeInRange:", error);
    return false;
  }
};

// Define background task
TaskManager.defineTask(BACKGROUND_RECORDING_TASK, async () => {
  try {
    // Read settings file
    const fileInfo = await FileSystem.getInfoAsync(
      FileSystem.documentDirectory + 'listeningSettings.json'
    );
    
    if (!fileInfo.exists) {
      console.log("Settings file doesn't exist");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    const settings = JSON.parse(await FileSystem.readAsStringAsync(
      FileSystem.documentDirectory + 'listeningSettings.json'
    ));
    
    if (settings.isEnabled) {
      const now = new Date();
      const startTime = new Date(settings.startTime);
      const endTime = new Date(settings.endTime);
      
      if (isTimeInRange(now, startTime, endTime)) {
        await recordAudioSegment(
          settings.segmentDuration || DEFAULT_SEGMENT_DURATION, 
          settings.environment || 'Family Conversation'
        );
        return BackgroundFetch.BackgroundFetchResult.NewData;
      }
    }
    
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error("Background task error:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Record audio segment
const recordAudioSegment = async (duration, environment) => {
  let recording = null;
  try {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') return;
    
    const recordingOptions = {
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
      },
      ios: {
        extension: '.m4a',
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
    };
    
    const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);
    recording = newRecording;
    
    // Record for specified duration
    await new Promise(resolve => setTimeout(resolve, duration * 60 * 1000));
    
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    
    // Upload the recording
    await uploadRecording(uri, environment);
  } catch (error) {
    console.error("Error in recording segment:", error);
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (stopError) {
        console.error("Error stopping recording:", stopError);
      }
    }
  }
};

// Upload recording
const uploadRecording = async (uri, environment) => {
  if (!uri) {
    console.error("No URI provided for upload");
    return;
  }
  
  const uid = auth.currentUser?.uid;
  if (!uid) {
    console.error("No user authenticated");
    return;
  }
  
  try {
    console.log("Starting upload for file:", uri);
    
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      console.error("File doesn't exist:", uri);
      return;
    }
    
    console.log("File info for upload:", fileInfo);
    
    // Get file extension
    const filename = uri.split('/').pop();
    const extension = filename.split('.').pop().toLowerCase();
    const mimeType = extension === 'm4a' ? 'audio/m4a' : 
                    extension === 'mp3' ? 'audio/mpeg' : 
                    extension === 'wav' ? 'audio/wav' : 'audio/mpeg';
    
    // Create FormData - Using uri parameter
    const formData = new FormData();
    formData.append('audio_file', {
      uri: uri,
      name: `recording_${Date.now()}.${extension}`,
      type: mimeType,
    });
    
    formData.append('firebase_uid', uid);
    formData.append('environment', environment);
    formData.append('recording_type', 'passive');
    
    console.log("FormData created with file:", uri);
    console.log("FormData keys:", [...formData.keys()]);
    
    const response = await createAudioMemory(uid, formData);
    console.log("Upload successful:", response);
    return response;
  } catch (error) {
    console.error('Upload error:', error);
    console.error('Error details:', error.response?.data);
    throw error;
  }
};

const PassiveListeningScreen = ({ navigation }) => {
  // State
  const [startTime, setStartTime] = useState(new Date(new Date().setHours(22, 0, 0, 0))); // 10 PM
  const [endTime, setEndTime] = useState(new Date(new Date().setHours(7, 0, 0, 0))); // 7 AM
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [environment, setEnvironment] = useState('Family Conversation');
  const [segmentDuration, setSegmentDuration] = useState(DEFAULT_SEGMENT_DURATION);
  const [showEnvironmentMenu, setShowEnvironmentMenu] = useState(false);
  const [showSegmentMenu, setShowSegmentMenu] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [recording, setRecording] = useState(null);
  const [manualRecording, setManualRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  // Refs
  const audioLevelInterval = useRef(null);
  const recordingInterval = useRef(null);
  const recordingTimeInterval = useRef(null);
  
  // Environment Options
  const environmentOptions = [
    'Family Conversation',
    'Work Meeting',
    'Class Lecture',
    'Personal Notes',
    'Interview',
    'Other'
  ];
  
  // Segment Duration Options
  const segmentDurationOptions = [1, 2, 5, 10, 15, 30];
  
  // Effects
  useEffect(() => {
    checkAuth();
    loadSettings();
    registerForPushNotifications();
    
    return cleanupResources;
  }, []);
  
  useEffect(() => {
    if (isEnabled) {
      saveSettings();
    }
  }, [startTime, endTime, environment, segmentDuration, isEnabled]);
  
  // Functions
  const checkAuth = () => {
    if (!auth.currentUser) {
      Alert.alert(
        "Authentication Error",
        "You're not logged in. Please log in and try again.",
        [{ text: "OK", onPress: () => navigation.navigate('Login') }]
      );
    }
  };
  
  const cleanupResources = () => {
    if (audioLevelInterval.current) clearInterval(audioLevelInterval.current);
    if (recordingInterval.current) clearInterval(recordingInterval.current);
    if (recordingTimeInterval.current) clearInterval(recordingTimeInterval.current);
    
    if (recording) {
      try {
        recording.stopAndUnloadAsync();
      } catch (error) {
        console.error("Error stopping recording during cleanup:", error);
      }
    }
  };
  
  const registerForPushNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        showSnackbar('Notification permissions are required for alerts');
        return;
      }
      
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };
  
  const saveSettings = async () => {
    try {
      const settings = {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        isEnabled,
        environment,
        segmentDuration,
      };
      
      await FileSystem.writeAsStringAsync(
        FileSystem.documentDirectory + 'listeningSettings.json',
        JSON.stringify(settings)
      );
      
      console.log("Settings saved:", settings);
    } catch (error) {
      console.error('Error saving settings:', error);
      showSnackbar('Failed to save settings');
    }
  };
  
  const loadSettings = async () => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(
        FileSystem.documentDirectory + 'listeningSettings.json'
      );
      
      if (fileInfo.exists) {
        const settings = JSON.parse(await FileSystem.readAsStringAsync(
          FileSystem.documentDirectory + 'listeningSettings.json'
        ));
        
        setStartTime(new Date(settings.startTime));
        setEndTime(new Date(settings.endTime));
        setIsEnabled(settings.isEnabled);
        setEnvironment(settings.environment || 'Family Conversation');
        setSegmentDuration(settings.segmentDuration || DEFAULT_SEGMENT_DURATION);
        
        if (settings.isEnabled) {
          const now = new Date();
          if (isTimeInRange(now, new Date(settings.startTime), new Date(settings.endTime))) {
            startListening();
          } else {
            setRecordingStatus('scheduled');
          }
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showSnackbar('Failed to load settings');
    }
  };
  
  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };
  
  const formatTime = (date) => {
    try {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return "Invalid time";
    }
  };
  
  const formatRecordingTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  const toggleListening = async () => {
    if (isEnabled) {
      stopListening();
      setIsEnabled(false);
      await unregisterBackgroundTask();
      showSnackbar('Passive listening disabled');
      await saveSettings();
    } else {
      setDialogVisible(true);
    }
  };
  
  // Manual recording function
  const toggleManualRecording = async () => {
    if (manualRecording) {
      // Stop and send
      await stopAndSendRecording();
    } else {
      // Start manual recording
      await startManualRecording();
    }
  };
  
  // Start manual recording function
  const startManualRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        showSnackbar('Permission to access microphone is required!');
        return;
      }
      
      // Stop any ongoing automatic recording
      if (recording) {
        await recording.stopAndUnloadAsync();
      }
      
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };
      
      const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(newRecording);
      setManualRecording(true);
      setIsListening(true);
      setRecordingTime(0);
      
      // Start audio visualization 
      startAudioVisualization();
      
      // Track recording time
      recordingTimeInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      showSnackbar('Manual recording started');
    } catch (error) {
      console.error('Error starting manual recording:', error);
      showSnackbar('Failed to start recording: ' + error.message);
    }
  };
  
  // Stop and send recording function
  const stopAndSendRecording = async () => {
    try {
      if (recording) {
        setUploading(true);
        showSnackbar('Preparing to upload audio...');
        
        if (recordingTimeInterval.current) {
          clearInterval(recordingTimeInterval.current);
          recordingTimeInterval.current = null;
        }
        
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        
        console.log('Recording stopped, URI:', uri);
        
        // Upload the recording
        await uploadRecording(uri, environment);
        
        setRecording(null);
        setManualRecording(false);
        setIsListening(false);
        setAudioLevel(0);
        setRecordingTime(0);
        
        if (audioLevelInterval.current) {
          clearInterval(audioLevelInterval.current);
          audioLevelInterval.current = null;
        }
        
        showSnackbar('Recording sent successfully');
      }
    } catch (error) {
      console.error('Error stopping and sending recording:', error);
      showSnackbar('Error sending recording: ' + error.message);
    } finally {
      setUploading(false);
    }
  };
  
  const startListening = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        showSnackbar('Permission to access microphone is required!');
        return;
      }
      
      setPermissionDenied(false);
      
      // Start audio visualization
      startAudioVisualization();
      
      // Check if we're in the listening window
      const now = new Date();
      if (isTimeInRange(now, startTime, endTime)) {
        setIsListening(true);
        setRecordingStatus('active');
        startRecordingCycle();
      } else {
        setIsListening(false);
        setRecordingStatus('scheduled');
      }
      
      // Schedule notification
      scheduleListeningNotification();
      
      showSnackbar('Passive listening enabled');
    } catch (error) {
      console.error('Error starting listening:', error);
      showSnackbar('Failed to start listening: ' + error.message);
    }
  };
  
  const stopListening = () => {
    try {
      if (audioLevelInterval.current) {
        clearInterval(audioLevelInterval.current);
        audioLevelInterval.current = null;
      }
      
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }
      
      if (recordingTimeInterval.current) {
        clearInterval(recordingTimeInterval.current);
        recordingTimeInterval.current = null;
      }
      
      if (recording) {
        recording.stopAndUnloadAsync();
        setRecording(null);
      }
      
      setIsListening(false);
      setRecordingStatus('idle');
      setAudioLevel(0);
      setManualRecording(false);
      setRecordingTime(0);
    } catch (error) {
      console.error('Error stopping listening:', error);
      showSnackbar('Error stopping listening: ' + error.message);
    }
  };
  
  const startAudioVisualization = () => {
    if (audioLevelInterval.current) {
      clearInterval(audioLevelInterval.current);
    }
    
    audioLevelInterval.current = setInterval(() => {
      if (isListening) {
        setAudioLevel(Math.random() * 0.7 + 0.1);
      } else {
        setAudioLevel(0);
      }
    }, 100);
  };
  
  const startRecordingCycle = async () => {
    try {
      await startRecordingSegment();
      
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      
      recordingInterval.current = setInterval(checkRecordingStatus, 10000); // Check every 10 seconds
    } catch (error) {
      console.error('Error in recording cycle:', error);
      showSnackbar('Error starting recording cycle');
    }
  };
  
  const checkRecordingStatus = async () => {
    try {
      // Don't interfere with manual recording
      if (manualRecording) return;
      
      const now = new Date();
      
      // Check if we're still in the listening window
      if (isTimeInRange(now, startTime, endTime)) {
        if (recordingStatus !== 'active') {
          setIsListening(true);
          setRecordingStatus('active');
          await startRecordingSegment();
        }
      } else {
        if (recordingStatus === 'active') {
          setIsListening(false);
          setRecordingStatus('scheduled');
          if (recording) {
            await recording.stopAndUnloadAsync();
            await uploadRecording(recording.getURI(), environment);
            setRecording(null);
          }
        }
      }
    } catch (error) {
      console.error('Error in recording status check:', error);
    }
  };
  
  const startRecordingSegment = async () => {
    try {
      // Don't start a new segment if manual recording is active
      if (manualRecording) return;
      
      if (recording) {
        await recording.stopAndUnloadAsync();
        await uploadRecording(recording.getURI(), environment);
        setRecording(null);
      }
      
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };
      
      const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(newRecording);
      
      // Schedule to stop after segment duration
      setTimeout(async () => {
        try {
          // Don't interrupt manual recording
          if (manualRecording) return;
          
          if (newRecording) {
            await newRecording.stopAndUnloadAsync();
            await uploadRecording(newRecording.getURI(), environment);
            
            // Start next segment if still in window
            if (isEnabled) {
              const now = new Date();
              if (isTimeInRange(now, startTime, endTime)) {
                startRecordingSegment();
              }
            }
          }
        } catch (error) {
          console.error('Error stopping segment:', error);
        }
      }, segmentDuration * 60 * 1000);
    } catch (error) {
      console.error('Error starting recording segment:', error);
    }
  };
  
  const scheduleListeningNotification = async () => {
    try {
      // Cancel existing notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Schedule start notification
      const startTimeToday = new Date(startTime);
      startTimeToday.setFullYear(new Date().getFullYear());
      startTimeToday.setMonth(new Date().getMonth());
      startTimeToday.setDate(new Date().getDate());
      
      if (startTimeToday < new Date()) {
        startTimeToday.setDate(startTimeToday.getDate() + 1);
      }
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Passive Listening Started',
          body: `A.M.I.E. is now listening in ${environment} mode`,
        },
        trigger: {
          date: startTimeToday,
          repeats: true,
        },
      });
      
      // Schedule end notification
      const endTimeToday = new Date(endTime);
      endTimeToday.setFullYear(new Date().getFullYear());
      endTimeToday.setMonth(new Date().getMonth());
      endTimeToday.setDate(new Date().getDate());
      
      if (endTimeToday < new Date()) {
        endTimeToday.setDate(endTimeToday.getDate() + 1);
      }
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Passive Listening Ended',
          body: 'A.M.I.E. has stopped listening',
        },
        trigger: {
          date: endTimeToday,
          repeats: true,
        },
      });
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  };
  
  const registerBackgroundTask = async () => {
    try {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_RECORDING_TASK, {
        minimumInterval: 1 * 60, // 1 minute
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('Background task registered');
    } catch (error) {
      console.error('Error registering background task:', error);
      showSnackbar('Error setting up background task');
    }
  };
  
  const unregisterBackgroundTask = async () => {
    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_RECORDING_TASK);
      console.log('Background task unregistered');
    } catch (error) {
      console.error('Error unregistering background task:', error);
    }
  };
  
  const confirmEnableListening = async () => {
    setDialogVisible(false);
    setIsEnabled(true);
    await saveSettings();
    await registerBackgroundTask();
    startListening();
  };
  
  const onStartTimeChange = (event, selectedTime) => {
    setShowStartPicker(false);
    if (selectedTime) setStartTime(selectedTime);
  };
  
  const onEndTimeChange = (event, selectedTime) => {
    setShowEndPicker(false);
    if (selectedTime) setEndTime(selectedTime);
  };

  const requestMicrophonePermission = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status === 'granted') {
        setPermissionDenied(false);
        showSnackbar('Microphone access granted');
      } else {
        setPermissionDenied(true);
        showSnackbar('Permission to access microphone was denied');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Passive Listening" />
        <Appbar.Action 
          icon="information" 
          onPress={() => Alert.alert(
            "About Passive Listening",
            "This feature allows A.M.I.E. to listen during specific time windows and save audio recordings for later review. All recordings are encrypted and stored securely."
          )} 
        />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Permission Warning */}
        {permissionDenied && (
          <Card style={[styles.card, styles.warningCard]}>
            <Card.Content>
              <Title style={styles.warningTitle}>Microphone Access Required</Title>
              <Paragraph>A.M.I.E. needs microphone access to record audio. Please grant permission to continue.</Paragraph>
              <Button 
                mode="contained" 
                onPress={requestMicrophonePermission}
                style={styles.permissionButton}
              >
                Grant Permission
              </Button>
            </Card.Content>
          </Card>
        )}
        
        {/* Manual Recording Button */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Manual Recording</Title>
            <Paragraph>Quickly record and send audio without scheduling.</Paragraph>
            
            <View style={styles.manualRecordingContainer}>
              {!manualRecording ? (
                <Button
                  icon="microphone"
                  mode="contained"
                  onPress={toggleManualRecording}
                  style={styles.recordButton}
                  disabled={uploading || permissionDenied}
                >
                  Start Recording
                </Button>
              ) : (
                <View style={styles.activeRecordingContainer}>
                  <Text style={styles.recordingTimeText}>
                    {formatRecordingTime(recordingTime)}
                  </Text>
                  <Button
                    icon="send"
                    mode="contained"
                    onPress={toggleManualRecording}
                    style={[styles.recordButton, { backgroundColor: '#E53935' }]}
                    disabled={uploading}
                  >
                    Stop & Send
                  </Button>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
        
        {/* Listening Window Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Listening Window</Title>
            <Paragraph>Set the time range when A.M.I.E. should listen to your environment.</Paragraph>
            
            <View style={styles.timePickerContainer}>
              <View style={styles.timePicker}>
                <Text style={styles.timeLabel}>Start Time</Text>
                <TouchableOpacity 
                  style={styles.timeButton}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={styles.timeText}>{formatTime(startTime)}</Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker
                    value={startTime}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={onStartTimeChange}
                  />
                )}
              </View>
              
              <View style={styles.timePicker}>
                <Text style={styles.timeLabel}>End Time</Text>
                <TouchableOpacity 
                  style={styles.timeButton}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={styles.timeText}>{formatTime(endTime)}</Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker
                    value={endTime}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={onEndTimeChange}
                  />
                )}
              </View>
            </View>
            
            <View style={styles.switchContainer}>
              <Text>Enable Passive Listening</Text>
              <Switch 
                value={isEnabled} 
                onValueChange={toggleListening}
                disabled={permissionDenied}
              />
            </View>
          </Card.Content>
        </Card>
        
        {/* Status Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Listening Status</Title>
            <View style={styles.statusContainer}>
              <View style={styles.statusIndicator}>
              <View 
                  style={[
                    styles.statusLight, 
                    { 
                      backgroundColor: manualRecording ? '#E53935' :
                                       isListening ? '#4CAF50' : 
                                       recordingStatus === 'scheduled' ? '#FFC107' : 
                                       '#9E9E9E' 
                    }
                  ]} 
                />
                <Text style={styles.statusText}>
                  {manualRecording ? 'Manual Recording...' :
                   isListening ? 'Listening...' : 
                   recordingStatus === 'scheduled' ? 'Scheduled' : 
                   'Idle'}
                </Text>
              </View>
              
              <View style={styles.visualizerContainer}>
                <Text style={styles.visualizerLabel}>Audio Level</Text>
                <ProgressBar progress={audioLevel} color="#2196F3" style={styles.visualizer} />
              </View>
              
              {uploading && (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Uploading audio...</Text>
                  <ProgressBar indeterminate color="#2196F3" style={styles.loadingBar} />
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
        
        {/* Settings Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Settings</Title>
            
            <List.Item
              title="Environment"
              description={environment}
              left={props => <List.Icon {...props} icon="microphone" />}
              onPress={() => setShowEnvironmentMenu(true)}
            />
            
            <List.Item
              title="Recording Segments"
              description={`${segmentDuration} minutes per segment`}
              left={props => <List.Icon {...props} icon="timer" />}
              onPress={() => setShowSegmentMenu(true)}
            />
          </Card.Content>
        </Card>
        
        {/* Info Card */}
        <Surface style={styles.infoCard}>
          <Title style={styles.infoTitle}>About Passive Listening</Title>
          <Paragraph style={styles.infoParagraph}>
            When enabled, A.M.I.E. will automatically record audio during your specified time window.
            Recordings are saved in segments and securely uploaded to your account.
          </Paragraph>
          <Paragraph style={styles.infoParagraph}>
            All recordings are encrypted and can only be accessed by authorized users.
            Recordings older than 30 days are automatically deleted.
          </Paragraph>
        </Surface>
      </ScrollView>
      
      {/* Dialogs */}
      <Portal>
        {/* Environment Selection Dialog */}
        <Dialog visible={showEnvironmentMenu} onDismiss={() => setShowEnvironmentMenu(false)}>
          <Dialog.Title>Select Environment</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group onValueChange={value => {
              setEnvironment(value);
              setShowEnvironmentMenu(false);
            }} value={environment}>
              {environmentOptions.map((option) => (
                <RadioButton.Item 
                  key={option} 
                  label={option} 
                  value={option} 
                  style={styles.radioItem}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowEnvironmentMenu(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
        
        {/* Segment Duration Dialog */}
        <Dialog visible={showSegmentMenu} onDismiss={() => setShowSegmentMenu(false)}>
          <Dialog.Title>Select Segment Duration</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group onValueChange={value => {
              setSegmentDuration(parseInt(value));
              setShowSegmentMenu(false);
            }} value={segmentDuration.toString()}>
              {segmentDurationOptions.map((option) => (
                <RadioButton.Item 
                  key={option} 
                  label={`${option} minute${option > 1 ? 's' : ''}`} 
                  value={option.toString()} 
                  style={styles.radioItem}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSegmentMenu(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
        
        {/* Confirmation Dialog */}
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Enable Passive Listening</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              A.M.I.E. will listen during the specified time window and periodically save audio recordings.
              All audio is processed securely and encrypted.
            </Paragraph>
            <Paragraph style={styles.dialogWarningText}>
              Please ensure you have informed everyone in your environment that audio may be recorded.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmEnableListening} mode="contained">Enable</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Snackbar */}
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
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  warningCard: {
    backgroundColor: '#FFF3E0',
  },
  warningTitle: {
    color: '#E65100',
  },
  permissionButton: {
    marginTop: 8,
    backgroundColor: '#FF9800',
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  timePicker: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    marginBottom: 8,
  },
  timeButton: {
    backgroundColor: '#e1e1e1',
    padding: 10,
    borderRadius: 4,
    minWidth: 120,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  statusContainer: {
    marginTop: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLight: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontWeight: '500',
  },
  visualizerContainer: {
    marginVertical: 8,
  },
  visualizerLabel: {
    marginBottom: 4,
    fontSize: 12,
  },
  visualizer: {
    height: 6,
    borderRadius: 3,
  },
  loadingContainer: {
    marginTop: 12,
  },
  loadingText: {
    marginBottom: 4,
    fontSize: 12,
  },
  loadingBar: {
    height: 4,
    borderRadius: 2,
  },
  manualRecordingContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  activeRecordingContainer: {
    alignItems: 'center',
  },
  recordingTimeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recordButton: {
    paddingHorizontal: 32,
  },
  radioItem: {
    paddingVertical: 6,
  },
  infoCard: {
    padding: 16,
    marginBottom: 24,
    backgroundColor: '#E1F5FE',
    borderRadius: 8,
  },
  infoTitle: {
    color: '#0288D1',
    marginBottom: 8,
  },
  infoParagraph: {
    marginBottom: 8,
    lineHeight: 20,
  },
  dialogWarningText: {
    color: '#F57C00',
    marginTop: 8,
  },
});

export default PassiveListeningScreen;