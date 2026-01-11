import { initLlama, releaseAllLlama } from "llama.rn";
import { LlamaContext, LlamaParams, Message } from "../types";
import { LLAMA_PARAMS } from "../constants";
import { FileService } from "./fileService";

export const ModelService = {
  /**
   * Initialize and load a Llama model
   */
  async loadModel(modelName: string): Promise<LlamaContext> {
    const destPath = FileService.getModelPath(modelName);
    console.log("Loading model from path:", destPath);

    const llamaParams: LlamaParams = {
      model: destPath,
      ...LLAMA_PARAMS,
    };

    try {
      const llamaContext = await initLlama(llamaParams);
      console.log("llamaContext",llamaContext);
      return llamaContext;
    } catch (error) {
      console.error("Error loading model:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(errorMessage);
    }
  },

  /**
   * Release all Llama resources
   */
  async releaseModel(): Promise<void> {
    try {
      console.log("releaseModelService");
      await releaseAllLlama();
    } catch (error) {
      console.error("Error releasing model:", error);
    }
  },

  /**
   * Generate a completion with streaming
   */
  async generateCompletion(
    context: LlamaContext,
    messages: Message[],
    stopWords: string[],
    onToken: (token: string) => void
  ): Promise<{ timings: { predicted_per_second: number }; completionTime: number }> {
    const startTime = Date.now();
    
    const result = await context.completion(
      {
        messages,
        n_predict: 10000,
        stop: stopWords,
      },
      (data) => {
        onToken(data.token);
      }
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return {
      ...result,
      completionTime: duration,
    };
  },

  /**
   * Stop the current generation
   */
  async stopGeneration(context: LlamaContext): Promise<void> {
    try {
      await context.stopCompletion();
    } catch (error) {
      console.error("Error stopping completion:", error);
      throw error;
    }
  },
};

