# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎬 Project Overview

ECG (Easy Caption Generator) Frontend - A powerful subtitle editing tool built with Next.js featuring advanced animation capabilities, audio-driven effects, and real-time collaborative editing.

### Tech Stack

- **Framework**: Next.js 15.5.2 with App Router
- **Language**: TypeScript 5
- **UI Library**: React 19.1.1
- **Styling**: TailwindCSS v4 with PostCSS
- **State Management**: Zustand 5.0.8
- **Drag & Drop**: @dnd-kit/core & @dnd-kit/sortable
- **Animation**: GSAP 3.13.0, motiontext-renderer 1.5.0
- **Icons**: Lucide React via react-icons
- **Utilities**: clsx, tailwind-merge, chroma-js

## 🚀 Development Commands

### Essential Commands

Use yarn as the package manager:

```bash
yarn dev         # Start development server (http://localhost:3000)
yarn build       # Build for production
yarn build:static # Build for static S3 hosting (moves API folder temporarily)
yarn start       # Start production server
yarn serve       # Serve static build from out/ directory (port 3000)
yarn lint        # Run ESLint checks
yarn lint:fix    # Fix linting issues automatically
yarn format      # Format code with Prettier
yarn format:check # Check code formatting
yarn type-check  # TypeScript type checking
yarn gen:scenario # Generate scenario from real.json
yarn prepare     # Setup husky git hooks
```

### Testing Commands

```bash
yarn test        # Run Jest unit tests
yarn test:watch  # Run tests in watch mode
yarn test:coverage # Generate test coverage report

# Run a single test file
yarn test path/to/file.test.ts

# Run tests matching a pattern
yarn test --testNamePattern="pattern"

# Run tests in specific directory
yarn test src/utils
```

**Note**: E2E testing with Playwright is configured in the CI pipeline but not currently set up for local development.

## 🏗️ Architecture

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (route)/           # Route group for main pages
│   │   ├── editor/        # Main editor page
│   │   │   ├── components/    # Editor-specific components
│   │   │   │   ├── ClipComponent/
│   │   │   │   ├── VideoPlayer/
│   │   │   │   ├── AnimationAssetSidebar/
│   │   │   │   └── SubtitleEditList.tsx
│   │   │   ├── hooks/     # Custom hooks (DnD, selection)
│   │   │   ├── store/     # Zustand store with slices
│   │   │   └── types/     # TypeScript types
│   │   ├── asset-store/   # Animation plugin marketplace
│   │   ├── motiontext-demo/ # Plugin preview demos
│   │   └── signup/        # Authentication flow
│   ├── (main)/           # Main landing pages
│   ├── auth/             # Auth callbacks
│   └── shared/           # Shared motiontext utilities
│       └── motiontext/   # Renderer integration
├── components/
│   ├── ui/              # Reusable UI components (30+ components)
│   ├── icons/           # Centralized Lucide icon wrappers
│   └── DnD/             # Drag & drop components
├── lib/
│   ├── store/           # Global stores (authStore, toastTimerStore)
│   └── utils/           # Utility functions
│       └── colors.ts    # Color system utilities
├── services/            # API services
├── utils/               # General utilities
└── hooks/               # Global custom hooks

public/
├── plugin/              # Animation plugins
│   └── legacy/          # Legacy plugin collection
│       ├── elastic@1.0.0/
│       ├── rotation@1.0.0/
│       └── [other plugins]
└── real.json           # Audio analysis data
```

### State Management (Zustand)

Modular store architecture with slices:

```typescript
store/
├── editorStore.ts       # Main store combining all slices
└── slices/
    ├── clipSlice.ts     # Clip data and operations
    ├── selectionSlice.ts # Multi-selection state
    ├── uiSlice.ts       # UI state (tabs, modals)
    ├── saveSlice.ts     # Save/autosave state
    ├── mediaSlice.ts    # Media/video state
    ├── wordSlice.ts     # Word-level editing state
    ├── scenarioSlice.ts # Animation scenario management
    ├── indexSlice.ts    # Index management for clips
    ├── textInsertionSlice.ts # Text insertion overlay state
    ├── timelineSlice.ts # Timeline and playback state
    └── virtualTimelineSlice.ts # Virtual timeline functionality
