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
      let ttsFinishSub: { remove?: () => void } | null = null;
      let ttsCancelSub: { remove?: () => void } | null = null;

      // Set up voice recognition listener
      const onSpeechResults = (event: any) => {
        if (event.value && event.value.length > 0) {
          recognizedText = event.value[0];
          console.log('[TTS] Final recognition result:', recognizedText.substring(0, 50) + '...');
        }
      };

      // Also capture partial results to catch first words
      const onSpeechPartialResults = (event: any) => {
        if (event.value && event.value.length > 0) {
          // Update recognized text with partial results (they're more complete)
          const partial = event.value[0];
          if (partial.length > recognizedText.length) {
            recognizedText = partial;
            console.log('[TTS] Partial recognition:', partial.substring(0, 50) + '...');
          }
        }
      };

      const onSpeechEnd = async () => {
        // Don't stop TTS if it's still speaking - wait for TTS to finish first
        // Voice recognition might end prematurely, but we want TTS to complete
        if (!speechEnded) {
          // Wait a bit to see if TTS finishes naturally
          setTimeout(() => {
            if (!speechEnded) {
              // If TTS hasn't finished yet, don't stop it - let it continue
              // We'll resolve when TTS finishes via handleTtsFinish
              return;
            }
          }, 1000);
        }
      };

      const onSpeechError = (error: any) => {
        // Android commonly emits "7/No match" when it can't confidently match speech.
        // Treat this as a normal outcome (no recognized text) to avoid LogBox noise.
        const code = error?.error?.code ?? error?.code;
        const message = error?.error?.message ?? error?.message;
        if (String(code).includes('7') || String(message).toLowerCase().includes('no match')) {
          console.log('[TTS] Speech recognition: no match');
          return;
        }

        console.warn('[TTS] Speech recognition error:', error);
        // Don't stop TTS on recognition errors; we resolve on tts-finish/timeout.
      };

      // Set up TTS event listeners (defined after onSpeechEnd)
      // Declare timeoutId before it's used
      let timeoutId: NodeJS.Timeout;

      handleTtsFinish = () => {
        // TTS finished speaking - now wait a bit for voice recognition to capture everything
        console.log('[TTS] Speech finished, waiting for recognition to finalize...');
        // Give voice recognition time to process the final words
        // Use a longer delay to ensure all recognition results are captured
        setTimeout(() => {
          if (!speechEnded) {
            // Get the latest recognized text before resolving
            // Voice recognition might still be processing, so we wait a bit more
            setTimeout(() => {
              const finalText = recognizedText || "Failed to recognize speech";
              console.log('[TTS] Resolving with text:', finalText.substring(0, 50) + '...');
              void cleanupAndResolve(finalText);
            }, 1500); // Wait for recognition to finalize
          }
        }, 2500); // Initial wait for recognition to process
      };

      handleTtsCancel = () => {
        // TTS was cancelled - still try to get recognition results
        console.log('[TTS] Speech cancelled');
        setTimeout(() => {
          if (!speechEnded) {
            setTimeout(() => {
              void cleanupAndResolve(recognizedText || "Failed to recognize speech");
            }, 1000);
          }
        }, 1000);
      };

      // Cleanup function for TTS listeners
      cleanupTtsListeners = () => {
        // react-native-tts returns a subscription with .remove()
        // (Tts.removeEventListener may not exist depending on version)
        ttsFinishSub?.remove?.();
        ttsCancelSub?.remove?.();
        ttsFinishSub = null;
        ttsCancelSub = null;
      };

      // Start voice recognition first
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechPartialResults = onSpeechPartialResults;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechError = onSpeechError;

      Voice.start('en-US')
        .then(() => {
          recognitionStarted = true;
          
          ttsFinishSub = Tts.addEventListener('tts-finish', handleTtsFinish) as any;
          ttsCancelSub = Tts.addEventListener('tts-cancel', handleTtsCancel) as any;
          
          // Add a small delay before speaking to ensure voice recognition is fully ready
          // This helps capture the first words
          setTimeout(() => {
            // Speak the question
            Tts.speak(questionText);
          }, 300); // 300ms delay to ensure recognition is ready
        })
        .catch((error) => {
          console.error('Error starting voice recognition:', error);
          // If voice recognition fails, still try to speak and use fallback text
          ttsFinishSub = Tts.addEventListener('tts-finish', handleTtsFinish) as any;
          ttsCancelSub = Tts.addEventListener('tts-cancel', handleTtsCancel) as any;
          Tts.speak(questionText);
          // Will resolve with questionText when TTS finishes
        });

      // Helper to cleanup and resolve (defined after timeoutId)
      const cleanupAndResolve = async (text: string) => {
        if (speechEnded) return; // Already resolved
        speechEnded = true;
        clearTimeout(timeoutId);
        
        // Stop TTS first
        try {
          await Tts.stop();
        } catch (error) {
          // Ignore
        }
        
        // Then stop and cleanup Voice recognition
        cleanupTtsListeners();
        try {
          await Voice.stop();
          await Voice.cancel();
        } catch (error) {
          // Ignore
        }
        
        // Remove all Voice listeners to ensure isListening state resets
        Voice.removeAllListeners();
        
        // Small delay to ensure all cleanup completes before resolving
        setTimeout(() => {
          resolve(text);
        }, 200);
      };

      // Timeout after 2 minutes (longer to allow full TTS + recognition)
      timeoutId = setTimeout(() => {
        if (!speechEnded) {
          console.log('[TTS] Timeout reached, stopping...');
          void cleanupAndResolve(recognizedText || "Failed to recognize speech");
        }
      }, 120000); // 2 minutes timeout
    });
  }

  /**
   * Format question for speech (simplified version)
   */
  static formatQuestionForSpeech(question: PedagogyQuestion): string {
    return `${question.question} A. ${question.answer_a} B. ${question.answer_b} C. ${question.answer_c} D. ${question.answer_d}. Please select the correct answer (A, B, C, or D).`;
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
