import React, { useState, useRef, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";

import { useModel } from "./src/hooks/useModel";
import { useConversation } from "./src/hooks/useConversation";
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

  // Check downloaded models when page changes
  useEffect(() => {
    checkDownloadedModels();
  }, [currentPage, checkDownloadedModels]);

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
      await sendMessage(userInput);
      setUserInput("");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error", errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <Text style={styles.title}>Llama Chat</Text>

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

          {currentPage === "conversation" && !isDownloading && (
            <ChatScreen
              selectedGGUF={selectedGGUF}
              conversation={conversation}
              tokensPerSecond={tokensPerSecond}
              onToggleThought={toggleThought}
              userInput={userInput}
              onChangeInput={setUserInput}
              onSendMessage={handleSendMessage}
              onStopGeneration={stopGeneration}
              onBackToSelection={handleBackToModelSelection}
              isGenerating={isGenerating}
            />
          )}

          {isDownloading && (
            <DownloadProgress selectedGGUF={selectedGGUF} progress={progress} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
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
