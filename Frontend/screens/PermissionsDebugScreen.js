import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity,
  ScrollView, 
  Platform, 
  StyleSheet, 
  PermissionsAndroid, 
  Alert, 
  AppState, 
  Linking,
  NativeModules,
  ToastAndroid
} from 'react-native';

// Reference the actual native modules that exist in your project
const { 
  AccessibilityModule, 
  DeviceAdminModule, 
  LauncherModule,
  UsageStatsModule,
  BatteryOptimizationModule 
} = NativeModules;

export default function PermissionsDebugScreen() {
  const [permissions, setPermissions] = useState({
    // Camera & Mic
    camera: null,
    microphone: null,
    
    // Location
    location: null,
    locationBackground: null,
    
    // Storage
    storage: null,
    
    // Contacts & Calendar
    contacts: null,
    calendar: null,
    
    // Phone
    phoneState: null,
    callLog: null,
    makeCall: null,
    readCallLog: null,
    writeCallLog: null,
    
    // SMS
    sms: null,
    sendSms: null,
    receiveSms: null,
    
    // System
    notifications: null,
    packageUsageStats: null,
    systemAlertWindow: null,
    ignoreBatteryOptimizations: null,
    
    // Special permissions (not directly checkable with PermissionsAndroid)
    accessibilityService: null,
    deviceAdmin: null,
    defaultLauncher: null,
  });
  
  const [appState, setAppState] = useState(AppState.currentState);

  // Monitor app state changes to refresh permissions when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        checkAllPermissions();
      }
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState]);

  useEffect(() => {
    // On initial load, check all permissions
    checkAllPermissions();
    checkSpecialPermissions();
  }, []);

  // Function to check special permissions that require native modules
  const checkSpecialPermissions = async () => {
    try {
      // Check Accessibility Service status
      if (AccessibilityModule) {
        try {
          const isAccessibilityEnabled = await AccessibilityModule.isAccessibilityServiceEnabled();
          setPermissions(prev => ({ ...prev, accessibilityService: isAccessibilityEnabled }));
        } catch (err) {
          console.warn("Error checking accessibility service:", err);
        }
      }
      
      // Check Device Admin status
      if (DeviceAdminModule) {
        try {
          const isDeviceAdminEnabled = await DeviceAdminModule.isDeviceAdminEnabled();
          setPermissions(prev => ({ ...prev, deviceAdmin: isDeviceAdminEnabled }));
        } catch (err) {
          console.warn("Error checking device admin status:", err);
        }
      }
      
      // Check Default Launcher status
      if (LauncherModule) {
        try {
          const isDefaultLauncher = await LauncherModule.isDefaultLauncher();
          setPermissions(prev => ({ ...prev, defaultLauncher: isDefaultLauncher }));
        } catch (err) {
          console.warn("Error checking default launcher status:", err);
        }
      }

      // Check Usage Stats permission
      if (UsageStatsModule) {
        try {
          const hasUsageStatsPermission = await UsageStatsModule.hasUsageStatsPermission();
          setPermissions(prev => ({ ...prev, packageUsageStats: hasUsageStatsPermission }));
        } catch (err) {
          console.warn("Error checking usage stats permission:", err);
        }
      }

      // Check Battery Optimization status
      if (BatteryOptimizationModule) {
        try {
          const isIgnoringBatteryOptimizations = await BatteryOptimizationModule.isIgnoringBatteryOptimizations();
          setPermissions(prev => ({ 
            ...prev, 
            ignoreBatteryOptimizations: isIgnoringBatteryOptimizations 
          }));
        } catch (err) {
          console.warn("Error checking battery optimization status:", err);
        }
      }
    } catch (error) {
      console.warn("Error checking special permissions:", error);
    }
  };

  // Function to check all permissions without prompting user
  const checkAllPermissions = async () => {
    console.log("Checking all permissions...");
    const permissionsStatus = { ...permissions };

    // Check permissions using PermissionsAndroid
    if (Platform.OS === 'android') {
      try {
        const permissionsToCheck = {
          camera: PermissionsAndroid.PERMISSIONS.CAMERA,
          microphone: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          location: PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          storage: PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          contacts: PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          calendar: PermissionsAndroid.PERMISSIONS.READ_CALENDAR,
          phoneState: PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          sms: PermissionsAndroid.PERMISSIONS.READ_SMS,
          receiveSms: PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
          sendSms: PermissionsAndroid.PERMISSIONS.SEND_SMS,
          callLog: PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
          readCallLog: PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
          writeCallLog: PermissionsAndroid.PERMISSIONS.WRITE_CALL_LOG,
          makeCall: PermissionsAndroid.PERMISSIONS.CALL_PHONE,
        };

        // Check background location separately for Android 10+
        if (Platform.Version >= 29) {
          permissionsToCheck.locationBackground = PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION;
        }

        // Check notification permission for Android 13+
        if (Platform.Version >= 33) {
          permissionsToCheck.notifications = "android.permission.POST_NOTIFICATIONS";
        }

        // Check all permissions
        for (const [key, permission] of Object.entries(permissionsToCheck)) {
          try {
            permissionsStatus[key] = await PermissionsAndroid.check(permission);
          } catch (err) {
            console.warn(`Error checking ${key} permission:`, err);
            permissionsStatus[key] = false;
          }
        }

        // For older Android versions, notifications are enabled by default
        if (Platform.Version < 33) {
          permissionsStatus.notifications = true;
        }

        // Check system alert window permission (display over other apps)
        try {
          if (Platform.Version >= 23) {
            permissionsStatus.systemAlertWindow = await PermissionsAndroid.check(
              PermissionsAndroid.PERMISSIONS.SYSTEM_ALERT_WINDOW
            );
          } else {
            permissionsStatus.systemAlertWindow = true;
          }
        } catch (err) {
          console.warn("Error checking system alert window permission:", err);
          permissionsStatus.systemAlertWindow = false;
        }
      } catch (err) {
        console.warn("Error checking Android permissions:", err);
      }
    }

    setPermissions(permissionsStatus);
    console.log("Updated Permissions Status:", permissionsStatus);
  };

  // Request all permissions at once
  const requestAllPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        // Standard permissions that can be requested directly
        const standardPermissions = [
          { key: 'camera', permission: PermissionsAndroid.PERMISSIONS.CAMERA },
          { key: 'microphone', permission: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO },
          { key: 'location', permission: PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION },
          { key: 'storage', permission: PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE },
          { key: 'contacts', permission: PermissionsAndroid.PERMISSIONS.READ_CONTACTS },
          { key: 'calendar', permission: PermissionsAndroid.PERMISSIONS.READ_CALENDAR },
          { key: 'phoneState', permission: PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE },
          { key: 'sms', permission: PermissionsAndroid.PERMISSIONS.READ_SMS },
          { key: 'receiveSms', permission: PermissionsAndroid.PERMISSIONS.RECEIVE_SMS },
          { key: 'sendSms', permission: PermissionsAndroid.PERMISSIONS.SEND_SMS },
          { key: 'callLog', permission: PermissionsAndroid.PERMISSIONS.READ_CALL_LOG },
          { key: 'readCallLog', permission: PermissionsAndroid.PERMISSIONS.READ_CALL_LOG },
          { key: 'writeCallLog', permission: PermissionsAndroid.PERMISSIONS.WRITE_CALL_LOG },
          { key: 'makeCall', permission: PermissionsAndroid.PERMISSIONS.CALL_PHONE },
        ];
        
        // Request all standard permissions
        for (const { key, permission } of standardPermissions) {
          try {
            const result = await PermissionsAndroid.request(permission, {
              title: `${key.charAt(0).toUpperCase() + key.slice(1)} Permission`,
              message: `This app needs ${key} permission for full functionality`,
              buttonNeutral: "Ask Me Later",
              buttonNegative: "Cancel",
              buttonPositive: "OK"
            });
            
            setPermissions(prev => ({
              ...prev,
              [key]: result === PermissionsAndroid.RESULTS.GRANTED
            }));
          } catch (error) {
            console.warn(`Error requesting ${key} permission:`, error);
          }
        }
        
        // Request notification permission for Android 13+
        if (Platform.Version >= 33) {
          try {
            const result = await PermissionsAndroid.request(
              "android.permission.POST_NOTIFICATIONS",
              {
                title: "Notification Permission",
                message: "This app needs to send you notifications",
                buttonNeutral: "Ask Me Later",
                buttonNegative: "Cancel",
                buttonPositive: "OK"
              }
            );
            
            setPermissions(prev => ({
              ...prev,
              notifications: result === PermissionsAndroid.RESULTS.GRANTED
            }));
          } catch (error) {
            console.warn("Error requesting notification permission:", error);
          }
        }
        
        // Background location requires foreground location permission to be granted first
        if (Platform.Version >= 29) {
          // Check if foreground location is granted before requesting background
          const hasLocationPermission = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          
          if (hasLocationPermission) {
            try {
              const result = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
                {
                  title: "Background Location Permission",
                  message: "This app needs access to your location in the background",
                  buttonNeutral: "Ask Me Later",
                  buttonNegative: "Cancel",
                  buttonPositive: "OK"
                }
              );
              
              setPermissions(prev => ({
                ...prev,
                locationBackground: result === PermissionsAndroid.RESULTS.GRANTED
              }));
            } catch (error) {
              console.warn("Error requesting background location permission:", error);
            }
          }
        }
        
        // Request special permissions that require system settings
        requestSystemSettingsPermissions();
      } catch (error) {
        console.warn("Error in requestAllPermissions:", error);
      }
    }
  };
  
  // Request permissions that require system settings screens
  const requestSystemSettingsPermissions = () => {
    // Display over other apps
    if (Platform.OS === 'android' && Platform.Version >= 23) {
      Alert.alert(
        "Special Permissions Required",
        "This app needs additional permissions that require system settings. Would you like to continue with granting these permissions?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Continue", 
            onPress: () => {
              // First, show toast to guide user
              if (Platform.OS === 'android') {
                ToastAndroid.show(
                  "Please enable the requested permissions in each settings screen",
                  ToastAndroid.LONG
                );
              }
              
              // Request system alert window permission (overlay)
              try {
                Linking.openSettings();
                // Wait for user to potentially handle settings
                setTimeout(() => {
                  Alert.alert(
                    "Additional Permissions",
                    "After granting overlay permissions, would you like to continue with other special permissions?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { 
                        text: "Continue", 
                        onPress: async () => {
                          // Usage Stats permission
                          if (UsageStatsModule) {
                            try {
                              UsageStatsModule.openUsageAccessSettings();
                              // Wait again for user action
                              setTimeout(() => {
                                // Battery optimization
                                if (BatteryOptimizationModule) {
                                  try {
                                    BatteryOptimizationModule.requestIgnoreBatteryOptimizations();
                                    // Wait again for user action
                                    setTimeout(() => {
                                      // Accessibility service
                                      if (AccessibilityModule) {
                                        try {
                                          AccessibilityModule.openAccessibilitySettings();
                                          // Wait again for user action
                                          setTimeout(() => {
                                            // Device admin
                                            if (DeviceAdminModule) {
                                              try {
                                                DeviceAdminModule.requestDeviceAdmin();
                                                // Final step - default launcher
                                                setTimeout(() => {
                                                  if (LauncherModule) {
                                                    try {
                                                      LauncherModule.openDefaultLauncherSettings();
                                                      // Final refresh after all settings
                                                      setTimeout(() => {
                                                        checkAllPermissions();
                                                        checkSpecialPermissions();
                                                        
                                                        ToastAndroid.show(
                                                          "Permissions setup complete. Checking status...",
                                                          ToastAndroid.SHORT
                                                        );
                                                      }, 1000);
                                                    } catch (e) {
                                                      console.warn("Error opening launcher settings:", e);
                                                    }
                                                  }
                                                }, 2000);
                                              } catch (e) {
                                                console.warn("Error requesting device admin:", e);
                                              }
                                            }
                                          }, 2000);
                                        } catch (e) {
                                          console.warn("Error opening accessibility settings:", e);
                                        }
                                      }
                                    }, 2000);
                                  } catch (e) {
                                    console.warn("Error with battery optimization request:", e);
                                  }
                                }
                              }, 2000);
                            } catch (e) {
                              console.warn("Error opening usage stats settings:", e);
                            }
                          }
                        }
                      }
                    ]
                  );
                }, 2000);
              } catch (e) {
                console.warn("Error opening settings:", e);
              }
            }
          }
        ]
      );
    }
  };

  // Open app settings
  const openAppSettings = () => {
    if (Platform.OS === 'android') {
      try {
        Linking.openSettings();
      } catch (e) {
        console.warn("Error opening app settings:", e);
        Alert.alert("Error", "Could not open app settings");
      }
    }
  };

  // Handle refresh button press
  const handleRefresh = () => {
    try {
      checkAllPermissions();
      checkSpecialPermissions();
      ToastAndroid.show("Refreshing permission status...", ToastAndroid.SHORT);
    } catch (e) {
      console.warn("Error refreshing permissions:", e);
    }
  };

  // Handle request all permissions button press
  const handleRequestAll = () => {
    try {
      requestAllPermissions();
    } catch (e) {
      console.warn("Error requesting all permissions:", e);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Permissions Debug</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.refreshButton]} 
          onPress={handleRefresh}
        >
          <Text style={styles.buttonText}>Refresh Status</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.requestButton]} 
          onPress={handleRequestAll}
        >
          <Text style={styles.buttonText}>Request All Permissions</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.settingsButton]} 
          onPress={openAppSettings}
        >
          <Text style={styles.buttonText}>Open App Settings</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Camera & Microphone</Text>
        <PermissionItem name="Camera" granted={permissions.camera} />
        <PermissionItem name="Microphone" granted={permissions.microphone} />
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <PermissionItem name="Location" granted={permissions.location} />
        <PermissionItem name="Background Location" granted={permissions.locationBackground} />
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage & Contacts</Text>
        <PermissionItem name="Storage" granted={permissions.storage} />
        <PermissionItem name="Contacts" granted={permissions.contacts} />
        <PermissionItem name="Calendar" granted={permissions.calendar} />
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phone</Text>
        <PermissionItem name="Phone State" granted={permissions.phoneState} />
        <PermissionItem name="Call Log" granted={permissions.callLog} />
        <PermissionItem name="Make Calls" granted={permissions.makeCall} />
        <PermissionItem name="Read Call Log" granted={permissions.readCallLog} />
        <PermissionItem name="Write Call Log" granted={permissions.writeCallLog} />
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SMS</Text>
        <PermissionItem name="Read SMS" granted={permissions.sms} />
        <PermissionItem name="Receive SMS" granted={permissions.receiveSms} />
        <PermissionItem name="Send SMS" granted={permissions.sendSms} />
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System</Text>
        <PermissionItem name="Notifications" granted={permissions.notifications} />
        <PermissionItem name="Display Over Apps" granted={permissions.systemAlertWindow} />
        <PermissionItem name="Usage Stats" granted={permissions.packageUsageStats} />
        <PermissionItem name="Ignore Battery Optimizations" granted={permissions.ignoreBatteryOptimizations} />
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Special Permissions</Text>
        <PermissionItem name="Accessibility Service" granted={permissions.accessibilityService} />
        <PermissionItem name="Device Administrator" granted={permissions.deviceAdmin} />
        <PermissionItem name="Default Launcher" granted={permissions.defaultLauncher} />
      </View>
    </ScrollView>
  );
}

const PermissionItem = ({ name, granted }) => (
  <View style={styles.permissionItem}>
    <Text style={styles.permissionText}>{name}: </Text>
    <Text style={[
      styles.permissionStatus, 
      { color: granted === null ? '#666' : (granted ? '#4CAF50' : '#F44336') }
    ]}>
      {granted === null ? 'Unknown' : (granted ? 'Granted ✅' : 'Denied ❌')}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#F5F5F5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333'
  },
  buttonContainer: {
    flexDirection: 'column',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  refreshButton: {
    backgroundColor: '#4285F4',
  },
  requestButton: {
    backgroundColor: '#0F9D58',
  },
  settingsButton: {
    backgroundColor: '#DB4437',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#555'
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  permissionText: {
    fontSize: 16,
    color: '#333'
  },
  permissionStatus: {
    fontSize: 16,
    fontWeight: '500'
  },
});