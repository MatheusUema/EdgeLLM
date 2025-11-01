import { useState, useEffect, useCallback } from "react";
import Voice from "@react-native-voice/voice";

export const useVoice = (
  onSpeechResult: (text: string) => void
) => {
  const [isListening, setIsListening] = useState(false);
  const [partialResults, setPartialResults] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set up voice recognition event handlers
    Voice.onSpeechStart = () => {
      setIsListening(true);
      setError(null);
    };

    Voice.onSpeechEnd = () => {
      setIsListening(false);
    };

    Voice.onSpeechResults = (event) => {
      if (event.value && event.value.length > 0) {
        const finalText = event.value[0];
        setPartialResults("");
        onSpeechResult(finalText);
      }
    };

    Voice.onSpeechPartialResults = (event) => {
      if (event.value && event.value.length > 0) {
        setPartialResults(event.value[0]);
      }
    };

    Voice.onSpeechError = (event) => {
      console.error("Speech recognition error:", event);
      setIsListening(false);
      setError(event.error?.message || "Speech recognition error");
    };

    // Clean up listeners on unmount
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [onSpeechResult]);

  const startListening = useCallback(async () => {
    try {
      await Voice.start("pt-BR");
    } catch (err) {
      console.error("Error starting speech recognition:", err);
      setError("Failed to start listening");
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      await Voice.stop();
    } catch (err) {
      console.error("Error stopping speech recognition:", err);
    }
  }, []);

  const cancelListening = useCallback(async () => {
    try {
      await Voice.cancel();
      setIsListening(false);
      setPartialResults("");
    } catch (err) {
      console.error("Error canceling speech recognition:", err);
    }
  }, []);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    partialResults,
    error,
    startListening,
    stopListening,
    cancelListening,
    toggleListening,
  };
};

