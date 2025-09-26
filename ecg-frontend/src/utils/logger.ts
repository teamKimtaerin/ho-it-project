/**
 * Vrew 스타일 로거 유틸리티
 */

export function getTimestamp(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  // Timezone offset
  const offset = -now.getTimezoneOffset()
  const offsetHours = Math.floor(Math.abs(offset) / 60)
  const offsetMinutes = Math.abs(offset) % 60
  const offsetSign = offset >= 0 ? '+' : '-'
  const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetString}`
}

export function log(module: string, message: string, data?: unknown): void {
  const timestamp = getTimestamp()
  const logMessage = `[${timestamp}] ${module} ${message}`

  if (data !== undefined) {
    console.log(logMessage, data)
  } else {
    console.log(logMessage)
  }
}

export function error(module: string, message: string, err?: unknown): void {
  const timestamp = getTimestamp()
  const logMessage = `[${timestamp}] ${module} ${message}`

  if (err !== undefined) {
    console.error(logMessage, err)
  } else {
    console.error(logMessage)
  }
}

export function warn(module: string, message: string, data?: unknown): void {
  const timestamp = getTimestamp()
  const logMessage = `[${timestamp}] ${module} ${message}`

  if (data !== undefined) {
    console.warn(logMessage, data)
  } else {
    console.warn(logMessage)
  }
}
