/**
 * File System Access API TypeScript Definitions
 * These APIs are available in modern browsers (Chrome 86+, Edge 86+, Opera 72+)
 */

interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string | WriteParams): Promise<void>
  seek(position: number): Promise<void>
  truncate(size: number): Promise<void>
}

interface FileSystemFileHandle {
  getFile(): Promise<File>
  createWritable(
    options?: FileSystemCreateWritableOptions
  ): Promise<FileSystemWritableFileStream>
}

interface FileSystemCreateWritableOptions {
  keepExistingData?: boolean
}

interface WriteParams {
  type: 'write' | 'seek' | 'truncate'
  data?: BufferSource | Blob | string
  position?: number
  size?: number
}

interface SaveFilePickerOptions {
  excludeAcceptAllOption?: boolean
  suggestedName?: string
  types?: Array<{
    description?: string
    accept: Record<string, string[]>
  }>
}

interface Window {
  showSaveFilePicker?: (
    options?: SaveFilePickerOptions
  ) => Promise<FileSystemFileHandle>
}
