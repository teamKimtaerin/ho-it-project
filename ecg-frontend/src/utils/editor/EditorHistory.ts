export interface EditorCommand {
  execute(): void
  undo(): void
  description: string
}

export class EditorHistory {
  private undoStack: EditorCommand[] = []
  private redoStack: EditorCommand[] = []
  private maxHistorySize: number
  private savedStateIndex: number = -1
  private onChangeCallback?: (hasUnsavedChanges: boolean) => void

  constructor(maxHistorySize: number = 50) {
    this.maxHistorySize = maxHistorySize
  }

  setOnChangeCallback(callback: (hasUnsavedChanges: boolean) => void): void {
    this.onChangeCallback = callback
  }

  private notifyChange(): void {
    const hasUnsavedChanges = this.savedStateIndex !== this.undoStack.length - 1
    this.onChangeCallback?.(hasUnsavedChanges)
  }

  executeCommand(command: EditorCommand): void {
    command.execute()

    this.undoStack.push(command)
    this.redoStack = []

    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift()
      // Adjust saved state index if necessary
      if (this.savedStateIndex > 0) {
        this.savedStateIndex--
      }
    }

    this.notifyChange()
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  undo(): boolean {
    if (!this.canUndo()) {
      return false
    }

    const command = this.undoStack.pop()!
    command.undo()
    this.redoStack.push(command)

    this.notifyChange()
    return true
  }

  redo(): boolean {
    if (!this.canRedo()) {
      return false
    }

    const command = this.redoStack.pop()!
    command.execute()
    this.undoStack.push(command)

    this.notifyChange()
    return true
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
    this.savedStateIndex = -1
    this.notifyChange()
  }

  markAsSaved(): void {
    this.savedStateIndex = this.undoStack.length - 1
    this.notifyChange()
  }

  hasUnsavedChanges(): boolean {
    return this.savedStateIndex !== this.undoStack.length - 1
  }

  getUndoDescription(): string {
    if (!this.canUndo()) {
      return ''
    }
    return this.undoStack[this.undoStack.length - 1].description
  }

  getRedoDescription(): string {
    if (!this.canRedo()) {
      return ''
    }
    return this.redoStack[this.redoStack.length - 1].description
  }
}
