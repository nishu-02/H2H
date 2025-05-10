// screens/WallpaperUploadScreen.js

import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { 
  Button, 
  TextInput, 
  Text, 
  Card, 
  IconButton, 
  Divider 
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { uploadWallpaper } from '../api/apiService';
import { auth } from '../api/firebaseConfig';

const WallpaperUploadScreen = ({ navigation }) => {
  const [images, setImages] = useState([]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant media library permissions to upload wallpapers.');
        return;
      }

      // Pick an image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Add the new image to the array
        setImages([...images, result.assets[0]]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const removeImage = (index) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
  };

  const uploadImages = async () => {
    if (images.length === 0) {
      Alert.alert('No Images', 'Please select at least one image to upload.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Description Required', 'Please add a description for your wallpaper(s).');
      return;
    }

    try {
      setLoading(true);
      
      // Get current user directly from Firebase auth
      const user = auth.currentUser;
      
      if (!user) {
        Alert.alert('Authentication Error', 'You must be logged in to upload wallpapers.');
        setLoading(false);
        return;
      }

      // Upload each image one by one
      for (const image of images) {
        const formData = new FormData();
        
        // Add image to form data
        const imageUri = Platform.OS === 'ios' ? image.uri.replace('file://', '') : image.uri;
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image';
        
        formData.append('image', {
          uri: imageUri,
          type,
          name: filename
        });
        
        // Add description to form data
        formData.append('description', description);
        
        // Upload to backend with user UID
        await uploadWallpaper(user.uid, formData);
      }
      
      // Reset form after successful upload
      setImages([]);
      setDescription('');
      
      Alert.alert(
        'Success', 
        'Wallpaper(s) uploaded successfully!',
        [{ text: 'OK', onPress: () => navigation.navigate('HomeScreen') }]
      );
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload wallpaper(s). Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Upload Wallpapers</Text>
      
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.subtitle}>Select Images</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.imageGrid}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: image.uri }} style={styles.thumbnail} />
                <IconButton
                  icon="close-circle"
                  size={24}
                  style={styles.removeButton}
                  iconColor="#FFFFFF"
                  containerColor="rgba(244, 67, 54, 0.8)"
                  onPress={() => removeImage(index)}
                />
              </View>
            ))}
            
            <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
              <IconButton
                icon="plus"
                size={40}
                iconColor="#4f46e5"
              />
            </TouchableOpacity>
          </View>
          
          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            style={styles.input}
            mode="outlined"
            outlineColor="#d1d5db"
            activeOutlineColor="#4f46e5"
            multiline
            numberOfLines={3}
          />
          
          <Button
            mode="contained"
            onPress={uploadImages}
            disabled={images.length === 0 || loading}
            style={styles.uploadButton}
            buttonColor="#4f46e5"
          >
            {loading ? 'Uploading...' : 'Upload Wallpaper(s)'}
          </Button>
          
          {loading && (
            <ActivityIndicator 
              style={styles.loader} 
              size="large" 
              color="#4f46e5" 
            />
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
  },
  divider: {
    backgroundColor: '#e5e7eb',
    height: 1,
    marginBottom: 16,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    margin: 4,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  addImageBtn: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  uploadButton: {
    marginTop: 8,
    paddingVertical: 4,
  },
  loader: {
    marginTop: 16,
  },
});

export default WallpaperUploadScreen;