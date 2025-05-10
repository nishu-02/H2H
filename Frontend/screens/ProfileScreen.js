import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert,
  TouchableOpacity,
  Linking,
  Platform,
  Dimensions
} from 'react-native';
import { 
  Appbar, 
  TextInput, 
  Button, 
  Avatar, 
  Title, 
  Text,
  Paragraph, 
  Card, 
  ActivityIndicator, 
  Chip,
  FAB,
  Portal,
  useTheme,
  IconButton,
  Snackbar,
  HelperText
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { auth } from '../api/firebaseConfig';
import { getUserProfile, updateUserProfile } from '../api/apiService';
import * as ImagePicker from 'expo-image-picker';

const windowWidth = Dimensions.get('window').width;

const ProfileScreen = ({ navigation }) => {
  const theme = useTheme();
  
  // User states
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Form states
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [language, setLanguage] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [confusionTriggers, setConfusionTriggers] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);

  // Memory vault items (mock data for now)
  const [memoryItems, setMemoryItems] = useState([
    { id: 1, title: 'Family Reunion', image: 'https://via.placeholder.com/150', type: 'Event' },
    { id: 2, title: 'Sarah (Daughter)', image: 'https://via.placeholder.com/150', type: 'Family' },
    { id: 3, title: 'Garden Party', image: 'https://via.placeholder.com/150', type: 'Event' },
    { id: 4, title: 'Michael (Son)', image: 'https://via.placeholder.com/150', type: 'Family' },
    { id: 5, title: 'Summer Vacation', image: 'https://via.placeholder.com/150', type: 'Memory' }
  ]);

  // FAB state
  const [fabOpen, setFabOpen] = useState(false);

  // Error states
  const [nameError, setNameError] = useState('');
  const [ageError, setAgeError] = useState('');
  const [emergencyPhoneError, setEmergencyPhoneError] = useState('');

  // Snackbar state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Font size multiplier for accessibility
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState(1);

  // Get current user ID
  const getCurrentUserId = () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert(
        "Authentication Error",
        "You're not logged in. Please log in and try again.",
        [{ text: "OK", onPress: () => navigation.navigate('Login') }]
      );
      return null;
    }
    return currentUser.uid;
  };

  // Fetch user profile
  const fetchUserProfile = async () => {
    const uid = getCurrentUserId();
    if (!uid) return;

    try {
      setLoading(true);
      const userData = await getUserProfile(uid);
      setProfile(userData);
      
      // Pre-fill form fields
      setName(userData.name || '');
      setNickname(userData.nickname || '');
      setEmail(userData.email || '');
      setAge(userData.age ? userData.age.toString() : '');
      setGender(userData.gender || '');
      setLanguage(userData.language || '');
      setEmergencyContact(userData.emergency_contact || '');
      setEmergencyPhone(userData.emergency_phone || '');
      setConfusionTriggers(userData.confusion_triggers || '');
      setProfilePicture(userData.profile_picture || null);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      showSnackbar('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        fetchUserProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Show snackbar message
  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  // Validate form
  const validateForm = () => {
    let isValid = true;
    
    if (!name.trim()) {
      setNameError('Name is required');
      isValid = false;
    } else {
      setNameError('');
    }
    
    if (age && (isNaN(age) || parseInt(age) < 1 || parseInt(age) > 120)) {
      setAgeError('Please enter a valid age between 1 and 120');
      isValid = false;
    } else {
      setAgeError('');
    }

    if (emergencyPhone && !/^\+?[0-9]{10,15}$/.test(emergencyPhone.replace(/[\s()-]/g, ''))) {
      setEmergencyPhoneError('Please enter a valid phone number');
      isValid = false;
    } else {
      setEmergencyPhoneError('');
    }
    
    return isValid;
  };

  // Handle profile picture selection
  const handleSelectProfilePicture = async () => {
    // Request permissions
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      showSnackbar('Failed to select image');
    }
  };

  // Handle form submission
  const handleUpdateProfile = async () => {
    if (!validateForm()) return;
    
    const uid = getCurrentUserId();
    if (!uid) return;
    
    try {
      setUpdating(true);
      
      // Create form data if profile picture is selected
      let updatedData;
      
      if (profilePicture && profilePicture !== profile?.profile_picture) {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('nickname', nickname);
        formData.append('age', age ? parseInt(age) : null);
        formData.append('gender', gender);
        formData.append('language', language);
        formData.append('emergency_contact', emergencyContact);
        formData.append('emergency_phone', emergencyPhone);
        formData.append('confusion_triggers', confusionTriggers);
        
        // Only append profile_picture if it's a new one
        const imageName = profilePicture.split('/').pop();
        const imageType = 'image/' + (imageName.split('.').pop() === 'png' ? 'png' : 'jpeg');
        
        formData.append('profile_picture', {
          uri: profilePicture,
          name: imageName,
          type: imageType,
        });
        
        updatedData = formData;
      } else {
        // Regular JSON data if no new profile picture
        updatedData = {
          name,
          nickname,
          age: age ? parseInt(age) : null,
          gender,
          language,
          emergency_contact: emergencyContact,
          emergency_phone: emergencyPhone,
          confusion_triggers: confusionTriggers
        };
      }
      
      await updateUserProfile(uid, updatedData);
      showSnackbar('Profile updated successfully');
      setEditMode(false);
      fetchUserProfile(); // Refresh profile data
    } catch (error) {
      console.error('Error updating profile:', error);
      showSnackbar('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    // Reset form fields to current profile values
    setName(profile?.name || '');
    setNickname(profile?.nickname || '');
    setEmail(profile?.email || '');
    setAge(profile?.age ? profile.age.toString() : '');
    setGender(profile?.gender || '');
    setLanguage(profile?.language || '');
    setEmergencyContact(profile?.emergency_contact || '');
    setEmergencyPhone(profile?.emergency_phone || '');
    setConfusionTriggers(profile?.confusion_triggers || '');
    setProfilePicture(profile?.profile_picture || null);
    setEditMode(false);
    
    // Clear any errors
    setNameError('');
    setAgeError('');
    setEmergencyPhoneError('');
  };

  // Call emergency contact
  const callEmergencyContact = () => {
    if (profile?.emergency_phone) {
      Linking.openURL(`tel:${profile.emergency_phone}`);
    } else {
      showSnackbar('No emergency contact number available');
    }
  };

  // Navigate to memory vault
  const navigateToMemoryVault = () => {
    // This would navigate to a dedicated memory vault screen
    showSnackbar('Navigating to Memory Vault');
    // navigation.navigate('MemoryVault');
  };

  // Add memory item
  const addMemoryItem = () => {
    showSnackbar('Add Memory feature coming soon');
  };

  // Format confusion triggers as array
  const getTriggerArray = () => {
    if (!profile?.confusion_triggers) return [];
    return profile.confusion_triggers.split(',').map(item => item.trim()).filter(item => item.length > 0);
  };

  // Profile header section
  const renderProfileHeader = () => (
    <Animatable.View animation="fadeIn" duration={800} style={styles.profileHeader}>
      <TouchableOpacity 
        onPress={handleSelectProfilePicture}
        style={styles.avatarContainer}
        accessible={true}
        accessibilityLabel="Profile picture"
        accessibilityHint="Tap to change profile picture"
      >
        {profilePicture ? (
          <Avatar.Image 
            source={{ uri: profilePicture }} 
            size={130} 
            style={styles.avatar}
          />
        ) : (
          <Avatar.Icon 
            icon="account" 
            size={130} 
            style={styles.avatar}
            color="#ffffff"
            backgroundColor="#9DB5B2"
          />
        )}
      </TouchableOpacity>

      <Animatable.View animation="fadeInUp" delay={200} style={styles.nameContainer}>
        <Title style={[styles.nameText, { fontSize: 26 * fontSizeMultiplier }]}>{profile?.name || 'User'}</Title>
        {profile?.nickname && (
          <Text style={[styles.nicknameText, { fontSize: 18 * fontSizeMultiplier }]}>"{profile.nickname}"</Text>
        )}
        <View style={styles.agGenderContainer}>
          {(profile?.age || profile?.gender) && (
            <Text style={[styles.ageGenderText, { fontSize: 16 * fontSizeMultiplier }]}>
              {profile?.age ? `${profile.age} years` : ''}{(profile?.age && profile?.gender) ? ' • ' : ''}{profile?.gender || ''}
            </Text>
          )}
        </View>
      </Animatable.View>
    </Animatable.View>
  );

  // Key info cards section
  const renderKeyInfoCards = () => (
    <Animatable.View animation="fadeInUp" delay={400}>
      <Title style={[styles.sectionTitle, { fontSize: 20 * fontSizeMultiplier }]}>Key Information</Title>
      
      <View style={styles.cardsContainer}>
        <Animatable.View animation="fadeInLeft" delay={500} style={[styles.infoCard, styles.languageCard]}>
          <Card style={styles.card}>
            <Card.Content>
              <Title style={[styles.cardTitle, { fontSize: 18 * fontSizeMultiplier }]}>Primary Language</Title>
              <Text style={[styles.cardContent, { fontSize: 18 * fontSizeMultiplier }]}>{profile?.language || 'Not specified'}</Text>
            </Card.Content>
          </Card>
        </Animatable.View>
        
        <Animatable.View animation="fadeInRight" delay={600} style={[styles.infoCard, styles.emergencyCard]}>
          <Card style={styles.card}>
            <Card.Content>
              <Title style={[styles.cardTitle, { fontSize: 18 * fontSizeMultiplier }]}>Emergency Contact</Title>
              <Text style={[styles.cardContent, { fontSize: 16 * fontSizeMultiplier }]}>{profile?.emergency_contact || 'Not specified'}</Text>
              {profile?.emergency_phone && (
                <Button 
                  mode="contained" 
                  icon="phone" 
                  onPress={callEmergencyContact}
                  style={styles.callButton}
                  labelStyle={{ fontSize: 14 * fontSizeMultiplier }}
                  contentStyle={styles.actionButtonContent}
                  accessibilityLabel={`Call ${profile.emergency_contact}`}
                >
                  Call
                </Button>
              )}
            </Card.Content>
          </Card>
        </Animatable.View>
      </View>
      
      <Animatable.View animation="fadeInUp" delay={700}>
        <Card style={styles.triggersCard}>
          <Card.Content>
            <Title style={[styles.cardTitle, { fontSize: 18 * fontSizeMultiplier }]}>Known Confusion Triggers</Title>
            <View style={styles.chipsContainer}>
              {getTriggerArray().length > 0 ? (
                getTriggerArray().map((trigger, index) => (
                  <Chip 
                    key={index} 
                    style={styles.chip}
                    textStyle={{ fontSize: 14 * fontSizeMultiplier }}
                  >
                    {trigger}
                  </Chip>
                ))
              ) : (
                <Text style={{ fontSize: 16 * fontSizeMultiplier }}>No triggers specified</Text>
              )}
            </View>
          </Card.Content>
        </Card>
      </Animatable.View>
    </Animatable.View>
  );

  // Memory vault preview section
  const renderMemoryVaultPreview = () => (
    <Animatable.View animation="fadeInUp" delay={800}>
      <View style={styles.memoryTitleContainer}>
        <Title style={[styles.sectionTitle, { fontSize: 20 * fontSizeMultiplier }]}>Memory Vault</Title>
        <Button 
          mode="text" 
          onPress={navigateToMemoryVault}
          labelStyle={{ fontSize: 14 * fontSizeMultiplier }}
          style={styles.viewAllButton}
          accessibilityLabel="View all memories"
        >
          View All
        </Button>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memoryScrollView}>
        {memoryItems.map((item, index) => (
          <Animatable.View 
            key={item.id} 
            animation="fadeIn" 
            delay={900 + (index * 100)}
            style={styles.memoryItemContainer}
          >
            <TouchableOpacity
              style={styles.memoryItem}
              accessible={true}
              accessibilityLabel={`Memory: ${item.title}`}
            >
              <Card style={styles.memoryCard}>
                <Card.Cover 
                  source={{ uri: item.image }} 
                  style={styles.memoryImage}
                  accessibilityLabel={item.title}
                />
                <Card.Content style={styles.memoryContent}>
                  <Text style={[styles.memoryType, { fontSize: 12 * fontSizeMultiplier }]}>{item.type}</Text>
                  <Text style={[styles.memoryTitle, { fontSize: 14 * fontSizeMultiplier }]}>{item.title}</Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          </Animatable.View>
        ))}
      </ScrollView>
    </Animatable.View>
  );

  // Action buttons section
  const renderActionButtons = () => (
    <Animatable.View animation="fadeInUp" delay={1000} style={styles.actionButtonsContainer}>
      <Button 
        mode="contained"
        icon="account-edit"
        onPress={() => setEditMode(true)}
        style={styles.actionButton}
        labelStyle={{ fontSize: 16 * fontSizeMultiplier }}
        contentStyle={styles.actionButtonContent}
        accessibilityLabel="Edit profile information"
      >
        Edit Profile
      </Button>
      
      <Button 
        mode="contained"
        icon="image-plus"
        onPress={addMemoryItem}
        style={styles.actionButton}
        labelStyle={{ fontSize: 16 * fontSizeMultiplier }}
        contentStyle={styles.actionButtonContent}
        accessibilityLabel="Add new memory or event"
      >
        Add Memory
      </Button>
      
      <Button 
        mode="contained"
        icon="cog"
        onPress={() => showSnackbar('Settings coming soon')}  
        style={styles.actionButton}
        labelStyle={{ fontSize: 16 * fontSizeMultiplier }}
        contentStyle={styles.actionButtonContent}
        accessibilityLabel="Open settings"
      >
        Settings
      </Button>
    </Animatable.View>
  );

  // Profile edit form
  const renderEditForm = () => (
    <Animatable.View animation="fadeIn" duration={500}>
      <Card style={styles.editCard}>
        <Card.Content>
          <View style={styles.profilePictureContainer}>
            {profilePicture ? (
              <Avatar.Image 
                source={{ uri: profilePicture }} 
                size={100} 
                style={styles.editAvatar}
              />
            ) : (
              <Avatar.Icon 
                icon="account" 
                size={100} 
                style={styles.editAvatar}
                color="#ffffff"
                backgroundColor="#9DB5B2"
              />
            )}
            
            <IconButton
              icon="camera"
              size={30}
              color="#548687"
              style={styles.cameraButton}
              onPress={handleSelectProfilePicture}
            />
          </View>
          
          <TextInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            error={!!nameError}
            accessibilityLabel="Full name input field"
          />
          {nameError ? <HelperText type="error">{nameError}</HelperText> : null}
          
          <TextInput
            label="Nickname or Preferred Name"
            value={nickname}
            onChangeText={setNickname}
            mode="outlined"
            style={styles.input}
            accessibilityLabel="Nickname input field"
          />
          
          <TextInput
            label="Email"
            value={email}
            disabled={true}
            mode="outlined"
            style={styles.input}
            accessibilityLabel="Email input field (disabled)"
          />
          <HelperText>Email cannot be changed</HelperText>
          
          <View style={styles.rowInputs}>
            <TextInput
              label="Age"
              value={age}
              onChangeText={setAge}
              mode="outlined"
              style={[styles.input, styles.halfInput]}
              keyboardType="number-pad"
              error={!!ageError}
              accessibilityLabel="Age input field"
            />
            
            <TextInput
              label="Gender"
              value={gender}
              onChangeText={setGender}
              mode="outlined"
              style={[styles.input, styles.halfInput]}
              accessibilityLabel="Gender input field"
            />
          </View>
          {ageError ? <HelperText type="error">{ageError}</HelperText> : null}
          
          <TextInput
            label="Primary Language"
            value={language}
            onChangeText={setLanguage}
            mode="outlined"
            style={styles.input}
            accessibilityLabel="Language input field"
          />
          
          <TextInput
            label="Emergency Contact Name"
            value={emergencyContact}
            onChangeText={setEmergencyContact}
            mode="outlined"
            style={styles.input}
            accessibilityLabel="Emergency contact name input field"
          />
          
          <TextInput
            label="Emergency Contact Phone"
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
            mode="outlined"
            style={styles.input}
            keyboardType="phone-pad"
            error={!!emergencyPhoneError}
            accessibilityLabel="Emergency contact phone input field"
          />
          {emergencyPhoneError ? <HelperText type="error">{emergencyPhoneError}</HelperText> : null}
          
          <TextInput
            label="Known Confusion Triggers"
            value={confusionTriggers}
            onChangeText={setConfusionTriggers}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            placeholder="Separate with commas"
            accessibilityLabel="Confusion triggers input field"
            accessibilityHint="Separate multiple triggers with commas"
          />
          
          <View style={styles.buttonContainer}>
            <Button 
              mode="outlined" 
              onPress={handleCancelEdit}
              style={styles.cancelButton}
              disabled={updating}
              accessibilityLabel="Cancel editing"
            >
              Cancel
            </Button>
            
            <Button 
              mode="contained" 
              onPress={handleUpdateProfile}
              style={styles.saveButton}
              loading={updating}
              disabled={updating}
              color="#548687"
              accessibilityLabel="Save profile changes"
            >
              Save Changes
            </Button>
          </View>
        </Card.Content>
      </Card>
    </Animatable.View>
  );

  // Font size adjustment
  const adjustFontSize = (increase) => {
    if (increase && fontSizeMultiplier < 1.5) {
      setFontSizeMultiplier(prevSize => prevSize + 0.1);
    } else if (!increase && fontSizeMultiplier > 0.8) {
      setFontSizeMultiplier(prevSize => prevSize - 0.1);
    }
    showSnackbar(`Font size ${increase ? 'increased' : 'decreased'}`);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: '#548687' }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#ffffff" />
        <Appbar.Content title="My Profile" color="#ffffff" titleStyle={{ fontSize: 20 * fontSizeMultiplier }} />
        {!editMode && (
          <>
            <Appbar.Action 
              icon="magnify-plus-outline" 
              onPress={() => adjustFontSize(true)} 
              color="#ffffff" 
              accessibilityLabel="Increase font size"
            />
            <Appbar.Action 
              icon="magnify-minus-outline" 
              onPress={() => adjustFontSize(false)} 
              color="#ffffff" 
              accessibilityLabel="Decrease font size"
            />
            <Appbar.Action 
              icon="refresh" 
              onPress={fetchUserProfile} 
              color="#ffffff" 
              accessibilityLabel="Refresh profile"
            />
          </>
        )}
      </Appbar.Header>
      
      <LinearGradient
        colors={['#f0f5e9', '#e8f1f5']}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#548687" />
              <Text style={{ marginTop: 16, fontSize: 16 * fontSizeMultiplier }}>Loading profile...</Text>
            </View>
          ) : (
            <View style={styles.content}>
              {editMode ? renderEditForm() : (
                <>
                  {renderProfileHeader()}
                  {renderKeyInfoCards()}
                  {renderMemoryVaultPreview()}
                  {renderActionButtons()}
                </>
              )}
            </View>
          )}
        </ScrollView>
      </LinearGradient>
      
      {!editMode && (
        <Portal>
          <FAB.Group
            visible={!editMode}
            open={fabOpen}
            icon={fabOpen ? 'close' : 'plus'}
            actions={[
              {
                icon: 'account-edit',
                label: 'Edit Profile',
                onPress: () => setEditMode(true),
              },
              {
                icon: 'image-plus',
                label: 'Add Memory',
                onPress: addMemoryItem,
              },
              {
                icon: 'cog',
                label: 'Settings',
                onPress: () => showSnackbar('Settings coming soon'),
              },
            ]}
            onStateChange={({ open }) => setFabOpen(open)}
            fabStyle={{ backgroundColor: '#548687' }}
          />
        </Portal>
      )}
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
        action={{
          label: 'OK',
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
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    minHeight: 300,
  },
  // Profile Header Styles
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  avatarContainer: {
    marginBottom: 16,
    elevation: 10,
  },
  avatar: {
    borderWidth: 4,
    borderColor: '#fff',
  },
  nameContainer: {
    alignItems: 'center',
  },
  nameText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  nicknameText: {
    fontSize: 18,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
  },
  agGenderContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  ageGenderText: {
    fontSize: 16,
    color: '#777',
  },
  // Section Title
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
    marginTop: 8,
  },
  // Key Info Cards
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    height: 130,
  },
  languageCard: {
    marginRight: 8,
  },
  emergencyCard: {
    marginLeft: 8,
  },
  card: {
    height: '100%',
    borderRadius: 20,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 8,
    color: '#444',
  },
  cardContent: {
    fontSize: 16,
  },
  callButton: {
    marginTop: 8,
    backgroundColor: '#D05353',
    borderRadius: 30,
    height: 36,
  },
  triggersCard: {
    borderRadius: 20,
    marginBottom: 24,
    elevation: 5,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    margin: 4,
    backgroundColor: '#FFF0CA',
  },
  // Memory Vault Styles
  memoryTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewAllButton: {
    marginRight: -8,
  },
  memoryScrollView: {
    marginBottom: 24,
  },
  memoryItemContainer: {
    width: windowWidth * 0.4,
    marginRight: 12,
  },
  memoryItem: {
    height: 180,
  },
  memoryCard: {
    height: '100%',
    borderRadius: 20,
    elevation: 5,
  },
  memoryImage: {
    height: 120,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  memoryContent: {
    padding: 8,
  },
  memoryType: {
    fontSize: 12,
    color: '#777',
    textTransform: 'uppercase',
  },
  memoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  // Action Buttons
  actionButtonsContainer: {
    marginBottom: 32,
  },
  actionButton: {
    marginBottom: 16,
    borderRadius: 30,
    backgroundColor: '#548687',
    height: 48,
    justifyContent: 'center',
    elevation: 4,
  },
  actionButtonContent: {
    height: 48,
  },
  // Edit Form Styles
  editCard: {
    borderRadius: 20,
    marginBottom: 24,
    elevation: 5,
    backgroundColor: '#ffffff',
  },
  profilePictureContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  editAvatar: {
    borderWidth: 4,
    borderColor: '#f0f0f0',
  },
  cameraButton: {
    position: 'absolute',
    bottom: -10,
    right: '38%',
    backgroundColor: '#f0f0f0',
    elevation: 4,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderColor: '#548687',
    borderRadius: 30,
    height: 48,
    justifyContent: 'center',
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 30,
    height: 48,
    justifyContent: 'center',
    backgroundColor: '#548687',
  },
  snackbar: {
    marginBottom: 16,
  },
});

export default ProfileScreen;