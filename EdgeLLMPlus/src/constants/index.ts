import { ModelFormat } from "../types";

export const INITIAL_CONVERSATION = [
  {
    role: "system" as const,
    content: "This is a conversation between user and assistant, a friendly chatbot.",
  },
];

export const MODEL_FORMATS: ModelFormat[] = [
  { label: "Llama-3.2-1B-Instruct" },
  { label: "Qwen2-0.5B-Instruct" },
  { label: "DeepSeek-R1-Distill-Qwen-1.5B" },
  { label: "SmolLM2-1.7B-Instruct" },
];

export const HF_TO_GGUF: Record<string, string> = {
  "Llama-3.2-1B-Instruct": "medmekk/Llama-3.2-1B-Instruct.GGUF",
  "DeepSeek-R1-Distill-Qwen-1.5B": "medmekk/DeepSeek-R1-Distill-Qwen-1.5B.GGUF",
  "Qwen2-0.5B-Instruct": "medmekk/Qwen2.5-0.5B-Instruct.GGUF",
  "SmolLM2-1.7B-Instruct": "medmekk/SmolLM2-1.7B-Instruct.GGUF",
};

export const STOP_WORDS = [
  "</s>",
  "<|end|>",
  "user:",
  "assistant:",
  "<|im_end|>",
  "<|eot_id|>",
  "<|end▁of▁sentence|>",
  "<|end_of_text|>",
  "<｜end▁of▁sentence｜>",
];

export const LLAMA_PARAMS = {
  use_mlock: true,
  n_ctx: 2048,
  n_gpu_layers: 1,
};

export const MAX_PREDICT = 10000;
export const AUTO_SCROLL_THRESHOLD = 100;

