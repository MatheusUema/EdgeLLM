import { useState, useCallback, useRef } from "react";
import { Message, LlamaContext, CompletionData } from "../types";
import { STOP_WORDS, INITIAL_CONVERSATION } from "../constants";
import { ModelService } from "../services/modelService";

interface UseConversationProps {
  context: LlamaContext | null;
  autoScrollRef: React.RefObject<any>;
}

export const useConversation = ({
  context,
  autoScrollRef,
}: UseConversationProps) => {
  const [conversation, setConversation] =
    useState<Message[]>(INITIAL_CONVERSATION);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tokensPerSecond, setTokensPerSecond] = useState<number[]>([]);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  const toggleAutoScroll = useCallback((enabled: boolean) => {
    setAutoScrollEnabled(enabled);
  }, []);

  const toggleThought = useCallback((messageIndex: number) => {
    setConversation((prev) =>
      prev.map((msg, index) =>
        index === messageIndex ? { ...msg, showThought: !msg.showThought } : msg
      )
    );
  }, []);

  const sendMessage = useCallback(
    async (userInput: string) => {
      if (!context) {
        throw new Error("Model Not Loaded. Please load the model first.");
      }
      if (!userInput.trim()) {
        throw new Error("Please enter a message.");
      }

      const newConversation: Message[] = [
        ...conversation,
        { role: "user", content: userInput },
      ];
      setConversation(newConversation);
      setIsGenerating(true);
      setAutoScrollEnabled(true);

      // Append placeholder for assistant's response
      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
          thought: undefined,
          showThought: false,
        },
      ]);

      let currentAssistantMessage = "";
      let currentThought = "";
      let inThinkBlock = false;

      try {
        const result = await ModelService.generateCompletion(
          context,
          newConversation,
          STOP_WORDS,
          (token) => {
            currentAssistantMessage += token;

            if (token.includes("<think>")) {
              inThinkBlock = true;
              currentThought = token.replace("<think>", "");
            } else if (token.includes("</think>")) {
              inThinkBlock = false;
              const finalThought = currentThought
                .replace("</think>", "")
                .trim();

              setConversation((prev) => {
                const lastIndex = prev.length - 1;
                const updated = [...prev];
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  content: updated[lastIndex].content.replace(
                    `<think>${finalThought}</think>`,
                    ""
                  ),
                  thought: finalThought,
                };
                return updated;
              });

              currentThought = "";
            } else if (inThinkBlock) {
              currentThought += token;
            }

            const visibleContent = currentAssistantMessage
              .replace(/<think>.*?<\/redacted_reasoning>/g, "")
              .trim();

            setConversation((prev) => {
              const lastIndex = prev.length - 1;
              const updated = [...prev];
              updated[lastIndex].content = visibleContent;
              return updated;
            });

            if (autoScrollEnabled && autoScrollRef.current) {
              requestAnimationFrame(() => {
                autoScrollRef.current?.scrollToEnd({ animated: false });
              });
            }
          }
        );

        setTokensPerSecond((prev) => [
          ...prev,
          parseFloat(result.timings.predicted_per_second.toFixed(2)),
        ]);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(errorMessage);
      } finally {
        setIsGenerating(false);
      }
    },
    [context, conversation, autoScrollEnabled, autoScrollRef]
  );

  const stopGeneration = useCallback(async () => {
    if (!context) return;

    try {
      await ModelService.stopGeneration(context);
      setIsGenerating(false);

      setConversation((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage.role === "assistant") {
          return [
            ...prev.slice(0, -1),
            {
              ...lastMessage,
              content: lastMessage.content + "\n\n*Generation stopped by user*",
            },
          ];
        }
        return prev;
      });
    } catch (error) {
      console.error("Error stopping completion:", error);
    }
  }, [context]);

  const resetConversation = useCallback(() => {
    console.log("resetConversation");
    setConversation(INITIAL_CONVERSATION);
    setTokensPerSecond([]);
    setAutoScrollEnabled(true);
  }, []);

  return {
    conversation,
    isGenerating,
    tokensPerSecond,
    autoScrollEnabled,
    toggleAutoScroll,
    toggleThought,
    sendMessage,
    stopGeneration,
    resetConversation,
  };
};

