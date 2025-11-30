# OCR + Sentiment Analysis Integration Guide

## Overview
This guide details how to integrate OCR (Optical Character Recognition) with Portuguese BERT sentiment analysis for extracting and analyzing text from images in your EdgeLLM chat application.

---

## Architecture Approach

Given the constraints of React Native and mobile devices, we recommend a **hybrid approach**:

1. **OCR**: Run on-device using `react-native-text-recognition` or `@react-native-ml-kit/text-recognition` (Google ML Kit)
2. **Sentiment Analysis**: Use Hugging Face Inference API (cloud-based) or build a lightweight backend

**Why this approach?**
- Running full BERT models (~110M parameters) on-device is resource-intensive
- Cloud inference provides better performance and accuracy
- OCR can work offline with Google ML Kit
- Hugging Face API is free for limited requests

---

## Step-by-Step Implementation

### **STEP 1: Install Required Dependencies**

```bash
yarn add react-native-image-picker
yarn add @react-native-ml-kit/text-recognition
yarn add react-native-permissions
yarn add axios

# iOS only
cd ios && pod install && cd ..
```

**Note**: You may already have `axios` installed.

---

### **STEP 2: Configure Native Permissions**

#### **Android** (`android/app/src/main/AndroidManifest.xml`)

Add permissions inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.INTERNET" />

<!-- Add camera features -->
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
```

#### **iOS** (`ios/EdgeLLM/Info.plist`)

Add these keys inside `<dict>`:

```xml
<key>NSCameraUsageDescription</key>
<string>We need access to your camera to take photos for OCR sentiment analysis</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to select images for OCR sentiment analysis</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>We need permission to save photos</string>
```

---

### **STEP 3: Create Types**

Add to `src/types/index.ts`:

```typescript
export interface SentimentResult {
  label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  score: number;
}

