import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  ImagePickerResponse,
  CameraOptions,
  ImageLibraryOptions,
} from 'react-native-image-picker';

interface ImagePickerResult {
  uri: string;
  type?: string;
  fileName?: string;
  fileSize?: number;
}

export const useImagePicker = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Request camera permissions
   */
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { check, request, PERMISSIONS, RESULTS } = await import('react-native-permissions');
      
      const permission =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.CAMERA
          : PERMISSIONS.ANDROID.CAMERA;

      // Check current status
      const checkResult = await check(permission);
      if (checkResult === RESULTS.GRANTED) {
        return true;
      }

      // Request permission
      const requestResult = await request(permission);
      return requestResult === RESULTS.GRANTED;
    } catch (error) {
      console.error('Permission error:', error);
      // If permissions library fails, try anyway (react-native-image-picker may handle it)
      return true;
    }
  }, []);

  /**
   * Request photo library permissions
   */
  const requestPhotoLibraryPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { check, request, PERMISSIONS, RESULTS } = await import('react-native-permissions');
      
      const permission =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.PHOTO_LIBRARY
          : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;

      // Check current status
      const checkResult = await check(permission);
      if (checkResult === RESULTS.GRANTED) {
        return true;
      }

      // Request permission
      const requestResult = await request(permission);
      return requestResult === RESULTS.GRANTED;
    } catch (error) {
      console.error('Permission error:', error);
      // If permissions library fails, try anyway (react-native-image-picker may handle it)
      // iOS especially may handle permissions through the system picker
      return Platform.OS === 'ios';
    }
  }, []);

  /**
   * Launch camera to take a photo
   */
  const takePhoto = useCallback(async (): Promise<ImagePickerResult | null> => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Denied',
        'Camera access is required to take photos. Please enable it in your device settings.'
      );
      return null;
    }

    setIsProcessing(true);

    return new Promise((resolve) => {
      const options: CameraOptions = {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 2048,
        maxHeight: 2048,
        saveToPhotos: false,
      };

      launchCamera(options, (response: ImagePickerResponse) => {
        setIsProcessing(false);

        if (response.didCancel) {
          resolve(null);
          return;
        }

        if (response.errorMessage) {
          Alert.alert('Error', `Camera error: ${response.errorMessage}`);
          resolve(null);
          return;
        }

        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          resolve({
            uri: asset.uri || '',
            type: asset.type,
            fileName: asset.fileName,
            fileSize: asset.fileSize,
          });
        } else {
          resolve(null);
        }
      });
    });
  }, [requestCameraPermission]);

  /**
   * Launch image library to select a photo
   */
  const pickImage = useCallback(async (): Promise<ImagePickerResult | null> => {
    const hasPermission = await requestPhotoLibraryPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Denied',
        'Photo library access is required to select images. Please enable it in your device settings.'
      );
      return null;
    }

    setIsProcessing(true);

    return new Promise((resolve) => {
      const options: ImageLibraryOptions = {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 2048,
        maxHeight: 2048,
        selectionLimit: 1,
      };

      launchImageLibrary(options, (response: ImagePickerResponse) => {
        setIsProcessing(false);

        if (response.didCancel) {
          resolve(null);
          return;
        }

        if (response.errorMessage) {
          Alert.alert('Error', `Image picker error: ${response.errorMessage}`);
          resolve(null);
          return;
        }

        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          resolve({
            uri: asset.uri || '',
            type: asset.type,
            fileName: asset.fileName,
            fileSize: asset.fileSize,
          });
        } else {
          resolve(null);
        }
      });
    });
  }, [requestPhotoLibraryPermission]);

  /**
   * Show action sheet to choose between camera and gallery
   */
  const selectImage = useCallback(async (): Promise<ImagePickerResult | null> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Select Image',
        'Choose an option',
        [
          {
            text: 'Camera',
            onPress: async () => {
              const result = await takePhoto();
              resolve(result);
            },
          },
          {
            text: 'Photo Library',
            onPress: async () => {
              const result = await pickImage();
              resolve(result);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(null),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(null) }
      );
    });
  }, [takePhoto, pickImage]);

  return {
    isProcessing,
    takePhoto,
    pickImage,
    selectImage,
    requestCameraPermission,
    requestPhotoLibraryPermission,
  };
};
