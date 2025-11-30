export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  role: MessageRole;
  content: string;
  thought?: string;
  showThought?: boolean;
  imageUri?: string;
}

export interface CompletionData {
  token: string;
}

export interface CompletionResult {
  timings: {
    predicted_per_second: number;
  };
}

export interface LlamaContext {
  completion: (
    params: {
      messages: Message[];
      n_predict: number;
      stop: string[];
    },
    callback: (data: CompletionData) => void
  ) => Promise<CompletionResult>;
  stopCompletion: () => Promise<void>;
}

export interface ModelFormat {
  label: string;
}

export interface LlamaParams {
  model: string;
  use_mlock: boolean;
  n_ctx: number;
  n_gpu_layers: number;
}

