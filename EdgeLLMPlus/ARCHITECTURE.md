# EdgeLLM Architecture

## Project Structure

```
EdgeLLMPlus/
├── App.tsx                    # Main app entry point (simplified to ~200 lines)
├── src/
│   ├── components/            # UI Components
│   │   ├── ChatScreen.tsx
│   │   ├── DownloadProgress.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ModelSelectionScreen.tsx
│   │   └── ProgressBar.tsx
│   ├── constants/             # App-wide constants
│   │   └── index.ts           # Model mappings, stop words, etc.
│   ├── hooks/                 # Custom React hooks
│   │   ├── useConversation.ts # Chat/LLM logic
│   │   └── useModel.ts        # Model management
│   ├── services/              # Business logic services
│   │   ├── fileService.ts     # File system operations
│   │   └── modelService.ts    # LLM model operations
│   └── types/                 # TypeScript types
│       └── index.ts           # Common type definitions
└── node_modules/
```

## Architecture Improvements

### 1. **Separation of Concerns**
- **Components**: Pure UI components with minimal logic
- **Hooks**: Business logic and state management
- **Services**: API interactions and operations
- **Types**: Centralized type definitions
- **Constants**: Configuration and constants

### 2. **Component Hierarchy**
```
App.tsx
├── ModelSelectionScreen
│   ├── Model format buttons
│   └── GGUF file list
├── ChatScreen
│   ├── MessageBubble (x N)
│   ├── Text input
│   └── Stop/Back buttons
└── DownloadProgress
    └── ProgressBar
```

### 3. **Custom Hooks**

#### `useModel`
- Manages model downloading, loading, and selection
- Handles file system operations
- Tracks download progress
- Manages available models list

#### `useConversation`
- Handles chat state and messages
- Manages streaming token generation
- Tracks generation speed
- Handles thought/reasoning parsing

### 4. **Services**

#### `fileService`
- File existence checking
- Model downloading with progress
- Fetching available GGUF files
- Getting model paths

#### `modelService`
- Model loading and initialization
- Generating completions
- Stopping generation
- Resource cleanup

## Key Benefits

1. **Maintainability**: Each file has a single, clear responsibility
2. **Reusability**: Components and hooks can be reused across features
3. **Testability**: Services and hooks can be tested in isolation
4. **Scalability**: Easy to add new models, features, or modify existing ones
5. **Type Safety**: Centralized types ensure consistency
6. **Reduced Complexity**: App.tsx reduced from 948 lines to ~200 lines

## Data Flow

1. **Model Selection**:
   - User selects format → `useModel.handleFormatSelection()`
   - Fetch GGUF files → `fileService.fetchAvailableGGUFs()`
   - User selects file → Download or load existing

2. **Chat Flow**:
   - User types message → `useConversation.sendMessage()`
   - Stream tokens → `modelService.generateCompletion()`
   - Update UI → Parse and display tokens

3. **Download Flow**:
   - Start download → `useModel.downloadAndLoadModel()`
   - Track progress → `fileService.downloadModel()`
   - Complete and load → `modelService.loadModel()`

## File Size Reduction

- **Before**: 948 lines in App.tsx
- **After**: ~200 lines in App.tsx + organized modules
- **Reduction**: ~78% reduction in main file complexity

