# ClipWord Editing Implementation

## Overview

Implemented a comprehensive word-level editing system for subtitle clips with inline editing and detailed waveform-based editing capabilities.

## Features Implemented

### 1. Inline Word Editing

- **Double-click to edit**: Words can be edited by double-clicking on a focused word
- **Visual feedback**: Editing word shows yellow highlight with black text
- **Auto-save on blur**: Changes are automatically saved when clicking outside
- **ESC to cancel**: Press ESC key to cancel editing without saving
- **Cursor positioning**: Cursor automatically positions at end of text when editing starts

### 2. Word Detail Editor

- **Right-click to open**: Right-click on a focused word opens the detail editor
- **Waveform visualization**: Shows audio waveform using wavesurfer.js
- **4 draggable bars**:
  - 2 white bars for timing adjustment (start/end)
  - 2 cyan bars for animation intensity (min/max)
- **Real-time feedback**: Bar positions update in real-time during dragging
- **Playback control**: Play/pause button for preview

### 3. State Management

Enhanced the wordSlice store with:

- `editingWordId` and `editingClipId` for tracking inline editing state
- `wordDetailOpen` for modal control
- `wordTimingAdjustments` Map for word-specific timing changes
- `wordAnimationIntensity` Map for animation intensity settings
- Actions for starting/ending inline edit and opening/closing detail editor

## Files Modified

### `/src/app/(route)/editor/store/slices/wordSlice.ts`

- Added new state properties for editing and detail editor
- Implemented actions for inline editing and detail editor control
- Added Maps for storing word-specific adjustments

### `/src/app/(route)/editor/components/ClipComponent/ClipWord.tsx`

- Converted from button to div element for better contentEditable support
- Implemented double-click detection for inline editing
- Added contentEditable span for inline editing mode
- Added right-click handler for detail editor
- Removed modal-based editing in favor of inline editing
- Visual states: yellow for editing, blue for focused, blue-light for grouped

### `/src/app/(route)/editor/components/ClipComponent/WordDetailEditor.tsx` (New)

- Created comprehensive detail editing modal
- Integrated wavesurfer.js for waveform visualization
- Implemented 4 draggable bars with different colors and purposes
- Added animation track selection (UP/POP buttons)
- Responsive design with dark theme

### `/src/app/(route)/editor/page.tsx`

- Added WordDetailEditor import and rendering logic
- Connected wordDetailOpen, focusedWordId, and focusedClipId from store

## Dependencies Added

- `wavesurfer.js@7.8.17` - For audio waveform visualization

## User Interaction Flow

### Inline Editing

1. User clicks word to focus it (blue highlight)
2. User double-clicks focused word to start editing (yellow highlight)
3. User types to modify text
4. User clicks outside or presses Enter to save (auto-save)
5. User can press ESC to cancel without saving

### Detail Editor

1. User focuses a word by clicking
2. User right-clicks to open detail editor
3. User can drag bars to adjust:
   - White bars: Word timing (start/end)
   - Cyan bars: Animation intensity (min/max)
4. User can play/pause preview
5. User clicks "적용" to apply changes or "취소" to cancel

## Technical Implementation Details

### Double-Click Detection

- Uses timestamp comparison with 300ms threshold
- Prevents accidental triggers during normal interaction
- Only works on already focused words

### ContentEditable Integration

- Uses native contentEditable for seamless text editing
- Handles cursor positioning with Range API
- Prevents drag-and-drop during editing mode

### Waveform Visualization

- Mock data generation when audio data unavailable
- Real-time bar position updates during drag
- Constraints to prevent invalid values (e.g., start > end)

## Future Enhancements

- Connect to actual audio data from `/public/real.json`
- Implement animation preview in detail editor
- Add keyboard shortcuts for common operations
- Support for multi-word selection and batch editing
- Integration with animation plugin system
