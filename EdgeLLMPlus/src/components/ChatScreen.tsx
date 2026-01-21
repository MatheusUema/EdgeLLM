import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Keyboard, Platform } from "react-native";
import { Message, LlamaContext } from "../types";
import { MessageBubble } from "./MessageBubble";
import { useVoice } from "../hooks/useVoice";
import { useImagePicker } from "../hooks/useImagePicker";
import { UseBenchmarkReturn } from "../hooks/useBenchmark";
import TextRecognition, { TextRecognitionScript } from "@react-native-ml-kit/text-recognition";
import { QuestionImageService } from "../services/questionImageService";

interface ChatScreenProps {
  selectedGGUF: string | null;
  conversation: Message[];
  tokensPerSecond: number[];
  completionTimes: number[];
  onToggleThought: (index: number) => void;
  userInput: string;
  onChangeInput: (text: string) => void;
  onSendMessage: () => void;
  onStopGeneration: () => void;
  onBackToSelection: () => void;
  isGenerating: boolean;
  onImageSelected?: (imageUri: string, extractedText?: string) => void;
  showInputArea?: boolean;
  context: LlamaContext | null;
  benchmark: UseBenchmarkReturn;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  selectedGGUF,
  conversation,
  tokensPerSecond,
  completionTimes,
  onToggleThought,
  userInput,
  onChangeInput,
  onSendMessage,
  onStopGeneration,
  onBackToSelection,
  isGenerating,
  onImageSelected,
  showInputArea = false,
  context,
  benchmark,
}) => {
  const { isListening, partialResults, toggleListening } = useVoice(onChangeInput);
  const { isProcessing, selectImage } = useImagePicker();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const isBenchmarkRunning = benchmark.isRunning;
  const benchmarkProgress = benchmark.progress;
  const currentTest = benchmark.currentTest;
  const totalTests = benchmark.totalTests;
  const startBenchmark = benchmark.startBenchmark;
  const benchmarkError = benchmark.error;
  const lastAutoSentQuestionIdRef = useRef<number | null>(null);
  const lastAutoSentImageQuestionIdRef = useRef<number | null>(null);

  const displayText = isListening && partialResults ? partialResults : userInput;

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // If a benchmark is running, instantly fill the current question into the chat input area and auto-send.
  useEffect(() => {
    if (!showInputArea) return;
    if (!isBenchmarkRunning) return;
    if (!benchmark.currentQuestionText) return;
    if (benchmark.currentQuestionId && lastAutoSentQuestionIdRef.current === benchmark.currentQuestionId) return;
    if (isListening || isProcessing || isGenerating) return;

    const textToSend = benchmark.currentQuestionText;
    onChangeInput(textToSend);

    // Auto-send (guarded) right after filling the input.
    const timeoutId = setTimeout(() => {
      if (benchmark.isRunning && benchmark.currentQuestionText === textToSend) {
        if (benchmark.currentQuestionId) {
          lastAutoSentQuestionIdRef.current = benchmark.currentQuestionId;
        }
        void onSendMessage();
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    benchmark.currentQuestionText,
    benchmark.currentQuestionId,
    isBenchmarkRunning,
    isGenerating,
    isListening,
    isProcessing,
    onChangeInput,
    showInputArea,
  ]);

  // If a benchmark is running and we are in IMAGE modality, auto-send the pre-generated question image
  // through the exact same pathway as handleImagePress: OCR -> onImageSelected(imageUri, extractedText).
  useEffect(() => {
    if (!showInputArea) return;
    if (!isBenchmarkRunning) return;
    if (benchmark.currentModality !== "image") return;
    if (!benchmark.currentQuestionId) return;
    if (!onImageSelected) return;
    if (lastAutoSentImageQuestionIdRef.current === benchmark.currentQuestionId) return;
    if (isListening || isProcessing || isGenerating) return;

    const questionId = benchmark.currentQuestionId;

    const run = async () => {
      try {
        // Android-first: copy the asset into cache and use a file:// URI for OCR.
        const fileUri = await QuestionImageService.ensureReadableFileUri(questionId);
        if (!fileUri) {
          console.warn(`[benchmark:image] No readable image URI for question ${questionId}`);
          lastAutoSentImageQuestionIdRef.current = questionId;
          return;
        }

        const ocrUri = fileUri;

        try {
          const recognizedText = await TextRecognition.recognize(ocrUri);
          const extractedText = recognizedText.text || "";
          lastAutoSentImageQuestionIdRef.current = questionId;
          onImageSelected(ocrUri, extractedText);
        } catch (ocrError) {
          console.error("[benchmark:image] Text recognition error:", ocrError);
          lastAutoSentImageQuestionIdRef.current = questionId;
          onImageSelected(ocrUri, undefined);
        }
      } catch (e) {
        console.error("[benchmark:image] Failed to auto-send image:", e);
        lastAutoSentImageQuestionIdRef.current = questionId;
      }
    };

    // Defer a tick so layout/state settles (similar to text auto-send)
    const timeoutId = setTimeout(() => {
      void run();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [
    benchmark.currentModality,
    benchmark.currentQuestionId,
    isBenchmarkRunning,
    isGenerating,
    isListening,
    isProcessing,
    onImageSelected,
    showInputArea,
  ]);

  const handleImagePress = async () => {
    const result = await selectImage();
    if (result && result.uri && onImageSelected) {
      try {
        // Extract text from the image using ML Kit
        const recognizedText = await TextRecognition.recognize(result.uri);
        const extractedText = recognizedText.text || "";
        
        // Call the callback with both image URI and extracted text
        onImageSelected(result.uri, extractedText);
      } catch (error) {
        console.error("Text recognition error:", error);
        // If text recognition fails, still pass the image URI
        onImageSelected(result.uri, undefined);
      }
    }
  };

  if (showInputArea) {
    return (
      <View style={[styles.bottomContainer, { paddingBottom: isKeyboardVisible ? 20 : 4, marginBottom: isKeyboardVisible ? 8 : 0 }]}>
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.imageButton}
              onPress={handleImagePress}
              disabled={isGenerating || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Text style={styles.imageIcon}>📷</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.micButton}
              onPress={toggleListening}
              disabled={isGenerating || isProcessing}
            >
              {isListening ? (
                <View style={styles.listeningIndicator}>
                  <ActivityIndicator size="small" color="#FF3B30" />
                </View>
              ) : (
                <Text style={styles.micIcon}>🎤</Text>
              )}
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder={isListening ? "Listening..." : "Type your message..."}
              placeholderTextColor="#94A3B8"
              value={displayText}
              onChangeText={onChangeInput}
              editable={!isListening && !isProcessing}
              multiline={true}
              textAlignVertical="top"
            />
            {isGenerating ? (
              <TouchableOpacity style={styles.stopButton} onPress={onStopGeneration}>
                <Text style={styles.buttonText}>□ Stop</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.sendButton} onPress={onSendMessage}>
                <Text style={styles.buttonText}>Send</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.chatWrapper}>
      <Text style={styles.subtitle}>Chatting with {selectedGGUF}</Text>
      
      {/* Benchmark Button */}
      {!showInputArea && (
        <TouchableOpacity
          style={[
            styles.benchmarkButton,
            (isBenchmarkRunning || isGenerating) && styles.benchmarkButtonDisabled,
          ]}
          onPress={startBenchmark}
          disabled={isBenchmarkRunning || isGenerating}
        >
          {isBenchmarkRunning ? (
            <View style={styles.benchmarkButtonContent}>
              <ActivityIndicator size="small" color="#FFFFFF" style={styles.benchmarkSpinner} />
              <Text style={styles.benchmarkButtonText}>
                Running Benchmark... {benchmarkProgress}%
              </Text>
            </View>
          ) : (
            <Text style={styles.benchmarkButtonText}>🚀 Run Benchmark</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Benchmark Progress Indicator */}
      {isBenchmarkRunning && !showInputArea && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${benchmarkProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Test {currentTest} of {totalTests}
          </Text>
        </View>
      )}

      {/* Benchmark Error Display */}
      {benchmarkError && !showInputArea && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {benchmarkError}</Text>
        </View>
      )}

      <View style={styles.chatContainer}>
        <Text style={styles.greetingText}>
          🦙 Welcome! The LLM is ready to chat. Ask away! 🎉
        </Text>
        {conversation.slice(1).map((msg, index) => (
          <MessageBubble
            key={index}
            message={msg}
            index={index + 1}
            tokensPerSecond={tokensPerSecond[Math.floor(index / 2)]}
            completionTime={completionTimes[Math.floor(index / 2)]}
            onToggleThought={onToggleThought}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chatWrapper: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 16,
    color: "#93C5FD",
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginVertical: 12,
    color: "#64748B",
  },
  bottomContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingBottom: 20,
    marginBottom: 8,
  },
  inputContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  input: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 8,
    paddingTop: 8,
    fontSize: 14,
    color: "#334155",
    minHeight: 50,
    maxHeight: 120,
  },
  inputRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
  },
  imageButton: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 42,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 2,
  },
  imageIcon: {
    fontSize: 16,
  },
  micButton: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 42,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 2,
  },
  micIcon: {
    fontSize: 16,
  },
  listeningIndicator: {
    paddingVertical: 4,
  },
  sendButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    alignSelf: "flex-start",
    justifyContent: "center",
    marginTop: 2,
  },
  stopButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: "flex-start",
    justifyContent: "center",
    marginTop: 2,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  benchmarkButton: {
    backgroundColor: "#10B981",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  benchmarkButtonDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0.1,
  },
  benchmarkButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  benchmarkSpinner: {
    marginRight: 8,
  },
  benchmarkButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  progressContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    fontWeight: "500",
  },
  errorContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    textAlign: "center",
  },
});

