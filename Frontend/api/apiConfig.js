const BASE_URL = "http://192.168.6.81:8000";

const API_ENDPOINTS = {
  // User APIs
  
  REGISTER_USER: "/api/users/register/",
  GET_PROFILE: "/api/users/profile/",
  UPDATE_PROFILE: "/api/users/profile/update/",

  // Audio APIs
  CREATE_AUDIO: "/api/audio/memories/",
  LIST_AUDIO: "/api/audio/memories/",

  // Reminder APIs
  CREATE_REMINDER: "/api/reminders/create/",
  LIST_REMINDERS: "/api/reminders/create/",
  GET_ALL_REMINDERS: "/api/reminders/getall/",
  DELETE_REMINDER: "/api/reminders/reminder/",

  // Wallpaper APIs
  UPLOAD_WALLPAPER: "/api/reminders/upload_wallpaper/",
  RANDOM_WALLPAPER: "/api/reminders/random_wallpaper/",

  // FACE AUTHENTICATION APIs
  FACE_REGISTER: "/api/memory/register-face/",
  MEMORY: "/api/audio/memories/export/"
};

export { BASE_URL, API_ENDPOINTS };