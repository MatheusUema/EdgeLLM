import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Keyboard } from "react-native";
import { Message } from "../types";
import { MessageBubble } from "./MessageBubble";
import { useVoice } from "../hooks/useVoice";
import { useImagePicker } from "../hooks/useImagePicker";
import TextRecognition, { TextRecognitionScript } from "@react-native-ml-kit/text-recognition";

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
}) => {
  const { isListening, partialResults, toggleListening } = useVoice(onChangeInput);
  const { isProcessing, selectImage } = useImagePicker();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

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
});

