// App.js

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { useFonts } from 'expo-font';

// Screens
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import ReminderScreen from './screens/ReminderScreen';
import AudioUploadScreen from './screens/AudioUploadScreen';
import ProfileScreen from './screens/ProfileScreen';
import PermissionsDebugScreen from './screens/PermissionsDebugScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import UserTypeScreen from './screens/UserTypeScreen';
import PatientInfoScreen from './screens/PatientInfoScreen';
import MemoryVaultScreen from './screens/MemoryVaultScreen';
import SummaryScreen from './screens/SummaryScreen';
import LoadingScreen from './screens/LoadingScreen';
import WallpaperUploadScreen from './screens/WallpaperUploadScreen';
import HomeScreenWallpaper from './screens/HomeScreenWallpaper';

import RandomEventScreen from './screens/RandomEventScreen';
import FaceRecognitionScreen from './screens/FaceRecognitionScreen';

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    'Poppins-Regular': require('./assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('./assets/fonts/Poppins-Bold.ttf'),
    'Poppins-Medium': require('./assets/fonts/Poppins-Medium.ttf'),
    'Poppins-Light': require('./assets/fonts/Poppins-Light.ttf'),
  });

  useEffect(() => {
    // Simulate loading resources
    setTimeout(() => {
      setIsLoading(false);
    }, 3000);
  }, []);

  if (isLoading || !fontsLoaded) {
    return <LoadingScreen />;
  }

  return (
    <PaperProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName="LoginScreen"
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: 'transparent' },
            cardStyleInterpolator: ({ current, layouts }) => ({
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
                    }),
                  },
                ],
              },
            }),
          }}
        >{/* New Screens - Comment outside of component flow */}
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="UserType" component={UserTypeScreen} />
          <Stack.Screen name="PatientInfo" component={PatientInfoScreen} />
          <Stack.Screen name="MemoryVault" component={MemoryVaultScreen} />
          <Stack.Screen name="Summary" component={SummaryScreen} />
          <Stack.Screen name="Loading" component={LoadingScreen} />
          {/* Old Screens - Comment outside of component flow */}
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen name="ReminderScreen" component={ReminderScreen} />
          <Stack.Screen name="AudioUploadScreen" component={AudioUploadScreen} />
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="PermissionsDebug" component={PermissionsDebugScreen} />
          <Stack.Screen name="WallpaperUploadScreen" component={WallpaperUploadScreen} />
          <Stack.Screen name="HomeScreenWallpaper" component={HomeScreenWallpaper} />

          <Stack.Screen name="RandomEventScreen" component={RandomEventScreen} />
          <Stack.Screen name="FaceRecognitionScreen" component={FaceRecognitionScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}