import axios from "axios";
import { BASE_URL, API_ENDPOINTS } from "./apiConfig";

// Axios instance
const api = axios.create({
  baseURL: BASE_URL,
});

// Add response interceptor to handle common errors
api.interceptors.response.use(
  response => response,
  error => {
    console.log('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Helper to set firebase UID in Authorization header
const withAuthHeader = (uid) => ({
  headers: {
    "Authorization": uid,
  },
});

// Helper for multipart (file upload) requests with Authorization
const withAuthHeaderMultipart = (uid) => ({
  headers: {
    "Authorization": uid,
    "Content-Type": "multipart/form-data",
  },
});

// ============================
// User Management
// ============================

// Register User
export const registerUser = async (userData) => {
  try {
    const response = await api.post(API_ENDPOINTS.REGISTER_USER, userData);
    return response.data;
  } catch (error) {
    console.error('Registration error:', error.response?.data || error.message);
    throw error;
  }
};

// Get User Profile
export const getUserProfile = async (uid) => {
  try {
    const response = await api.get(API_ENDPOINTS.GET_PROFILE, withAuthHeader(uid));
    return response.data;
  } catch (error) {
    console.error('Get profile error:', error.response?.data || error.message);
    throw error;
  }
};

// Update User Profile
export const updateUserProfile = async (uid, updatedData) => {
  try {
    const response = await api.patch(API_ENDPOINTS.UPDATE_PROFILE, updatedData, withAuthHeader(uid));
    return response.data;
  } catch (error) {
    console.error('Update profile error:', error.response?.data || error.message);
    throw error;
  }
};

// ============================
// Audio APIs
// ============================

// Create Audio Memory
export const createAudioMemory = async (uid, formData) => {
  try {
    const response = await api.post(API_ENDPOINTS.CREATE_AUDIO, formData, withAuthHeaderMultipart(uid));
    return response.data;
  } catch (error) {
    console.error('Create audio error:', error.response?.data || error.message);
    throw error;
  }
};

// List Audio Memories
export const listAudioMemories = async (uid) => {
  try {
    const response = await api.get(API_ENDPOINTS.LIST_AUDIO, withAuthHeader(uid));
    return response.data;
  } catch (error) {
    console.error('List audio error:', error.response?.data || error.message);
    throw error;
  }
};

// ============================
// Reminder APIs
// ============================

export const createReminder = async (uid, reminderData) => {
  try {
    const data = {
      firebase_uid: uid,
      title: reminderData.title,
      description: reminderData.description,
      time: reminderData.time,
      frequency: reminderData.frequency
    };
    
    const response = await api.post(API_ENDPOINTS.CREATE_REMINDER, data, withAuthHeader(uid));
    return response.data;
  } catch (error) {
    console.error('Create reminder error:', error.response?.data || error.message);
    throw error;
  }
};

// List Reminders
export const listReminders = async (uid) => {
  try {
    const response = await api.get(API_ENDPOINTS.LIST_REMINDERS, withAuthHeader(uid));
    return response.data;
  } catch (error) {
    console.error('List reminders error:', error.response?.data || error.message);
    throw error;
  }
};

// Get All Reminders
export const getAllReminders = async (uid) => {
  try {
    const response = await api.get(API_ENDPOINTS.GET_ALL_REMINDERS, withAuthHeader(uid));
    return response.data;
  } catch (error) {
    console.error('Get all reminders error:', error.response?.data || error.message);
    throw error;
  }
};

// Update Reminder
export const updateReminder = async (uid, id, reminderData) => {
  try {
    const data = {
      firebase_uid: uid,
      title: reminderData.title,
      description: reminderData.description,
      time: reminderData.time,
      frequency: reminderData.frequency
    };
    
    const response = await api.put(`${API_ENDPOINTS.DELETE_REMINDER}${id}/`, data, withAuthHeader(uid));
    return response.data;
  } catch (error) {
    console.error('Update reminder error:', error.response?.data || error.message);
    throw error;
  }
};

// Delete Reminder
export const deleteReminder = async (uid, id) => {
  try {
    const response = await api.delete(`${API_ENDPOINTS.DELETE_REMINDER}${id}/`, withAuthHeader(uid));
    return response.data;
  } catch (error) {
    console.error('Delete reminder error:', error.response?.data || error.message);
    throw error;
  }
};

// ============================
// Wallpaper APIs
// ============================

// Upload Wallpaper
export const uploadWallpaper = async (uid, formData) => {
  try {
    const response = await api.post(API_ENDPOINTS.UPLOAD_WALLPAPER, formData, withAuthHeaderMultipart(uid));
    return response.data;
  } catch (error) {
    console.error('Upload wallpaper error:', error.response?.data || error.message);
    throw error;
  }
};

// Get Random Wallpaper
export const getRandomWallpaper = async (uid) => {
  try {
    const response = await api.get(API_ENDPOINTS.RANDOM_WALLPAPER, withAuthHeader(uid));
    return response.data;
  } catch (error) {
    console.error('Random wallpaper error:', error.response?.data || error.message);
    throw error;
  }
};


export const registerFace = async (uid, formData) => {
  try {
    const response = await api.post(API_ENDPOINTS.FACE_REGISTER, formData, withAuthHeaderMultipart(uid));
    return response.data;
  } catch (error) {
    console.error('Upload wallpaper error:', error.response?.data || error.message);
    throw error;
  }
};

export const MEMORY_API = `${BASE_URL}${API_ENDPOINTS.MEMORY}`