export interface OCRResult {
  text: string;
  sentiment?: SentimentResult;
  error?: string;
}
```

---

### **STEP 4: Create OCR Service**

Create `src/services/ocrService.ts`:

```typescript
import { TextRecognitionModule } from '@react-native-ml-kit/text-recognition';
import { launchImageLibrary, launchCamera, ImagePickerResponse } from 'react-native-image-picker';
import { Platform, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import { OCRResult } from '../types';

export class OCRService {
  /**
   * Request camera/photo library permissions
   */
  static async requestPermissions(): Promise<boolean> {
    const { check, request, PERMISSIONS, RESULTS } = await import('react-native-permissions');
    
    const permission = Platform.OS === 'ios' 
      ? PERMISSIONS.IOS.CAMERA
      : PERMISSIONS.ANDROID.CAMERA;
    
    const result = await check(permission);
    
    if (result === RESULTS.GRANTED) {
      return true;
    }
    
    if (result === RESULTS.DENIED) {
      const requestResult = await request(permission);
      return requestResult === RESULTS.GRANTED;
    }
    
    return false;
  }

  /**
   * Launch image picker with camera and gallery options
   */
  static async selectImage(): Promise<string | null> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      Alert.alert(
        'Permission Denied',
        'Camera and photo library access is required to analyze images.'
      );
      return null;
    }

    return new Promise((resolve) => {
      Alert.alert(
        'Select Image',
        'Choose an option',
        [
          { text: 'Camera', onPress: () => this.launchCameraPicker(resolve) },
          { text: 'Photo Library', onPress: () => this.launchLibraryPicker(resolve) },
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) }
        ]
      );
    });
  }

  /**
   * Launch camera picker
   */
  private static async launchCameraPicker(resolve: (uri: string | null) => void) {
    launchCamera(
      {
        mediaType: 'photo',
        quality: 1,
        maxWidth: 2048,
        maxHeight: 2048,
      },
      (response: ImagePickerResponse) => {
        if (response.didCancel || response.errorMessage) {
          resolve(null);
        } else if (response.assets && response.assets[0]) {
          resolve(response.assets[0].uri || null);
        }
      }
    );
  }

  /**
   * Launch photo library picker
   */
  private static async launchLibraryPicker(resolve: (uri: string | null) => void) {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 1,
        maxWidth: 2048,
        maxHeight: 2048,
      },
      (response: ImagePickerResponse) => {
        if (response.didCancel || response.errorMessage) {
          resolve(null);
        } else if (response.assets && response.assets[0]) {
          resolve(response.assets[0].uri || null);
        }
      }
    );
  }

  /**
   * Extract text from image using Google ML Kit
   */
  static async extractText(imageUri: string): Promise<string> {
    try {
      // Convert URI to platform-specific path
      let filePath = imageUri;
      if (imageUri.startsWith('file://')) {
        filePath = imageUri.replace('file://', '');
      } else if (Platform.OS === 'android' && !imageUri.startsWith('/')) {
        // Handle content:// URIs on Android
        // You might need additional handling here
        filePath = imageUri;
      }

      const result = await TextRecognitionModule.recognize(filePath);
      
      if (result.text) {
        return result.text.trim();
      }
      
      throw new Error('No text detected in image');
    } catch (error) {
      console.error('OCR Error:', error);
      throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Full OCR pipeline: select image, extract text
   */
  static async performOCR(): Promise<OCRResult> {
    try {
      const imageUri = await this.selectImage();
      if (!imageUri) {
        return { text: '', error: 'No image selected' };
      }

      const extractedText = await this.extractText(imageUri);
      
      if (!extractedText || extractedText.length === 0) {
        return { text: '', error: 'No text found in image' };
      }

      return { text: extractedText };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { text: '', error: errorMessage };
    }
  }
}
```

---

### **STEP 5: Create Sentiment Analysis Service**

Create `src/services/sentimentService.ts`:

```typescript
import axios from 'axios';
import { SentimentResult } from '../types';

/**
 * Using Hugging Face Inference API for sentiment analysis
 * Free tier: 30,000 requests/month
 * No API key required for public models
 */
export class SentimentService {
  private static readonly API_URL = 'https://api-inference.huggingface.co/models';
  private static readonly MODEL_NAME = 'neuralmind/bert-base-portuguese-cased';

  /**
   * Analyze sentiment of Portuguese text using BERT
   */
  static async analyzeSentiment(text: string): Promise<SentimentResult> {
    try {
      const response = await axios.post(
        `${this.API_URL}/${this.MODEL_NAME}`,
        { inputs: text },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds
        }
      );

      // Handle Hugging Face API response
      // Note: BERT base model outputs embeddings, not direct sentiment labels
      // You might need a fine-tuned sentiment model instead
      
      if (response.data && response.data.length > 0) {
        const firstResult = response.data[0];
        
        // This is a placeholder - you'll need to adapt based on your specific use case
        // For actual sentiment classification, consider using a fine-tuned model like:
        // 'pierreguillou/bert-base-cased-pt-lenerbr' or train your own
        
        return {
          label: 'POSITIVE', // Placeholder - implement based on your needs
          score: 0.5,
        };
      }

      throw new Error('Invalid response from sentiment API');
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 503) {
        throw new Error('Model is loading. Please try again in a few seconds.');
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Sentiment analysis failed: ${errorMessage}`);
    }
  }

  /**
   * Alternative: Use a fine-tuned sentiment model
   * Example: Using a Portuguese sentiment model from Hugging Face
   */
  static async analyzeSentimentFineTuned(text: string): Promise<SentimentResult> {
    // Option 1: Use 'cardiffnlp/twitter-xlm-roberta-base-sentiment' (multilingual)
    // Option 2: Use 'momon-ai/portuguese-sentiment-analysis' if available
    // Option 3: Fine-tune BERTimbau specifically for sentiment
    
    const SENTIMENT_MODEL = 'cardiffnlp/twitter-xlm-roberta-base-sentiment';
    
    try {
      const response = await axios.post(
        `${this.API_URL}/${SENTIMENT_MODEL}`,
        { inputs: text },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );

      if (response.data && response.data[0]) {
        const result = response.data[0];
        
        // Extract highest score label
        const sortedResults = result.sort((a: any, b: any) => b.score - a.score);
        const topResult = sortedResults[0];
        
        return {
          label: topResult.label as 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL',
          score: topResult.score,
        };
      }

      throw new Error('Invalid response from sentiment API');
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      throw new Error(`Sentiment analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
```

---

### **STEP 6: Create useOCR Hook**

Create `src/hooks/useOCR.ts`:

```typescript
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { OCRService } from '../services/ocrService';
import { SentimentService } from '../services/sentimentService';
import { OCRResult } from '../types';

export const useOCR = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<OCRResult | null>(null);

  /**
   * Process image: OCR + Sentiment Analysis
   */
  const processImage = useCallback(async (): Promise<OCRResult> => {
    setIsProcessing(true);
    setLastResult(null);

    try {
      // Step 1: Select and extract text from image
      const ocrResult = await OCRService.performOCR();
      
      if (ocrResult.error || !ocrResult.text) {
        setLastResult(ocrResult);
        return ocrResult;
      }

      // Step 2: Analyze sentiment
      try {
        const sentiment = await SentimentService.analyzeSentimentFineTuned(ocrResult.text);
        
        const finalResult: OCRResult = {
          text: ocrResult.text,
          sentiment,
        };
        
        setLastResult(finalResult);
        return finalResult;
      } catch (sentimentError) {
        // If sentiment fails, still return OCR result
        console.warn('Sentiment analysis failed, returning OCR only:', sentimentError);
        
        const finalResult: OCRResult = {
          text: ocrResult.text,
        };
        
        setLastResult(finalResult);
        return finalResult;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to process image: ${errorMessage}`);
      
      const errorResult: OCRResult = {
        text: '',
        error: errorMessage,
      };
      
      setLastResult(errorResult);
      return errorResult;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    lastResult,
    processImage,
  };
};
```

---

### **STEP 7: Update ChatScreen Component**

Update `src/components/ChatScreen.tsx` to add camera button:

```typescript
// Add import at top
import { useOCR } from "../hooks/useOCR";

// Add to interface
interface ChatScreenProps {
  // ... existing props
  onOCRResult?: (result: OCRResult) => void;
}

// Inside component, add hook:
export const ChatScreen: React.FC<ChatScreenProps> = ({
  // ... existing props
  onOCRResult,
}) => {
  const { isListening, partialResults, toggleListening } = useVoice(onChangeInput);
  const { isProcessing, processImage } = useOCR();

  // Add handler
  const handleOCRPress = async () => {
    const result = await processImage();
    if (result.text && onOCRResult) {
      onOCRResult(result);
    }
  };

  // ... existing code

  return (
    <>
      {/* ... existing JSX ... */}
      
      <View style={styles.bottomContainer}>
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            {/* Add OCR Camera Button */}
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={handleOCRPress}
              disabled={isGenerating || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Text style={styles.cameraIcon}>📷</Text>
              )}
            </TouchableOpacity>

            {/* Existing mic button */}
            <TouchableOpacity
              style={styles.micButton}
              onPress={toggleListening}
              disabled={isGenerating || isProcessing}
            >
              {/* ... existing code ... */}
            </TouchableOpacity>

            {/* ... rest of existing code ... */}
          </View>
        </View>
      </View>
    </>
  );
};

// Add to styles:
const styles = StyleSheet.create({
  // ... existing styles ...
  cameraButton: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 50,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cameraIcon: {
    fontSize: 24,
  },
});
```

---

### **STEP 8: Update App.tsx to Handle OCR Results**

Update `App.tsx` to integrate OCR results into the chat:

```typescript
// Add import
import { OCRResult } from "./src/types";

// Add handler function in App component:
const handleOCRResult = async (result: OCRResult) => {
  if (!result.text) {
    Alert.alert('Error', result.error || 'No text found in image');
    return;
  }

  // Format the message with OCR and sentiment results
  let message = `📷 **Image Text:**\n${result.text}\n\n`;
  
  if (result.sentiment) {
    const emoji = result.sentiment.label === 'POSITIVE' ? '😊' 
                 : result.sentiment.label === 'NEGATIVE' ? '😞' 
                 : '😐';
    
    message += `${emoji} **Sentiment:** ${result.sentiment.label} (${(result.sentiment.score * 100).toFixed(1)}%)`;
  }

  // Send as user message
  await sendMessage(message);
};

// Pass to ChatScreen:
<ChatScreen
  // ... existing props
  onOCRResult={handleOCRResult}
/>
```

---

### **STEP 9: Update MessageBubble for Better OCR Display**

Optional: Enhance `MessageBubble.tsx` to better display OCR results:

```typescript
// Add to MessageBubble component for better OCR formatting
const isOCRResult = message.content.includes('📷 **Image Text:**');

// In render:
{isOCRResult && (
  <View style={styles.ocrContainer}>
    {/* You can add special styling for OCR results */}
  </View>
)}
```

---

## Alternative: Local Sentiment Analysis (Advanced)

If you prefer to avoid cloud API:

### **Option A: Use Transformers.js (Complex)**
- Convert BERT model to ONNX format
- Use `onnxruntime-react-native` or `@tensorflow/tfjs-react-native`
- Requires significant setup and larger app size (~500MB+)

### **Option B: Build a Backend**
```python
# Python FastAPI backend example
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()
model = AutoModelForSequenceClassification.from_pretrained('neuralmind/bert-base-portuguese-cased')
tokenizer = AutoTokenizer.from_pretrained('neuralmind/bert-base-portuguese-cased')

@app.post("/analyze")
async def analyze_sentiment(text: str):
    inputs = tokenizer(text, return_tensors="pt")
    outputs = model(**inputs)
    # Process and return sentiment
    return {"sentiment": "positive", "score": 0.95}
```

---

## Testing

1. **Test OCR**:
   - Take a photo with Portuguese text
   - Verify text extraction accuracy

2. **Test Sentiment**:
   - Use various Portuguese texts:
     - "Estou muito feliz hoje!" (positive)
     - "Que dia terrível" (negative)
     - "O tempo está nublado" (neutral)

3. **Test Integration**:
   - Full flow: Photo → OCR → Sentiment → Chat display

---

## Troubleshooting

### **OCR Issues**
- **No text detected**: Ensure good lighting and focus
- **Wrong text**: Improve image quality
- **Permission errors**: Check Info.plist and AndroidManifest.xml

### **Sentiment API Issues**
- **503 errors**: Model is loading, retry after 30 seconds
- **Rate limits**: Use alternative model or add retries
- **Offline**: Implement fallback or use local model

### **Performance Issues**
- **Slow OCR**: Reduce image resolution
- **Slow sentiment**: Use caching for repeated texts
- **Memory issues**: Optimize image preprocessing

---

## Next Steps

1. **Fine-tune BERT** for better Portuguese sentiment accuracy
2. **Add caching** for repeated sentiment analyses
3. **Implement batch processing** for multiple images
4. **Add confidence thresholds** to filter low-quality OCR results
5. **Consider alternatives**: Google Cloud Vision API, AWS Textract

---

## Resources

- [React Native ML Kit Docs](https://react-native-ml-kit.github.io/react-native-ml-kit/)
- [Hugging Face Inference API](https://huggingface.co/docs/api-inference/index)
- [BERTimbau Paper](https://github.com/neuralmind-ai/portuguese-bert)
- [Português Sentiment Models](https://huggingface.co/models?language=pt&pipeline_tag=text-classification&sort=downloads)

---

## Summary

This integration provides:
✅ **On-device OCR** using Google ML Kit
✅ **Cloud-based sentiment** using Hugging Face API
✅ **Seamless chat integration** with existing architecture
✅ **Portuguese language support**
✅ **Graceful error handling**

The implementation follows your existing patterns (hooks, services, components) and extends the chat experience with image-based sentiment analysis.
