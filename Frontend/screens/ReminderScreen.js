import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Alert,
  Image,
  Animated
} from 'react-native';
import {
  Appbar,
  FAB,
  Card,
  Text,
  Dialog,
  Portal,
  Button,
  TextInput,
  Snackbar,
  IconButton,
  Chip,
  Menu,
  Divider,
  ActivityIndicator,
  HelperText,
  TouchableRipple,
  RadioButton
} from 'react-native-paper';
import { format } from 'date-fns';
import { auth } from '../api/firebaseConfig';
import {
  createReminder,
  listReminders,
  updateReminder,
  deleteReminder
} from '../api/apiService';

// Reminder types for UI display
const REMINDER_TYPES = {
  'medication': { icon: 'pill', color: '#4A6FA5' }, // Soft blue
  'meeting': { icon: 'account-group', color: '#F9A826' }, // Warm orange
  'family': { icon: 'heart', color: '#6BCB77' }, // Fresh green
  'appointment': { icon: 'calendar-clock', color: '#FF6B6B' }, // Soft red
};

// Valid frequency values for the API
const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
];

const ReminderScreen = ({ navigation }) => {
  // Animation value for fade-in effect
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  
  // States
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Dialog states
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // 'create' or 'edit'
  const [editingReminderId, setEditingReminderId] = useState(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [reminderType, setReminderType] = useState('medication');
  const [frequency, setFrequency] = useState('daily'); // Default to daily
  
  // Date picker states
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  
  // Context menu state
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  
  // Form validation
  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  
  // Fade in animation when component mounts
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true
    }).start();
  }, [fadeAnim]);
  
  // Check authentication and get token
  const checkAuthAndGetId = () => {
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
  
  // Fetch reminders
  const fetchReminders = useCallback(async () => {
    const uid = checkAuthAndGetId();
    if (!uid) return;
    
    try {
      setLoading(true);
      const data = await listReminders(uid);
      setReminders(data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        showSnackbar('Authentication error. Please login again.');
      } else {
        showSnackbar('Failed to load reminders');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);
  
  // Initial load
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        fetchReminders();
      } else {
        setReminders([]);
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, [fetchReminders]);
  
  // Refresh control
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReminders();
  }, [fetchReminders]);
  
  // Show snackbar message
  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };
  
  // Reset form
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate(new Date());
    setTime(new Date());
    setReminderType('medication');
    setFrequency('daily');
    setTitleError('');
    setDescriptionError('');
    setEditingReminderId(null);
  };
  
  // Open dialog
  const openCreateDialog = () => {
    if (!checkAuthAndGetId()) return;
    
    setDialogMode('create');
    resetForm();
    setDialogVisible(true);
  };
  
  // Open edit dialog
  const openEditDialog = (reminder) => {
    if (!checkAuthAndGetId()) return;
    
    setDialogMode('edit');
    setEditingReminderId(reminder.id);
    setTitle(reminder.title);
    setDescription(reminder.description);
    
    // Parse the date and time
    const reminderDateTime = new Date(reminder.time);
    setDate(reminderDateTime);
    setTime(reminderDateTime);
    
    // Handle type and frequency from existing reminders
    setReminderType(reminder.type || 'medication');
    setFrequency(reminder.frequency || 'daily');
    
    setDialogVisible(true);
    setContextMenuVisible(false);
  };
  
  // Format date for UI display
  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'PPP p'); // 'Apr 29, 2023, 3:30 PM'
    } catch (error) {
      return dateString;
    }
  };
  
  // Validate form
  const validateForm = () => {
    let isValid = true;
    
    if (!title.trim()) {
      setTitleError('Title is required');
      isValid = false;
    } else {
      setTitleError('');
    }
    
    if (!description.trim()) {
      setDescriptionError('Description is required');
      isValid = false;
    } else {
      setDescriptionError('');
    }
    
    return isValid;
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    const uid = checkAuthAndGetId();
    if (!uid) return;
    
    try {
      // Combine date and time
      const dateTime = new Date(date);
      dateTime.setHours(time.getHours(), time.getMinutes());
      
      const formattedDateTime = dateTime.toISOString();
      
      const reminderData = {
        title,
        description,
        time: formattedDateTime,
        frequency: frequency, // Use the valid frequency value
        type: reminderType, // Keep type separate from frequency
      };
      
      console.log('Submitting reminder data:', reminderData);
      
      if (dialogMode === 'create') {
        await createReminder(uid, reminderData);
        showSnackbar('Reminder created successfully');
      } else {
        await updateReminder(uid, editingReminderId, reminderData);
        showSnackbar('Reminder updated successfully');
      }
      
      setDialogVisible(false);
      resetForm();
      fetchReminders();
    } catch (error) {
      console.error('Error saving reminder:', error);
      if (error.response?.data) {
        console.error('API Error:', JSON.stringify(error.response.data));
      }
      if (error.response?.status === 401 || error.response?.status === 403) {
        showSnackbar('Authentication error. Please login again.');
      } else {
        showSnackbar(`Failed to ${dialogMode === 'create' ? 'create' : 'update'} reminder`);
      }
    }
  };
  
  // Handle reminder deletion
  const handleDeleteReminder = async (id) => {
    const uid = checkAuthAndGetId();
    if (!uid) return;
    
    try {
      await deleteReminder(uid, id);
      showSnackbar('Reminder deleted successfully');
      fetchReminders();
      setContextMenuVisible(false);
    } catch (error) {
      console.error('Error deleting reminder:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        showSnackbar('Authentication error. Please login again.');
      } else {
        showSnackbar('Failed to delete reminder');
      }
    }
  };
  
  // Simple date picker dialog
  const renderDatePickerDialog = () => {
    if (!datePickerVisible) return null;
    
    // Generate years, months, and days for picker
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear + i);
    
    const months = [
      { value: 0, label: 'January' },
      { value: 1, label: 'February' },
      { value: 2, label: 'March' },
      { value: 3, label: 'April' },
      { value: 4, label: 'May' },
      { value: 5, label: 'June' },
      { value: 6, label: 'July' },
      { value: 7, label: 'August' },
      { value: 8, label: 'September' },
      { value: 9, label: 'October' },
      { value: 10, label: 'November' },
      { value: 11, label: 'December' }
    ];
    
    // Get days in the selected month
    const getDaysInMonth = (year, month) => {
      return new Date(year, month + 1, 0).getDate();
    };
    
    const daysInMonth = getDaysInMonth(date.getFullYear(), date.getMonth());
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    return (
      <Dialog visible={datePickerVisible} onDismiss={() => setDatePickerVisible(false)}>
        <Dialog.Title>Select Date</Dialog.Title>
        <Dialog.Content>
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerSection}>
              <Text style={styles.datePickerLabel}>Year</Text>
              <ScrollView style={styles.datePickerScrollView}>
                {years.map(year => (
                  <TouchableRipple
                    key={year}
                    onPress={() => {
                      const newDate = new Date(date);
                      newDate.setFullYear(year);
                      setDate(newDate);
                    }}
                  >
                    <Text style={[
                      styles.datePickerItem,
                      date.getFullYear() === year && styles.datePickerItemSelected
                    ]}>
                      {year}
                    </Text>
                  </TouchableRipple>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.datePickerSection}>
              <Text style={styles.datePickerLabel}>Month</Text>
              <ScrollView style={styles.datePickerScrollView}>
                {months.map(month => (
                  <TouchableRipple
                    key={month.value}
                    onPress={() => {
                      const newDate = new Date(date);
                      newDate.setMonth(month.value);
                      // Adjust day if necessary (e.g., if we're switching from a month with 31 days to one with 30)
                      const daysInNewMonth = getDaysInMonth(newDate.getFullYear(), month.value);
                      if (newDate.getDate() > daysInNewMonth) {
                        newDate.setDate(daysInNewMonth);
                      }
                      setDate(newDate);
                    }}
                  >
                    <Text style={[
                      styles.datePickerItem,
                      date.getMonth() === month.value && styles.datePickerItemSelected
                    ]}>
                      {month.label}
                    </Text>
                  </TouchableRipple>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.datePickerSection}>
              <Text style={styles.datePickerLabel}>Day</Text>
              <ScrollView style={styles.datePickerScrollView}>
                {days.map(day => (
                  <TouchableRipple
                    key={day}
                    onPress={() => {
                      const newDate = new Date(date);
                      newDate.setDate(day);
                      setDate(newDate);
                    }}
                  >
                    <Text style={[
                      styles.datePickerItem,
                      date.getDate() === day && styles.datePickerItemSelected
                    ]}>
                      {day}
                    </Text>
                  </TouchableRipple>
                ))}
              </ScrollView>
            </View>
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setDatePickerVisible(false)}>Done</Button>
        </Dialog.Actions>
      </Dialog>
    );
  };
  
  // Simple time picker dialog
  const renderTimePickerDialog = () => {
    if (!timePickerVisible) return null;
    
    // Generate hours and minutes for picker
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);
    
    return (
      <Dialog visible={timePickerVisible} onDismiss={() => setTimePickerVisible(false)}>
        <Dialog.Title>Select Time</Dialog.Title>
        <Dialog.Content>
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerSection}>
              <Text style={styles.timePickerLabel}>Hour</Text>
              <ScrollView style={styles.timePickerScrollView}>
                {hours.map(hour => (
                  <TouchableRipple
                    key={hour}
                    onPress={() => {
                      const newTime = new Date(time);
                      newTime.setHours(hour);
                      setTime(newTime);
                    }}
                  >
                    <Text style={[
                      styles.timePickerItem,
                      time.getHours() === hour && styles.timePickerItemSelected
                    ]}>
                      {hour.toString().padStart(2, '0')}
                    </Text>
                  </TouchableRipple>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.timePickerSection}>
              <Text style={styles.timePickerLabel}>Minute</Text>
              <ScrollView style={styles.timePickerScrollView}>
                {minutes.map(minute => (
                  <TouchableRipple
                    key={minute}
                    onPress={() => {
                      const newTime = new Date(time);
                      newTime.setMinutes(minute);
                      setTime(newTime);
                    }}
                  >
                    <Text style={[
                      styles.timePickerItem,
                      time.getMinutes() === minute && styles.timePickerItemSelected
                    ]}>
                      {minute.toString().padStart(2, '0')}
                    </Text>
                  </TouchableRipple>
                ))}
              </ScrollView>
            </View>
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setTimePickerVisible(false)}>Done</Button>
        </Dialog.Actions>
      </Dialog>
    );
  };
  
  // Open context menu
  const openContextMenu = (reminder) => {
    setSelectedReminder(reminder);
    setContextMenuVisible(true);
  };
  
  // Get type color and icon
  const getReminderTypeInfo = (type) => {
    return REMINDER_TYPES[type] || REMINDER_TYPES['medication']; // Default to medication if type not found
  };
  
  // Render reminder card
  const renderReminderCard = ({ item, index }) => {
    const reminderType = item.type || 'medication';
    const typeInfo = getReminderTypeInfo(reminderType);
    
    return (
      <Animated.View 
        style={[
          styles.cardContainer,
          { opacity: fadeAnim }
        ]}
      >
        <Card 
          style={[styles.card, { borderLeftWidth: 5, borderLeftColor: typeInfo.color }]}
          onLongPress={() => openContextMenu(item)}
        >
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.titleContainer}>
                <Text variant="titleLarge" style={styles.cardTitle}>{item.title}</Text>
                <View style={styles.chipContainer}>
                  <Chip 
                    icon={typeInfo.icon}
                    style={[styles.typeChip, { backgroundColor: typeInfo.color + '20', borderColor: typeInfo.color }]}
                  >
                    <Text style={{ color: typeInfo.color }}>{reminderType}</Text>
                  </Chip>
                  
                  <Chip 
                    icon="repeat"
                    style={styles.frequencyChip}
                  >
                    <Text>{item.frequency || 'daily'}</Text>
                  </Chip>
                </View>
              </View>
              <Menu
                visible={contextMenuVisible && selectedReminder?.id === item.id}
                onDismiss={() => setContextMenuVisible(false)}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    size={24}
                    onPress={() => openContextMenu(item)}
                    style={styles.menuButton}
                  />
                }
              >
                <Menu.Item 
                  onPress={() => openEditDialog(item)} 
                  title="Edit" 
                  leadingIcon="pencil"
                  titleStyle={styles.menuItemText}
                />
                <Divider />
                <Menu.Item 
                  onPress={() => handleDeleteReminder(item.id)} 
                  title="Delete" 
                  leadingIcon="delete"
                  titleStyle={[styles.menuItemText, { color: '#FF6B6B' }]}
                />
              </Menu>
            </View>
            
            <Text variant="bodyLarge" style={styles.cardDescription}>{item.description}</Text>
            
            <View style={styles.cardFooter}>
              <View style={styles.dateTimeContainer}>
                <IconButton icon="clock-outline" size={20} iconColor={typeInfo.color} style={styles.dateTimeIcon} />
                <Text variant="bodyMedium" style={[styles.dateTime, { color: typeInfo.color }]}>
                  {formatDateTime(item.time)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </Animated.View>
    );
  };
  
  // Render dialog content
  const renderDialogContent = () => (
    <>
      <TextInput
        label="Title"
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={styles.input}
        error={!!titleError}
      />
      {titleError ? <HelperText type="error" style={styles.helperText}>{titleError}</HelperText> : null}
      
      <TextInput
        label="Description"
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        style={styles.input}
        multiline
        numberOfLines={3}
        error={!!descriptionError}
      />
      {descriptionError ? <HelperText type="error" style={styles.helperText}>{descriptionError}</HelperText> : null}
      
      <View style={styles.dateTimeButtonContainer}>
        <Button 
          mode="outlined" 
          onPress={() => setDatePickerVisible(true)}
          style={styles.dateTimeButton}
          icon="calendar"
        >
          {format(date, 'PPP')}
        </Button>
        
        <Button 
          mode="outlined" 
          onPress={() => setTimePickerVisible(true)}
          style={styles.dateTimeButton}
          icon="clock-outline"
        >
          {format(time, 'p')}
        </Button>
      </View>
      
      <Text variant="titleMedium" style={styles.sectionTitle}>Reminder Type</Text>
      <View style={styles.typeButtonsContainer}>
        {Object.keys(REMINDER_TYPES).map(type => (
          <Chip
            key={type}
            selected={reminderType === type}
            onPress={() => setReminderType(type)}
            style={[
              styles.typeButton,
              { 
                backgroundColor: reminderType === type ? REMINDER_TYPES[type].color + '20' : 'transparent',
                borderColor: REMINDER_TYPES[type].color,
                borderWidth: 1
              }
            ]}
            icon={REMINDER_TYPES[type].icon}
          >
            <Text style={{ color: reminderType === type ? REMINDER_TYPES[type].color : '#757575' }}>
              {type}
            </Text>
          </Chip>
        ))}
      </View>
      
      <Text variant="titleMedium" style={styles.sectionTitle}>Frequency</Text>
      <RadioButton.Group onValueChange={value => setFrequency(value)} value={frequency}>
        {FREQUENCIES.map(freq => (
          <View key={freq.value} style={styles.radioItem}>
            <RadioButton value={freq.value} />
            <Text onPress={() => setFrequency(freq.value)} style={styles.radioLabel}>
              {freq.label}
            </Text>
          </View>
        ))}
      </RadioButton.Group>
    </>
  );
  
  // Render empty state
  const renderEmptyState = () => (
    <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
      <Image 
        source={require('../assets/empty-calendar.png')} 
        style={styles.emptyImage}
        defaultSource={require('../assets/empty-calendar.png')}
      />
      <Text variant="headlineSmall" style={styles.emptyTitle}>No reminders yet</Text>
      <Text variant="bodyLarge" style={styles.emptyText}>Let's add one to stay organized!</Text>
      <Button 
        mode="contained" 
        onPress={openCreateDialog}
        style={styles.emptyButton}
        icon="plus"
      >
        Add Reminder
      </Button>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#4A6FA5" barStyle="light-content" />
      
      <Appbar.Header style={styles.header}>
        <Appbar.Content title="Reminders" titleStyle={styles.headerTitle} />
        <Appbar.Action icon="refresh" onPress={onRefresh} size={24} color="#FFFFFF" />
      </Appbar.Header>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A6FA5" />
        </View>
      ) : (
        <FlatList
          data={reminders}
          renderItem={renderReminderCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4A6FA5']} />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={openCreateDialog}
        color="#FFFFFF"
      />
      
      <Portal>
        {renderDatePickerDialog()}
        {renderTimePickerDialog()}
        
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>
            {dialogMode === 'create' ? 'Create Reminder' : 'Edit Reminder'}
          </Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <ScrollView contentContainerStyle={styles.dialogScrollContent}>
              {renderDialogContent()}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions style={styles.dialogActions}>
            <Button 
              onPress={() => setDialogVisible(false)} 
              style={styles.dialogButton}
            >
              Cancel
            </Button>
            <Button 
              onPress={handleSubmit} 
              style={[styles.dialogButton, styles.primaryButton]}
              mode="contained"
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
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
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#4A6FA5',
    elevation: 0,
    height: 64,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#333333',
    marginRight: 8,
  },
  typeChip: {
    height: 32,
    marginRight: 8,
    borderWidth: 1,
  },
  frequencyChip: {
    height: 32,
    backgroundColor: '#f0f0f0',
  },
  cardDescription: {
    color: '#555555',
    marginTop: 8,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 8,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeIcon: {
    margin: 0,
    padding: 0,
  },
  dateTime: {
    color: '#757575',
  },
  menuButton: {
    margin: 0,
  },
  menuItemText: {
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4A6FA5',
    borderRadius: 28,
  },
  dialog: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  dialogTitle: {
    fontSize: 22,
    color: '#333333',
    textAlign: 'center',
  },
  dialogScrollArea: {
    paddingHorizontal: 8,
  },
  dialogScrollContent: {
    paddingVertical: 8,
  },
  dialogActions: {
    padding: 16,
    justifyContent: 'space-between',
  },
  dialogButton: {
    paddingHorizontal: 16,
    minWidth: 100,
  },
  primaryButton: {
    backgroundColor: '#4A6FA5',
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  helperText: {
    marginTop: -8,
    marginBottom: 8,
  },
  dateTimeButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateTimeButton: {
    flex: 1,
    marginHorizontal: 4,
    borderColor: '#4A6FA5',
  },
  snackbar: {
    backgroundColor: '#333333',
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    marginTop: 8,
    color: '#333333',
  },
  typeButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  typeButton: {
    margin: 4,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  radioLabel: {
    fontSize: 16,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    height: 500,
  },
  emptyImage: {
    width: 150,
    height: 150,
    marginBottom: 24,
    opacity: 0.7,
  },
  emptyTitle: {
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  emptyText: {
    color: '#757575',
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#4A6FA5',
  },
  // Date and Time Picker styles
  datePickerContainer: {
    flexDirection: 'row',
    height: 200,
  },
  datePickerSection: {
    flex: 1,
    marginHorizontal: 4,
  },
  datePickerLabel: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#4A6FA5',
  },
  datePickerScrollView: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  datePickerItem: {
    padding: 10,
    textAlign: 'center',
  },
  datePickerItemSelected: {
    backgroundColor: '#4A6FA5',
    color: 'white',
    fontWeight: 'bold',
  },
  timePickerContainer: {
    flexDirection: 'row',
    height: 200,
  },
  timePickerSection: {
    flex: 1,
    marginHorizontal: 4,
  },
  timePickerLabel: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#4A6FA5',
  },
  timePickerScrollView: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  timePickerItem: {
    padding: 10,
    textAlign: 'center',
  },
  timePickerItemSelected: {
    backgroundColor: '#4A6FA5',
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ReminderScreen;