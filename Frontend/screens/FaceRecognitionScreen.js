import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  StatusBar,
  Alert,
  AppState,
  LogBox,
} from "react-native";
import { CameraView, cameraType , Camera , toggleCameraType} from "expo-camera";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import * as Speech from "expo-speech";
import { auth } from "../api/firebaseConfig"; // Import Firebase auth module

// Ignore specific warnings (helpful for development)
LogBox.ignoreLogs(['WebSocket']);

const { width, height } = Dimensions.get("window");

export default function App() {
  // State management
  const [hasPermission, setHasPermission] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [detectedPerson, setDetectedPerson] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);


  // References
  const cameraRef = useRef(null);
  const websocketRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const connectionAttempts = useRef(0);
  const lastDetectedNameRef = useRef(null);
  const [userUID,setUserUID] = useState(null);

  // UID
  useEffect(() => {
    // Function to get current user
    const getCurrentUser = () => {
      const uid = auth.currentUser?.uid;
      setUserUID(uid || null);
      Alert.alert("User UID", `Current User UID: ${uid}`);
    };
    
    // Get user on initial load
    getCurrentUser();
    
    // Set up listener for auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserUID(user?.uid || null);
    });
    
    // Clean up listener on unmount
    return () => unsubscribe();
  }, []);
  
  // Backend URL - consider making this configurable
  const BACKEND_URL = `ws://192.168.1.10:8000/ws/face-recognition/?token=${userUID}`;

  // Initialize effects
  useEffect(() => {
    console.log("[APP] Initializing app");
    requestPermissions();
    
    // Subscribe to app state changes to handle background/foreground transitions
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Initial connection
    connectWebSocket();

    return () => {
      // Clean up resources on unmount
      console.log("[APP] Cleaning up resources");
      cleanupResources();
      subscription.remove();
    };
  }, []);
  
  // App state change handler
  const handleAppStateChange = (nextAppState) => {
    console.log(`[APP] App state changing: ${appState} → ${nextAppState}`);
    if (appState === 'background' && nextAppState === 'active') {
      // App has come to the foreground
      reconnectIfNeeded();
    } else if (nextAppState === 'background') {
      // App has gone to the background - stop scanning
      if (isScanning) {
        setIsScanning(false);
      }
    }
    
    setAppState(nextAppState);
  };
  
  // Reconnect if needed when app comes to foreground
  const reconnectIfNeeded = () => {
    console.log("[APP] Checking if reconnection needed");
    if (!isConnected && !reconnecting) {
      connectWebSocket();
    }
    
    // Also check if camera permission is still valid
    requestPermissions();
  };

  // Effect for scanning
  useEffect(() => {
    if (isScanning) {
      console.log("[SCAN] Starting face scanning");
      startScanning();
    } else {
      console.log("[SCAN] Stopping face scanning");
      stopScanning();
    }
    
    return () => {
      // Clean up when component unmounts or when isScanning changes
      if (scanIntervalRef.current) {
        clearTimeout(scanIntervalRef.current);
      }
    };
  }, [isScanning]);

  // Permission request
  const requestPermissions = async () => {
    try {
      console.log("[PERMISSIONS] Requesting camera permissions");
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
      console.log(`[PERMISSIONS] Camera permission: ${status}`);
    } catch (error) {
      console.error("[PERMISSIONS] Error requesting camera permissions:", error);
      Alert.alert("Permission Error", "Failed to request camera permission");
    }
  };

  // Cleanup resources
  const cleanupResources = () => {
    stopScanning();
    
    // Close WebSocket connection gracefully
    if (websocketRef.current) {
      try {
        console.log("[WEBSOCKET] Closing connection gracefully");
        websocketRef.current.close(1000, "App closing");
      } catch (e) {
        console.error("[WEBSOCKET] Error closing websocket:", e);
      }
      websocketRef.current = null;
    }
    
    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  // WebSocket connection with improved error handling and reconnection strategy
  const connectWebSocket = () => {
    // Don't try to reconnect if already connected or reconnecting
    if (
      websocketRef.current &&
      websocketRef.current.readyState !== WebSocket.CLOSED &&
      websocketRef.current.readyState !== WebSocket.CLOSING
    ) {
      return;
    }

    console.log("[WEBSOCKET] Attempting to connect to server");
    setReconnecting(true);
    
    try {
      // Close existing connection if any
      if (websocketRef.current) {
        try {
          websocketRef.current.close();
        } catch (e) {
          console.error("[WEBSOCKET] Error closing existing connection:", e);
        }
      }
      
      // Create new WebSocket connection
      const ws = new WebSocket(BACKEND_URL);

      ws.onopen = () => {
        console.log("[WEBSOCKET] Connection established successfully");
        setIsConnected(true);
        setReconnecting(false);
        connectionAttempts.current = 0; // Reset connection attempts on successful connection
      };

      websocketRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          console.log("[WEBSOCKET] Message received:", response.type);

          if (response.type === "face_detection_result") {
            setProcessing(false);
            
            if (response.identified_people && response.identified_people.length > 0) {
              // Just get the name of the first (most confident) person
              const person = response.identified_people[0];
              setDetectedPerson(person.person_name);
              
              // Speak the name if it's different from last detected name
              if (lastDetectedNameRef.current !== person.person_name) {
                console.log(`[DETECTION] Person identified: ${person.person_name}`);
                speakPersonName(person.person_name);
                lastDetectedNameRef.current = person.person_name;
              }
              
              // Pause the scanning when a face is detected
              setIsScanning(false);
            } else {
              // No faces detected, continue scanning
              setDetectedPerson(null);
              lastDetectedNameRef.current = null;
            }
          } else if (response.type === "error") {
            setProcessing(false);
            console.error("[WEBSOCKET] Server error:", response.message);
            
            // Optional: Show error to user if critical
            if (response.critical) {
              Alert.alert("Server Error", response.message);
            }
          }
        } catch (error) {
          console.error("[WEBSOCKET] Error parsing message:", error);
          setProcessing(false);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        setReconnecting(false);
        console.log(`[WEBSOCKET] Connection closed with code: ${event.code}`);
        
        if (isScanning) {
          setIsScanning(false);
          stopScanning();
        }

        // Schedule reconnect with exponential backoff for abnormal closures
        if (event.code !== 1000) {
          const backoffTime = Math.min(3000 * Math.pow(1.5, connectionAttempts.current), 30000);
          connectionAttempts.current++;
          
          console.log(`[WEBSOCKET] Reconnecting in ${backoffTime/1000} seconds...`);
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, backoffTime);
        }
      };

      ws.onerror = (error) => {
        console.error("[WEBSOCKET] Connection error:", error);
        setIsConnected(false);
        
        // Only show alert for first error to avoid spamming
        if (connectionAttempts.current === 0) {
          Alert.alert(
            "Connection Error", 
            "Failed to connect to the server. Please check your network settings."
          );
        }
      };
    } catch (error) {
      setReconnecting(false);
      setIsConnected(false);
      console.error("[WEBSOCKET] Error creating connection:", error);
      
      // Only show alert for first error to avoid spamming
      if (connectionAttempts.current === 0) {
        Alert.alert("Connection Error", `Failed to connect: ${error.message}`);
      }
      
      // Schedule reconnect with exponential backoff
      const backoffTime = Math.min(3000 * Math.pow(1.5, connectionAttempts.current), 30000);
      connectionAttempts.current++;
      
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, backoffTime);
    }
  };

  // Handle camera ready state
  const handleCameraReady = () => {
    setCameraReady(true);
    console.log("[CAMERA] Camera is ready");
  };
  
  // Speak the detected person's name
  const speakPersonName = (name) => {
    // Stop any ongoing speech
    Speech.stop();
    
    // Start speaking the name with a slight delay to ensure stopping completes
    setTimeout(() => {
      console.log(`[SPEECH] Speaking name: ${name}`);
      Speech.speak(name, {
        rate: 0.9,
        pitch: 1.0,
        volume: 1.0
      });
    }, 100);
  };

  // Silent frame capture method - optimized for truly silent capture with robust error handling
  const captureFrameSilently = async () => {
    if (
      !cameraRef.current || 
      !isScanning || 
      !isConnected || 
      processing || 
      !cameraReady || 
      appState !== 'active'
    ) {
      return;
    }
    
    // Throttle frame capture to reduce load (once every 2 seconds)
    const now = Date.now();
    if (now - lastFrameTimeRef.current < 2000) return;
    lastFrameTimeRef.current = now;
    
    try {
      setProcessing(true);
      
      // Use takePictureAsync with all possible options to make it silent
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.3,
        skipProcessing: true,
        playSoundOnCapture: false,  // IMPORTANT: This ensures no sound is played
        exif: false, // Disable EXIF to reduce processing
        pauseAfterCapture: false, // Don't pause preview after capture (crucial for no blinking)
        flash: "off",
      }).catch(error => {
        console.error("[CAMERA] Error taking picture:", error);
        return null;
      });
      
      // Verify photo object is valid
      if (!photo || !photo.uri) {
        console.log("[CAMERA] Photo capture failed - null or missing URI");
        setProcessing(false);
        return;
      }
      
      // Resize and compress the image to reduce network load
      const processedImage = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 320 } }],
        { compress: 0.4, format: ImageManipulator.SaveFormat.JPEG }
      ).catch(error => {
        console.error("[CAMERA] Error processing image:", error);
        return null;  
      });
      
      // Check if image processing failed
      if (!processedImage || !processedImage.uri) {
        console.log("[CAMERA] Image processing failed");
        setProcessing(false);
        return;
      }
      
      // Send to server
      sendImageToServer(processedImage.uri);
    } catch (error) {
      console.error("[CAMERA] Error capturing frame silently:", error);
      setProcessing(false);
    }
  };

  // Send image to server with enhanced error handling
  const sendImageToServer = async (imageUri) => {
    if (!imageUri) {
      console.error("[NETWORK] Invalid image URI");
      setProcessing(false);
      return;
    }
    
    try {
      // Convert image to base64 for WebSocket transfer
      const response = await fetch(imageUri).catch(error => {
        console.error("[NETWORK] Error fetching image:", error);
        return null;
      });
      
      if (!response) {
        console.log("[NETWORK] Failed to fetch image from URI");
        setProcessing(false);
        return;
      }
      
      const blob = await response.blob().catch(error => {
        console.error("[NETWORK] Error converting response to blob:", error);
        return null;
      });
      
      if (!blob) {
        console.log("[NETWORK] Failed to convert image to blob");
        setProcessing(false);
        return;
      }
      
      const reader = new FileReader();

      reader.onload = () => {
        if (
          websocketRef.current?.readyState === WebSocket.OPEN && 
          reader.result
        ) {
          console.log("[NETWORK] Sending image to server for processing");
          websocketRef.current.send(
            JSON.stringify({
              type: "image",
              image: reader.result,
            })
          );
        } else {
          setProcessing(false);
          
          // Try to reconnect if not connected
          if (!isConnected && !reconnecting) {
            connectWebSocket();
          }
        }
      };

      reader.onerror = (error) => {
        console.error("[NETWORK] FileReader error:", error);
        setProcessing(false);
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("[NETWORK] Error sending image:", error);
      setProcessing(false);
    }
  };

  // Start scanning for faces with improved stability
  const startScanning = () => {
    if (!isConnected || !cameraReady) {
      console.log("[SCAN] Cannot start: connection or camera not ready");
      return;
    }
    
    // Clear previous results
    setDetectedPerson(null);
    lastDetectedNameRef.current = null;
    
    // Use a combination of setTimeout and requestAnimationFrame for optimal performance
    // This creates a smooth experience while keeping CPU usage reasonable
    const analyzeFrames = () => {
      if (!isScanning || !isConnected) return;
      
      captureFrameSilently();
      
      // Use setTimeout instead of immediate requestAnimationFrame
      // This gives the camera and UI time to breathe
      scanIntervalRef.current = setTimeout(() => {
        if (isScanning) {
          requestAnimationFrame(analyzeFrames);
        }
      }, 2000); // Match our throttle time
    };
    
    // Initial delay to ensure camera is fully initialized
    setTimeout(() => {
      if (isScanning) {
        analyzeFrames();
      }
    }, 500);
  };

  // Stop scanning
  const stopScanning = () => {
    if (scanIntervalRef.current) {
      clearTimeout(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setProcessing(false);
  };

  // Toggle scanning
  const toggleScanning = () => {
    if (!isConnected) {
      Alert.alert(
        "Not Connected",
        "Please wait for connection to server before scanning.",
        [{ text: "OK" }]
      );
      return;
    }
    
    if (!cameraReady) {
      Alert.alert(
        "Camera Not Ready",
        "Please wait for the camera to initialize.",
        [{ text: "OK" }]
      );
      return;
    }

    console.log(`[SCAN] ${isScanning ? 'Stopping' : 'Starting'} face scanning`);
    setIsScanning(prev => !prev);
  };

  // Resume scanning (after a face was detected)
  const resumeScanning = () => {
    setDetectedPerson(null);
    lastDetectedNameRef.current = null;
    setTimeout(() => {
      setIsScanning(true);
    }, 300);
  };

  // Retry connection
  const retryConnection = () => {
    if (reconnecting) return;
    
    connectWebSocket();
  };
  


  // Loading screen
  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <MaterialIcons name="face" size={80} color="#dedede" />
        <Text style={styles.loadingTitle}>A.M.I.E</Text>
        <Text style={styles.loadingSubtitle}>Advanced Machine Intelligence Entity</Text>
        <ActivityIndicator color="#dedede" size="large" style={styles.loadingIndicator} />
      </SafeAreaView>
    );
  }
  
  // Permission error screen
  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" />
        <MaterialIcons name="no-photography" size={70} color="#dedede" />
        <Text style={styles.errorText}>Camera Access Required</Text>
        <Text style={styles.errorSubtext}>
          A.M.I.E needs camera access to identify faces.
        </Text>
        <TouchableOpacity 
          style={styles.enableButton}
          onPress={requestPermissions}
        >
          <Text style={styles.enableButtonText}>Enable Camera</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Main app screen
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>A.M.I.E</Text>
        <View style={[
          styles.connectionIndicator,
          isConnected ? styles.connected : reconnecting ? styles.reconnecting : styles.disconnected
        ]}>
          <Text style={styles.connectionText}>
            {reconnecting ? "Connecting..." : isConnected ? "Connected" : "Disconnected"}
          </Text>
          {!isConnected && !reconnecting && (
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={retryConnection}
            >
              <MaterialIcons name="refresh" size={14} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Camera/Results View */}
      <View style={styles.mainContent}>
        {/* Camera View */}
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            type={cameraType}
            autoFocus={true}
            onCameraReady={handleCameraReady}
            // Additional props for silent operation
            onMountError={(error) => console.error("[CAMERA] Mount error:", error)}
          />
          
          {/* Processing Indicator - only show subtle indicator */}
          {processing && (
            <View style={styles.processingIndicator}>
              <ActivityIndicator size="small" color="#4db5a6" />
            </View>
          )}
          
          {/* Scanner Frame */}
          <View style={styles.scannerFrame}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
          </View>
          
          {/* Status Indicator with Camera Ready State */}
          <View style={styles.statusIndicator}>
            <Text style={styles.statusText}>
              {!cameraReady 
                ? "Initializing camera..."
                : isScanning 
                  ? "Scanning..." 
                  : detectedPerson 
                    ? detectedPerson 
                    : "Ready"}
            </Text>
          </View>
          
          {/* Camera Flip Button */}
          <TouchableOpacity 
            style={styles.flipCameraButton}
            onPress={toggleCameraType}
          >
            <MaterialIcons name="flip-camera-ios" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Control Button */}
      <TouchableOpacity
        style={[
          styles.controlButton,
          isScanning ? styles.stopButton : styles.startButton,
          (!isConnected || !cameraReady) && styles.buttonDisabled,
        ]}
        onPress={toggleScanning}
        disabled={!isConnected || !cameraReady}
      >
        <Text style={styles.controlButtonText}>
          {isScanning ? "Stop" : "Scan"}
        </Text>
      </TouchableOpacity>
      
      {/* Resume Button - only show when a person is detected */}
      {detectedPerson && (
        <TouchableOpacity
          style={styles.resumeButton}
          onPress={resumeScanning}
        >
          <Text style={styles.resumeButtonText}>Continue</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Core Containers
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  
  // Loading Screen
  loadingTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: "#ffffff",
    marginTop: 20,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: "#dedede",
    letterSpacing: 1,
    marginTop: 5,
  },
  loadingIndicator: {
    marginTop: 40,
  },
  
  // Error Screen
  errorText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 20,
  },
  errorSubtext: {
    fontSize: 16,
    color: "#dedede",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  enableButton: {
    backgroundColor: "#2d2d2d",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  enableButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 1,
  },
  connectionIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  connected: {
    backgroundColor: "rgba(75, 181, 67, 0.2)",
  },
  disconnected: {
    backgroundColor: "rgba(239, 71, 58, 0.2)",
  },
  reconnecting: {
    backgroundColor: "rgba(255, 191, 0, 0.2)",
  },
  connectionText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  retryButton: {
    marginLeft: 6,
    padding: 2,
  },
  
  // Main Content
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Camera
  cameraContainer: {
    height: height * 0.7, // Make camera view larger
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  // Using a more subtle processing indicator to avoid screen blinks
  processingIndicator: {
    position: "absolute",
    top: 15,
    right: 15,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 20,
    padding: 8,
  },
  
  // Scanner Frame
  scannerFrame: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cornerTL: {
    position: "absolute",
    top: 20,
    left: 20,
    height: 20,
    width: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  cornerTR: {
    position: "absolute",
    top: 20,
    right: 20,
    height: 20,
    width: 20,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  cornerBL: {
    position: "absolute",
    bottom: 20,
    left: 20,
    height: 20,
    width: 20,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  cornerBR: {
    position: "absolute",
    bottom: 20,
    right: 20,
    height: 20,
    width: 20,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  
  // Status Indicator - Now used for showing the detected person name
  statusIndicator: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  statusText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    overflow: "hidden",
    textAlign: "center",
  },
  
  // Control Button
  controlButton: {
    paddingVertical: 16,
    borderRadius: 30,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  startButton: {
    backgroundColor: "#4db5a6",
  },
  stopButton: {
    backgroundColor: "#e57373",
  },
  buttonDisabled: {
    backgroundColor: "#444444",
    opacity: 0.6,
  },
  controlButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  
  // Resume Button
  resumeButton: {
    backgroundColor: "#4db5a6",
    paddingVertical: 14,
    borderRadius: 30,
    marginHorizontal: 20,
    marginBottom: 30,
    alignItems: "center",
  },
  resumeButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  
  // Flip Camera Button
  flipCameraButton: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 25,
    padding: 10,
  },
});