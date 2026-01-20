# Image Picker Setup Guide

## Overview
This guide explains how to set up and use the image picker feature in the chat application. Users can now take photos with the camera or select images from the gallery to share in chat messages.

## Installation Steps

### 1. Install Dependencies

Run the following command to install the required packages:

```bash
yarn install
# or
npm install
```

The following packages are required:
- `react-native-image-picker` - For camera and gallery access
- `react-native-permissions` - For handling permissions
- `react-native-image-crop-picker` - For cropping images before OCR

### 2. iOS Setup

For iOS, you need to install CocoaPods dependencies:

```bash
cd ios
pod install
cd ..
```

**Note**: The iOS permissions have been added to `Info.plist`:
- `NSCameraUsageDescription` - Camera access
- `NSPhotoLibraryUsageDescription` - Photo library access
- `NSPhotoLibraryAddUsageDescription` - Save photos permission

### 3. Android Setup

For Android, the permissions have been added to `AndroidManifest.xml`:
- `CAMERA` - Camera access
- `READ_EXTERNAL_STORAGE` - Read external storage (Android < 13)
- `READ_MEDIA_IMAGES` - Read images (Android 13+)

No additional setup is required for Android.

### 4. Rebuild the App

After installing dependencies, rebuild the app:

**Android:**
```bash
yarn android
```

**iOS:**
```bash
yarn ios
```

## Usage

### For Users

1. **Take a Photo**: 
   - Tap the 📷 button in the chat input area
   - Select "Camera" from the action sheet
   - Take a photo
   - Crop the image as needed, then confirm
   - The image will be automatically added to the chat

2. **Select from Gallery**:
   - Tap the 📷 button in the chat input area
   - Select "Photo Library" from the action sheet
   - Choose an image from your gallery
   - Crop the image as needed, then confirm
   - The image will be automatically added to the chat

### Features

- **Camera Access**: Take photos directly from the app
- **Gallery Access**: Select existing photos from the device gallery
- **Crop Before OCR**: Crop images before they are sent to OCR
- **Image Display**: Images are displayed in chat messages
- **Permission Handling**: Automatic permission requests with user-friendly messages
- **Error Handling**: Graceful error handling for denied permissions or failed operations

## Technical Details

### Architecture

- **Hook**: `useImagePicker` - Handles image selection and permissions
- **Component**: `ChatScreen` - Displays the image picker button
- **Component**: `MessageBubble` - Displays images in chat messages
- **Types**: `Message` interface extended with `imageUri` property

### File Structure

```
src/
├── hooks/
│   └── useImagePicker.ts       # Image picker hook
├── components/
│   ├── ChatScreen.tsx          # Chat screen with image button
│   └── MessageBubble.tsx       # Message display with image support
└── types/
    └── index.ts                # Message type with imageUri
```

### Permissions

The app requests permissions at runtime:
- **Camera**: Required for taking photos
- **Photo Library**: Required for selecting images

Permissions are requested when the user first taps the image button.

## Troubleshooting

### Permission Denied

If permissions are denied:
1. Go to device settings
2. Find the app in the application list
3. Grant camera and photo library permissions manually

### Images Not Displaying

1. Check that the image URI is valid
2. Verify permissions are granted
3. Check console logs for errors

### iOS Build Issues

If you encounter build issues on iOS:
1. Clean the build folder: `cd ios && rm -rf build && cd ..`
2. Reinstall pods: `cd ios && pod install && cd ..`
3. Rebuild the app: `yarn ios`

### Android Build Issues

If you encounter build issues on Android:
1. Clean the build: `cd android && ./gradlew clean && cd ..`
2. Rebuild the app: `yarn android`

## Next Steps

To extend this feature, you could:
1. Add image compression before sending
2. Add image editing capabilities
3. Support multiple image selection
4. Add image preview before sending
5. Implement image caching
6. Add OCR (Optical Character Recognition) for text extraction
7. Add sentiment analysis for text in images

## Notes

- Images are stored locally on the device
- No images are uploaded to external servers
- Image quality is set to 0.8 (80%) to balance quality and file size
- Maximum image dimensions are 2048x2048 pixels
