/**
 * Validation utility functions
 */

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return ['http:', 'https:'].includes(urlObj.protocol)
  } catch {
    return false
  }
}

/**
 * Validate file type
 */
export function isValidFileType(file: File, allowedTypes: string[]): boolean {
  if (allowedTypes.length === 0) return true

  return allowedTypes.some((type) => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.slice(0, -1))
    }
    return file.type === type
  })
}

/**
 * Validate file size
 */
export function isValidFileSize(file: File, maxSizeBytes: number): boolean {
  return file.size <= maxSizeBytes
}

/**
 * Validate multiple files
 */
export interface FileValidationResult {
  valid: boolean
  errors: string[]
}

export function validateFiles(
  files: FileList | File[],
  options: {
    allowedTypes?: string[]
    maxFileSize?: number
    maxFiles?: number
  } = {}
): FileValidationResult {
  const fileArray = Array.from(files)
  const errors: string[] = []

  // Check file count
  if (options.maxFiles && fileArray.length > options.maxFiles) {
    errors.push(`Maximum ${options.maxFiles} files allowed`)
  }

  // Validate each file
  fileArray.forEach((file, index) => {
    const filePrefix = fileArray.length > 1 ? `File ${index + 1}: ` : ''

    // Check file type
    if (options.allowedTypes && !isValidFileType(file, options.allowedTypes)) {
      errors.push(
        `${filePrefix}Invalid file type. Allowed: ${options.allowedTypes.join(', ')}`
      )
    }

    // Check file size
    if (options.maxFileSize && !isValidFileSize(file, options.maxFileSize)) {
      const maxSize = formatFileSize(options.maxFileSize)
      errors.push(`${filePrefix}File too large. Maximum size: ${maxSize}`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate required fields in an object
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
  obj: T,
  requiredFields: (keyof T)[]
): { valid: boolean; missingFields: (keyof T)[] } {
  const missingFields = requiredFields.filter((field) => {
    const value = obj[field]
    return value === undefined || value === null || value === ''
  })

  return {
    valid: missingFields.length === 0,
    missingFields,
  }
}

/**
 * Validate string length
 */
export function isValidLength(
  str: string,
  options: { min?: number; max?: number } = {}
): boolean {
  if (options.min !== undefined && str.length < options.min) return false
  if (options.max !== undefined && str.length > options.max) return false
  return true
}

/**
 * Validate numeric range
 */
export function isInRange(
  num: number,
  options: { min?: number; max?: number } = {}
): boolean {
  if (options.min !== undefined && num < options.min) return false
  if (options.max !== undefined && num > options.max) return false
  return true
}

// Re-export formatFileSize from formatting utils
import { formatFileSize } from './formatting'