```

### Animation Plugin System

#### Plugin Structure

**External Plugin Server**: Plugins are served from an external server (localhost:3300) at version 2.0.0
**Local Fallback**: Legacy plugins in `public/plugin/legacy/[name@version]/` (for development)

Each plugin contains:

- `manifest.json` - Plugin metadata and parameter schema
- `index.mjs` - ES module implementation
- `assets/` - Thumbnails and resources

#### MotionText Renderer Integration

The project uses `motiontext-renderer` for advanced subtitle animations:

- **Scenario Generation**: Dynamic scene creation from plugins and parameters
- **Plugin Loading**: External server-first with local fallback
- **Preview System**: Live preview with drag/resize/rotate controls
- **Parameter Controls**: Dynamic UI generation from plugin schemas
- **Plugin Database**: `public/asset-store/assets-database.json` maps asset IDs to plugin keys

Key integration points:

- `src/app/shared/motiontext/` - Core renderer utilities and plugin loading
- `src/app/(route)/asset-store/` - Plugin marketplace and preview
- `src/app/(route)/motiontext-demo/` - Demo and testing environment
- `src/app/(route)/editor/utils/initialScenario.ts` - Plugin chain generation with parameters and timeOffset

### Audio Analysis Integration

Audio metadata in `public/real.json` drives dynamic animations:

```typescript
{
  segments: [
    {
      words: [
        {
          word: string,
          volume_db: number, // For intensity scaling
          pitch_hz: number, // For effect selection
          confidence: number, // For reliability
        },
      ],
    },
  ]
}
```

### Component Architecture

#### Editor Page Hierarchy

```
EditorPage
├── EditorHeaderTabs
├── Toolbar (Advanced) / SimpleToolbar (Simple)
├── VideoSection
│   ├── VideoPlayer
│   └── SubtitleOverlay
├── SubtitleEditList
│   └── ClipComponent (with DnD)
│       ├── ClipTimeline
│       ├── ClipCheckbox
│       ├── ClipSpeaker
│       ├── ClipWords
│       └── ClipText
├── Right Sidebar (Conditional)
│   ├── AnimationAssetSidebar
│   │   ├── AssetGrid
│   │   ├── AssetControlPanel
│   │   └── UsedAssetsStrip
│   ├── TemplateSidebar
│   └── SpeakerManagementSidebar
├── SelectionBox
├── ChatBotContainer
│   ├── ChatBotFloatingButton
│   ├── ChatMessage
│   └── FloatingQuestion
└── Various Modals
    ├── ProcessingModal
    ├── PlatformSelectionModal
    ├── DeployModal
    └── TutorialModal
```

## 💡 Development Guidelines

### Component Development

**IMPORTANT: Always use existing UI components from `components/ui/`**

Available components include:

- `Button`, `Dropdown`, `EditableDropdown`
- `Tab/TabItem`, `AlertDialog`, `Modal`
- `Input`, `Checkbox`, `RadioButton`, `Switch`
- `Badge`, `Tag`, `StatusLight`
- `Slider`, `ColorPicker`, `FontDropdown`
- `ProgressBar`, `ProgressCircle`
- `Tooltip`, `HelpText`
- And 15+ more...

### Color System

Use centralized colors from `lib/utils/colors.ts`:

```typescript
import { getColorVar } from '@/lib/utils/colors'
const primaryColor = getColorVar('primary', 'medium')
```

Variants: `primary`, `secondary`, `accent`, `neutral`, `positive`, `negative`, `notice`, `informative`
Intensities: `very-light`, `light`, `medium`, `dark`, `very-dark`

### Icon Usage

All icons are centralized in `components/icons/`:

```typescript
import { ChevronDownIcon, InfoIcon } from '@/components/icons'
```

### ProcessingModal Enhancements

Recent improvements to ProcessingModal include video thumbnail display:

```typescript
// Extended props interface
interface VideoMetadata {
  duration?: number
  size?: number
  width?: number
  height?: number
  fps?: number
}

