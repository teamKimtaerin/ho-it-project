/**
 * Math utility functions
 */

/**
 * Calculate progress percentage from a value within a range
 */
export function calculateProgress(
  value: number = 0,
  minValue: number = 0,
  maxValue: number = 100
): number {
  return Math.min(
    100,
    Math.max(0, ((value - minValue) / (maxValue - minValue)) * 100)
  )
}

/**
 * Clamp a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Round a number to specified decimal places
 */
export function round(value: number, decimals: number = 0): number {
  const multiplier = Math.pow(10, decimals)
  return Math.round(value * multiplier) / multiplier
}
