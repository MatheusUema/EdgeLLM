import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import ImageCropPicker, { Image as CropImage } from 'react-native-image-crop-picker';

interface ImagePickerResult {
  uri: string;
  type?: string;
  fileName?: string;
  fileSize?: number;
}

export const useImagePicker = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const normalizeFileUri = useCallback((path: string) => {
    if (!path) {
      return '';
    }
    return path.startsWith('file://') ? path : `file://${path}`;
  }, []);

  const mapCropResult = useCallback(
    (image: CropImage): ImagePickerResult => ({
      uri: normalizeFileUri(image.path),
      type: image.mime,
      fileName: image.filename,
      fileSize: image.size,
    }),
    [normalizeFileUri]
  );

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
      // If permissions library fails, try anyway (native picker may still handle it)
      return true;
    }
  }, []);

  /**
   * Request photo library permissions
   */
  const requestPhotoLibraryPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { check, request, PERMISSIONS, RESULTS } = await import('react-native-permissions');
      
      if (Platform.OS === 'ios') {
        const permission = PERMISSIONS.IOS.PHOTO_LIBRARY;
        const checkResult = await check(permission);
        if (checkResult === RESULTS.GRANTED) {
          return true;
        }
        const requestResult = await request(permission);
        return requestResult === RESULTS.GRANTED;
      } else {
        // Android 13+ (API 33+) uses READ_MEDIA_IMAGES instead of READ_EXTERNAL_STORAGE
        // Try READ_MEDIA_IMAGES first for Android 13+
        try {
          const permission = PERMISSIONS.ANDROID.READ_MEDIA_IMAGES;
          const checkResult = await check(permission);
          if (checkResult === RESULTS.GRANTED) {
            return true;
          }
          const requestResult = await request(permission);
          if (requestResult === RESULTS.GRANTED) {
            return true;
          }
        } catch {
          // READ_MEDIA_IMAGES might not be available on older Android versions
        }
        
        // Fallback to READ_EXTERNAL_STORAGE for Android < 13
        try {
          const permission = PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
          const checkResult = await check(permission);
          if (checkResult === RESULTS.GRANTED) {
            return true;
          }
          const requestResult = await request(permission);
          return requestResult === RESULTS.GRANTED;
        } catch {
          // If both fail, return true to let native picker handle it
          return true;
        }
      }
    } catch (error) {
      console.error('Permission error:', error);
      // If permissions library fails, return true to allow native picker to handle it
      // react-native-image-crop-picker handles permissions internally
      return true;
    }
  }, []);

  /**
   * Launch camera to take a photo
   */
  const takePhoto = useCallback(async (): Promise<ImagePickerResult | null> => {
    // Check permission but don't block - let react-native-image-crop-picker handle it
    await requestCameraPermission();

    setIsProcessing(true);

    try {
      const image = await ImageCropPicker.openCamera({
        mediaType: 'photo',
        cropping: true,
        freeStyleCropEnabled: true,
        includeExif: false,
        compressImageQuality: 0.8,
        compressImageMaxWidth: 2048,
        compressImageMaxHeight: 2048,
        useFrontCamera: false,
      });

      return mapCropResult(image);
    } catch (error: any) {
      if (error?.code === 'E_PICKER_CANCELLED') {
        return null;
      }
      // Only show permission alert if it's actually a permission error
      if (error?.code === 'E_PERMISSION_MISSING' || error?.message?.includes('permission')) {
        Alert.alert(
          'Permission Denied',
          'Camera access is required to take photos. Please enable it in your device settings.'
        );
      } else {
        Alert.alert('Error', `Camera error: ${error?.message || 'Unknown error'}`);
      }
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [mapCropResult, requestCameraPermission]);

  /**
   * Launch image library to select a photo
   */
  const pickImage = useCallback(async (): Promise<ImagePickerResult | null> => {
    // Check permission but don't block - let react-native-image-crop-picker handle it
    await requestPhotoLibraryPermission();

    setIsProcessing(true);

    try {
      const image = await ImageCropPicker.openPicker({
        mediaType: 'photo',
        cropping: true,
        freeStyleCropEnabled: true,
        includeExif: false,
        compressImageQuality: 0.8,
        compressImageMaxWidth: 2048,
        compressImageMaxHeight: 2048,
        multiple: false,
      });

      return mapCropResult(image);
    } catch (error: any) {
      if (error?.code === 'E_PICKER_CANCELLED') {
        return null;
      }
      // Only show permission alert if it's actually a permission error
      if (error?.code === 'E_PERMISSION_MISSING' || error?.message?.includes('permission')) {
        Alert.alert(
          'Permission Denied',
          'Photo library access is required to select images. Please enable it in your device settings.'
        );
      } else {
        Alert.alert('Error', `Image picker error: ${error?.message || 'Unknown error'}`);
      }
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [mapCropResult, requestPhotoLibraryPermission]);

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
