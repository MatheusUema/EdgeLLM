import { ModelFormat } from "../types";

export const INITIAL_CONVERSATION = [
  {
    role: "system" as const,
    content: "This is a conversation between user and assistant, a friendly chatbot.",
  },
];

export const MODEL_FORMATS: ModelFormat[] = [
  { label: "SmolLM2-360M-Instruct-Q4_K_M" },
  { label: "gemma-3-4b-it-Q4_K_M-GGUF" },
  { label: "Qwen3-1.7B-Q4_K_M" },
];

export const HF_TO_GGUF: Record<string, string> = {
  "SmolLM2-360M-Instruct-Q8_0": "matheusUema/SmolLM2-360M-Instruct-Q8_0-GGUF",
  "SmolLM2-360M-Instruct-Q4_K_M": "matheusUema/SmolLM2-360M-Instruct-Q4_K_M-GGUF",
  "SmolLM2-360M-Instruct-Q3_K_M": "matheusUema/SmolLM2-360M-Instruct-Q3_K_M-GGUF",
  "gemma-3-4b-it-Q4_K_M-GGUF": "matheusUema/gemma-3-4b-it-Q4_K_M-GGUF",
  "Qwen3-1.7B-Q2_K": "matheusUema/Qwen3-1.7B-Q2_K-GGUF",
  "Qwen3-1.7B-Q4_K_M": "matheusUema/Qwen3-1.7B-Q4_K_M-GGUF",
  "Qwen3-1.7B-Q8_0": "matheusUema/Qwen3-1.7B-Q8_0-GGUF",
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
  "<end_of_turn>"
];

export const LLAMA_PARAMS = {
  use_mlock: false,
  n_ctx: 512,
  n_gpu_layers: 0,
};

export const MAX_PREDICT = 10000;
export const AUTO_SCROLL_THRESHOLD = 100;

