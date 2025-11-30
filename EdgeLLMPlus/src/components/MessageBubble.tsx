import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import Markdown from "react-native-markdown-display";
import { Message } from "../types";

interface MessageBubbleProps {
  message: Message;
  index: number;
  tokensPerSecond?: number;
  onToggleThought?: (index: number) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  index,
  tokensPerSecond,
  onToggleThought,
}) => {
  return (
    <View style={styles.messageWrapper}>
      <View
        style={[
          styles.messageBubble,
          message.role === "user" ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        {message.thought && onToggleThought && (
          <TouchableOpacity
            onPress={() => onToggleThought(index)}
            style={styles.toggleButton}
          >
            <Text style={styles.toggleText}>
              {message.showThought ? "▼ Hide Thought" : "▶ Show Thought"}
            </Text>
          </TouchableOpacity>
        )}
        {message.showThought && message.thought && (
          <View style={styles.thoughtContainer}>
            <Text style={styles.thoughtTitle}>Model's Reasoning:</Text>
            <Text style={styles.thoughtText}>{message.thought}</Text>
          </View>
        )}
        {message.imageUri && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: message.imageUri }}
              style={styles.messageImage}
              resizeMode="contain"
            />
          </View>
        )}
        {message.content && (
          <View
            style={[
              styles.messageContent,
              message.role === "user" && styles.userMessageContent,
            ]}
          >
            <Markdown
              style={{
                body: {
                  color: message.role === "user" ? "#FFFFFF" : "#334155",
                  fontSize: 16,
                },
              }}
            >
              {message.content}
            </Markdown>
          </View>
        )}
      </View>
      {message.role === "assistant" && tokensPerSecond !== undefined && (
        <Text style={styles.tokenInfo}>{tokensPerSecond} tokens/s</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  messageWrapper: {
    marginBottom: 16,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    maxWidth: "80%",
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#3B82F6",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  messageContent: {
    marginTop: 4,
  },
  userMessageContent: {
    // User message styling is handled by Markdown style prop
  },
  tokenInfo: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
    textAlign: "right",
  },
  thoughtContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#94A3B8",
  },
  thoughtTitle: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  thoughtText: {
    color: "#475569",
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 16,
  },
  toggleButton: {
    marginTop: 8,
    paddingVertical: 4,
  },
  toggleText: {
    color: "#3B82F6",
    fontSize: 12,
    fontWeight: "500",
  },
  imageContainer: {
    marginVertical: 8,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
  },
  messageImage: {
    width: "100%",
    minHeight: 200,
    maxHeight: 400,
    borderRadius: 8,
  },
});

