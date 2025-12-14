import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Message } from "../types";
import { MessageBubble } from "./MessageBubble";
import { useVoice } from "../hooks/useVoice";
import { useImagePicker } from "../hooks/useImagePicker";
import TextRecognition, { TextRecognitionScript } from "@react-native-ml-kit/text-recognition";

interface ChatScreenProps {
  selectedGGUF: string | null;
  conversation: Message[];
  tokensPerSecond: number[];
  onToggleThought: (index: number) => void;
  userInput: string;
  onChangeInput: (text: string) => void;
  onSendMessage: () => void;
  onStopGeneration: () => void;
  onBackToSelection: () => void;
  isGenerating: boolean;
  onImageSelected?: (imageUri: string, extractedText?: string) => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  selectedGGUF,
  conversation,
  tokensPerSecond,
  onToggleThought,
  userInput,
  onChangeInput,
  onSendMessage,
  onStopGeneration,
  onBackToSelection,
  isGenerating,
  onImageSelected,
}) => {
  const { isListening, partialResults, toggleListening } = useVoice(onChangeInput);
  const { isProcessing, selectImage } = useImagePicker();

  const displayText = isListening && partialResults ? partialResults : userInput;

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

  return (
    <>
      <View style={styles.chatWrapper}>
        <Text style={styles.subtitle}>Chatting with {selectedGGUF}</Text>
        <View style={styles.chatContainer}>
          <Text style={styles.greetingText}>
            🦙 Welcome! The Llama is ready to chat. Ask away! 🎉
          </Text>
          {conversation.slice(1).map((msg, index) => (
            <MessageBubble
              key={index}
              message={msg}
              index={index + 1}
              tokensPerSecond={tokensPerSecond[Math.floor(index / 2)]}
              onToggleThought={onToggleThought}
            />
          ))}
        </View>
      </View>

      <View style={styles.bottomContainer}>
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
        <TouchableOpacity style={styles.backButton} onPress={onBackToSelection}>
          <Text style={styles.backButtonText}>← Back to Model Selection</Text>
        </TouchableOpacity>
      </View>
    </>
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
    paddingBottom: 10,
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
    padding: 16,
    fontSize: 16,
    color: "#334155",
    minHeight: 50,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  imageButton: {
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
  imageIcon: {
    fontSize: 24,
  },
  micButton: {
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
  micIcon: {
    fontSize: 24,
  },
  listeningIndicator: {
    paddingVertical: 4,
  },
  sendButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  stopButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    backgroundColor: "#3B82F6",
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