interface ProcessingModalProps {
  // ... existing props
  videoFile?: File // For automatic thumbnail generation
  videoThumbnail?: string // Pre-generated thumbnail URL
  videoMetadata?: VideoMetadata // Video information display
}
```

**Features:**

- Automatic thumbnail generation from video files using `generateVideoThumbnail`
- Video metadata display (size, duration, resolution, FPS)
- Graceful fallback to emoji placeholder when thumbnail generation fails
- Proper resource cleanup and error handling

### Plugin Development

When creating animation plugins:

1. Place in `public/plugin/[name@version]/`
2. Create `manifest.json` with schema
3. Implement as ES module (`.mjs`)
4. Use GSAP for animations
5. Ensure proper cleanup in `dispose()`

### Windows Development Notes

#### Webpack Cache Issues

If you encounter `EPERM: operation not permitted, rename` errors on Windows:

1. **Clear Cache Directories**:

   ```bash
   # Remove webpack cache
   rm -rf .next/cache
   rm -rf node_modules/.cache
   ```

2. **Restart Development Server**:

   ```bash
   # Kill existing process and restart
   yarn dev
   ```

3. **Antivirus Exclusions** (if issues persist):
   - Add project folder to Windows Defender exclusions
   - Exclude from real-time scanning

#### File System Access API

- Modern browsers support direct file saving without downloads
- Used in GPU rendering for automatic video export
- Graceful fallback to traditional downloads

### Key Features

1. **Multi-Selection System**: Checkbox selection with group operations
2. **Word-Level Editing**: Inline editing with drag & drop
3. **Audio-Driven Effects**: Dynamic animations based on audio analysis
4. **Real-time Preview**: Live animation preview with controls
5. **Speaker Management**: Auto-detection and manual assignment
6. **Undo/Redo**: Command pattern implementation for all operations
7. **Automatic Line Splitting**: Smart line breaks based on safe area calculation and fontSizeRel
8. **AI ChatBot Integration**: Contextual assistance with floating UI components
9. **GPU Rendering**: Server-side rendering for 20-40x performance improvement
10. **File System Access API**: Direct file saving without downloads

## 🚀 GPU Rendering System

### Overview

ECG implements a GPU-based server rendering system achieving **20-40x speed improvement**.

**Performance Comparison:**

- **Browser (MediaRecorder)**: 1min video → 5-10min processing
- **GPU Rendering**: 1min video → **15-20sec processing** ⚡

### Architecture Flow

```
Frontend → API Server → GPU Render Server → S3 Storage
```

### Frontend Implementation

#### Key Components

- **ServerVideoExportModal.tsx** - GPU rendering UI component
- **useServerVideoExport.ts** - State management hook
- **renderService.ts** - API service layer with FastAPI compatibility

#### File System Access API

```typescript
// Auto-save on completion
const handle = await window.showSaveFilePicker({
  suggestedName: `${videoName}_GPU_${timestamp}.mp4`,
  types: [{ description: 'MP4 Video', accept: { 'video/mp4': ['.mp4'] } }],
})
```

### Testing GPU Rendering

```bash
yarn dev
# Navigate to Editor → Export → GPU Rendering
```

## 🔧 Configuration

### TypeScript

- Strict mode enabled
- Path alias: `@/*` maps to `./src/*`
- Use absolute imports

### ESLint

- Flat config (ESLint 9)
- Next.js core web vitals
- Auto-fix with `yarn lint:fix`

### TailwindCSS v4

- PostCSS-based configuration in `postcss.config.mjs`
- Theme variables in `src/app/globals.css`
- Uses @tailwindcss/postcss plugin
- **Note**: No traditional `tailwind.config.js` file - configuration is CSS-based

### Next.js

- Static export for S3: `output: 'export'` (production only, disabled in development for API route compatibility)
- Image optimization disabled for static hosting (`unoptimized: true`)
- CloudFront domains configured for remote images
- Transpiles `motiontext-renderer` ES module package
- API rewrites for development CORS handling
- **Static Build Process**: `yarn build:static` temporarily moves `src/app/api/` folder during build since API routes are incompatible with static export

## 📝 Git Workflow

### Git Hooks (Husky)

- **Pre-push Hook**: Automatically runs `npm run type-check` before push
  - **Note**: The hook uses `npm` instead of `yarn` for type checking

### PR Automation Scripts

Located in `.claude/scripts/`:

#### `prm` - Full PR Workflow

```bash
prm "Feat: Your feature description"
```

Creates commit, pushes, and generates PR with Claude Code analysis.

#### `pronly` - PR from Existing Commits

```bash
pronly  # Analyze all commits since main
```

Creates PR from already committed changes.

#### Setup Instructions

First-time setup for PR automation:

```bash
# 1. Install GitHub CLI
brew install gh      # macOS
winget install Github.cli  # Windows

# 2. Run installation script
chmod +x install.sh
./install.sh

# 3. Apply PATH changes
source ~/.zshrc  # zsh users (macOS default)
source ~/.bashrc # bash users

# 4. Login to GitHub
gh auth login
```

### Branch Conventions

- Base branch: `main`
- Branch prefixes: `feature/`, `fix/`, `refactor/`
- Commit prefixes: `[Feat]`, `[Fix]`, `[Refactor]`, `[Docs]`, `[Test]`

### Manual PR Creation

If automated scripts are unavailable:

```bash
# Create and push commits manually
git add .
git commit -m "[Feat] Your feature description"
git push -u origin your-branch

# Create PR via GitHub CLI
gh pr create --title "Your PR Title" --base main --body "Your description"
```

## 🐳 Docker Support

```bash
# Development
docker build --target dev -t ecg-frontend:dev .
docker run -p 3000:3000 --rm ecg-frontend:dev

# Production
docker build --target prod -t ecg-frontend:prod .
```

## ⚠️ Important Notes

1. **Always use existing UI components** from `components/ui/`
2. React 19 requires `--legacy-peer-deps` for some packages
3. Editor page (`/editor`) is the main feature - handle with care
4. Run `yarn type-check` and `yarn lint` after changes
5. Animation cleanup is critical for performance
6. MotionText renderer requires proper scenario structure
7. Audio analysis data drives dynamic effects
8. Static export configured for S3 deployment
9. PR scripts require GitHub CLI (`gh`) authentication
10. Plugin manifests define UI and parameter schemas
11. **Plugin System**: Uses external server at localhost:3300 for 2.0.0 plugins, no hardcoded fallbacks
12. **Parameter Flow**: Plugin parameters pass through AnimationTrack → initialScenario.ts → pluginChain
13. **Error Handling**: Show error messages instead of fallbacks when plugins fail to load
14. **Pre-push Hook**: Uses `npm run type-check` (not yarn) to validate TypeScript before push
15. **Testing**: Jest unit tests are configured and working, but Playwright E2E tests are only in CI, not local development

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
