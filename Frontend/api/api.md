# API Documentation for Backend Services

## User Management APIs

### Register User
**URL**: `/api/users/register/`  
**Method**: POST  
**Data**:
```json
{
  "firebase_uid": "string",
  "email": "user@example.com",
  "name": "User Name",
  "age": 25,
  "gender": "string",
  "language": "en"
}
```

### Get User Profile
**URL**: `/api/users/profile/`  
**Method**: GET  
**Authentication**: Required  
**Data**: None

### Update User Profile
**URL**: `/api/users/profile/update/`  
**Method**: PUT/PATCH  
**Data**:
```json
{
  "name": "Updated Name",
  "age": 26,
  "gender": "string",
  "language": "en"
}
```

## Audio APIs

### Create Audio Memory
**URL**: `/api/audio/memories/`  
**Method**: POST  
**Authentication**: Required  
**Data**:
```json
{
  "user": 1,
  "audio_file": "[file upload]",
  "title": "Memory Title",
  "description": "Memory Description",
  "date_recorded": "2025-04-25",
  "duration": 120
}
```

### List Audio Memories
**URL**: `/api/audio/memories/`  
**Method**: GET  
**Authentication**: Required  
**Data**: None

## Reminder APIs

### Create Reminder
**URL**: `/api/reminders/create/`  
**Method**: POST  
**Authentication**: Required  
**Data**:
```json
{
  "user": 1,
  "title": "Reminder Title",
  "description": "Reminder Description",
  "date_time": "2025-04-25T12:00:00Z",
  "is_completed": false,
  "priority": "high"
}
```

### List Reminders
**URL**: `/api/reminders/create/`  
**Method**: GET  
**Authentication**: Required  
**Data**: None

### Delete Reminder
**URL**: `/api/reminders/`  
**Method**: DELETE  
**Authentication**: Required  
**Data**:
```json
{
  "id": 1
}
```
## Wallpaper APIs

### Upload Wallpaper
**URL**: `/api/reminders/upload_wallpaper/`  
**Method**: `POST`  
**Authentication**: Required  
**Content-Type**: `multipart/form-data`  
**Request Body**:
```json
{
  "image": "[file upload]",
  "description": "A scenic mountain view"
}
```
**Note**: The `uploaded_by` field is automatically set using the authenticated user.
**Response**: Created wallpaper object with fields: id, image, description, uploaded_by, created_at

### Get Random Wallpaper
**URL**: `/api/reminders/random_wallpaper/`  
**Method**: `GET`  
**Authentication**: Required  
**Response**: A randomly selected wallpaper object
```json
{
  "id": 1,
  "image": "https://yourdomain.com/media/wallpapers/mountain.jpg",
  "description": "A scenic mountain view",
  "uploaded_by": 12,
  "created_at": "2025-04-25T14:30:00Z"
}
```