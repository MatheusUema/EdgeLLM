import Tts from 'react-native-tts';
import Voice from '@react-native-voice/voice';
import { PedagogyQuestion } from '../types';

/**
 * Service for text-to-speech conversion and voice recognition
 */
export class TTSService {
  private static isInitialized = false;

  /**
   * Initialize TTS service
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await Tts.setDefaultLanguage('en-US');
      await Tts.setDefaultRate(0.5);
      await Tts.setDefaultPitch(1.0);
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing TTS:', error);
      throw error;
    }
  }

  /**
   * Convert question text to speech and capture via voice recognition
   * @param question - The question to speak
   * @returns The recognized text from speech
   */
  static async speakAndCapture(question: PedagogyQuestion): Promise<string> {
    await this.initialize();

    const questionText = this.formatQuestionForSpeech(question);

    return new Promise((resolve, reject) => {
      let recognizedText = '';
      let speechEnded = false;
      let recognitionStarted = false;

      // Declare TTS handlers and cleanup function (will be defined later)
      let handleTtsFinish: () => void;
      let handleTtsCancel: () => void;
      let cleanupTtsListeners: () => void;

      // Set up voice recognition listener
      const onSpeechResults = (event: any) => {
        if (event.value && event.value.length > 0) {
          recognizedText = event.value[0];
        }
      };

      const onSpeechEnd = async () => {
        speechEnded = true;
        Voice.removeAllListeners();
        cleanupTtsListeners();
        try {
          await Voice.stop();
          await Voice.cancel();
        } catch (error) {
          // Ignore errors when stopping
        }
        
        // Wait a bit for recognition to complete
        setTimeout(() => {
          resolve(recognizedText || questionText);
        }, 500);
      };

      const onSpeechError = (error: any) => {
        console.error('Speech recognition error:', error);
        Voice.removeAllListeners();
        cleanupTtsListeners();
        // Fallback to original text if recognition fails
        resolve(questionText);
      };

      // Set up TTS event listeners (defined after onSpeechEnd)
      handleTtsFinish = () => {
        // Speech finished, wait for recognition
        setTimeout(() => {
          if (!speechEnded) {
            onSpeechEnd();
          }
        }, 2000);
      };

      handleTtsCancel = () => {
        setTimeout(() => {
          if (!speechEnded) {
            onSpeechEnd();
          }
        }, 2000);
      };

      // Cleanup function for TTS listeners
      cleanupTtsListeners = () => {
        Tts.removeEventListener('tts-finish', handleTtsFinish);
        Tts.removeEventListener('tts-cancel', handleTtsCancel);
      };

      // Start voice recognition first
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechError = onSpeechError;

      Voice.start('en-US')
        .then(() => {
          recognitionStarted = true;
          
          Tts.addEventListener('tts-finish', handleTtsFinish);
          Tts.addEventListener('tts-cancel', handleTtsCancel);
          
          // Speak the question
          Tts.speak(questionText);
        })
        .catch((error) => {
          console.error('Error starting voice recognition:', error);
          Voice.removeAllListeners();
          cleanupTtsListeners();
          // Fallback to original text
          resolve(questionText);
        });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!speechEnded) {
          Voice.removeAllListeners();
          cleanupTtsListeners();
          try {
            Voice.stop();
            Voice.cancel();
          } catch (error) {
            // Ignore
          }
          Tts.stop();
          resolve(recognizedText || questionText);
        }
      }, 10000);
    });
  }

  /**
   * Format question for speech (simplified version)
   */
  static formatQuestionForSpeech(question: PedagogyQuestion): string {
    return `${question.question} A. ${question.answer_a} B. ${question.answer_b} C. ${question.answer_c} D. ${question.answer_d}`;
  }

  /**
   * Stop all TTS and voice recognition
   */
  static async stop(): Promise<void> {
    try {
      await Tts.stop();
      await Voice.stop();
      await Voice.cancel();
      Voice.removeAllListeners();
    } catch (error) {
      console.error('Error stopping TTS/Voice:', error);
    }
  }
}
