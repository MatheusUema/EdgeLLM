import React, { useState, useRef, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
  View,
  TouchableOpacity,
  BackHandler,
} from "react-native";

import { useModel } from "./src/hooks/useModel";
import { useConversation } from "./src/hooks/useConversation";
import { useBenchmark } from "./src/hooks/useBenchmark";
import { ModelSelectionScreen } from "./src/components/ModelSelectionScreen";
import { ChatScreen } from "./src/components/ChatScreen";
import { DownloadProgress } from "./src/components/DownloadProgress";
import { MODEL_FORMATS } from "./src/constants";

type Page = "modelSelection" | "conversation";

function App(): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState<Page>("modelSelection");
  const [userInput, setUserInput] = useState<string>("");
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef(0);
  const contentHeightRef = useRef(0);

  // Custom hooks
  const {
    context,
    isDownloading,
    progress,
    selectedModelFormat,
    selectedGGUF,
    setSelectedGGUF,
    availableGGUFs,
    downloadedModels,
    isFetching,
    handleFormatSelection,
    loadDownloadedModel,
    downloadAndLoadModel,
    releaseModel,
    checkDownloadedModels,
  } = useModel();

  const {
    conversation,
    isGenerating,
    tokensPerSecond,
    completionTimes,
    autoScrollEnabled,
    toggleAutoScroll,
    toggleThought,
    sendMessage,
    stopGeneration,
    resetConversation,
  } = useConversation({
    context,
    autoScrollRef: scrollViewRef,
  });

  // Benchmark hook (shared between both ChatScreen instances)
  const benchmark = useBenchmark(context, selectedGGUF);

  // Check downloaded models when page changes
  useEffect(() => {
    checkDownloadedModels();
  }, [currentPage, checkDownloadedModels]);

  // Handle native back button when on conversation page
  useEffect(() => {
    if (currentPage === "conversation") {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBackToModelSelection();
        return true; // Prevent default back behavior
      });

      return () => backHandler.remove();
    }
  }, [currentPage]);

  const handleScroll = (event: any) => {
    const currentPosition = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;

    scrollPositionRef.current = currentPosition;
    contentHeightRef.current = contentHeight;

    const distanceFromBottom =
      contentHeight - scrollViewHeight - currentPosition;
    toggleAutoScroll(distanceFromBottom < 100);
  };

  const handleGGUFSelection = (file: string, isDownloaded: boolean) => {
    console.log("handleGGUFSelection", file, isDownloaded);
    if (isDownloaded) {
      handleLoadExistingModel(file);
    } else {
      handleDownloadNewModel(file);
    }
  };

  const handleLoadExistingModel = async (file: string) => {
    console.log("handleLoadExistingModel", file);
    try {
      await releaseModel();
      setSelectedGGUF(file);
      loadDownloadedModel(file);
      setCurrentPage("conversation");
      resetConversation();
    } catch (error) {
      Alert.alert("Error", "Failed to load model");
    }
  };

  const handleDownloadNewModel = (file: string) => {
    setSelectedGGUF(file);
    Alert.alert(
      "Confirm Download",
      `Do you want to download ${file}?`,
      [
        { text: "No", onPress: () => setSelectedGGUF(null), style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            await downloadAndLoadModel(file);
            setCurrentPage("conversation");
            resetConversation();
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleBackToModelSelection = async () => {
    console.log("handleBackToModelSelection");
    await releaseModel();
    setSelectedGGUF(null);
    resetConversation();
    setCurrentPage("modelSelection");
  };

  const handleSendMessage = async () => {
    try {
      // If auto-send fires while userInput has been cleared, fall back to current benchmark text.
      const userText =
        userInput.trim().length > 0
          ? userInput
          : benchmark.isRunning
            ? benchmark.currentQuestionText
            : "";

      if (!userText.trim()) {
        return; // avoid triggering useConversation empty-message error
      }

      const metrics = await sendMessage(userText);
      setUserInput("");

      // If this send corresponds to the current benchmark question, record timings.
      // For text modality: match by question text
      const isTextModalityMatch = benchmark.isRunning && 
        benchmark.currentModality === 'text' && 
        benchmark.currentQuestionText && 
        userText === benchmark.currentQuestionText;

      if (isTextModalityMatch) {
        benchmark.reportCurrentResult({
          llmResponse: metrics.assistantMessage,
          completionTime: metrics.completionTime,
          tokensPerSecond: metrics.tokensPerSecond,
        });
        
        // Reset conversation after each benchmark response
        resetConversation();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error", errorMessage);
    }
  };

  const handleImageSelected = async (imageUri: string, extractedText?: string) => {
    try {
      // Create a message with the image and extracted text
      let imageMessage = ``;
      if (extractedText && extractedText.trim().length > 0) {
        imageMessage = `${extractedText}`;
      }
      const metrics = await sendMessage(imageMessage, imageUri);

      // If this send corresponds to the current benchmark question in image modality, record timings.
      if (benchmark.isRunning && benchmark.currentModality === 'image' && benchmark.currentQuestionId !== null) {
        benchmark.reportCurrentResult({
          llmResponse: metrics.assistantMessage,
          completionTime: metrics.completionTime,
          tokensPerSecond: metrics.tokensPerSecond,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error", `Failed to send image: ${errorMessage}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {currentPage === "conversation" && !isDownloading && (
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToModelSelection}>
            <Text style={styles.backButtonText}>← Exit</Text>
          </TouchableOpacity>
          <View style={styles.topBarTitleContainer} pointerEvents="none">
            <Text style={styles.topBarTitle}>LLM Chat</Text>
          </View>
          <TouchableOpacity style={styles.resetButton} onPress={resetConversation}>
            <Text style={styles.resetButtonText}>↻ Reset</Text>
          </TouchableOpacity>
        </View>
      )}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {currentPage === "conversation" && !isDownloading ? (
          <>
            <ScrollView
              style={styles.scrollViewChat}
              ref={scrollViewRef}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              contentContainerStyle={styles.scrollViewContentWithTopBar}
            >
              <ChatScreen
                selectedGGUF={selectedGGUF}
                conversation={conversation}
                tokensPerSecond={tokensPerSecond}
                completionTimes={completionTimes}
                onToggleThought={toggleThought}
                userInput={userInput}
                onChangeInput={setUserInput}
                onSendMessage={handleSendMessage}
                onStopGeneration={stopGeneration}
                onBackToSelection={handleBackToModelSelection}
                isGenerating={isGenerating}
                onImageSelected={handleImageSelected}
                showInputArea={false}
                context={context}
                benchmark={benchmark}
              />
            </ScrollView>
            <ChatScreen
              selectedGGUF={selectedGGUF}
              conversation={conversation}
              tokensPerSecond={tokensPerSecond}
              completionTimes={completionTimes}
              onToggleThought={toggleThought}
              userInput={userInput}
              onChangeInput={setUserInput}
              onSendMessage={handleSendMessage}
              onStopGeneration={stopGeneration}
              onBackToSelection={handleBackToModelSelection}
              isGenerating={isGenerating}
              onImageSelected={handleImageSelected}
              showInputArea={true}
              context={context}
              benchmark={benchmark}
            />
          </>
        ) : (
          <ScrollView
            style={styles.scrollView}
            ref={scrollViewRef}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {currentPage === "modelSelection" && !isDownloading && (
              <ModelSelectionScreen
                modelFormats={MODEL_FORMATS}
                selectedModelFormat={selectedModelFormat}
                onFormatSelect={handleFormatSelection}
                availableGGUFs={availableGGUFs}
                isFetching={isFetching}
                downloadedModels={downloadedModels}
                selectedGGUF={selectedGGUF}
                onGGUFSelect={handleGGUFSelection}
              />
            )}

            {isDownloading && (
              <DownloadProgress selectedGGUF={selectedGGUF} progress={progress} />
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 1000,
    position: "relative",
  },
  backButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  topBarTitleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  resetButton: {
    backgroundColor: "#10B981",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    position: "absolute",
    right: 16,
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollView: {
    paddingBottom: 20,
  },
  scrollViewChat: {
    flex: 1,
  },
  scrollViewContentWithTopBar: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1E293B",
    marginVertical: 24,
    textAlign: "center",
  },
});

export default App;
