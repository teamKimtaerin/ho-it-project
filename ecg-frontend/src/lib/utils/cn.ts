import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines class names using clsx and merges Tailwind classes with tailwind-merge
 * @param inputs - Class names to combine
 * @returns Combined and merged class names
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
