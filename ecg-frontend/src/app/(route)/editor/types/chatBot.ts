export interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'bot'
  timestamp: Date
}

export interface ChatBotState {
  isOpen: boolean
  messages: ChatMessage[]
  isTyping: boolean
}

export interface ChatBotProps {
  isOpen: boolean
  onClose: () => void
  messages: ChatMessage[]
  isTyping?: boolean
  onSendMessage: (message: string) => void
}

export interface ChatMessageProps {
  message: ChatMessage
  isTyping?: boolean
}

export interface ChatBotFloatingButtonProps {
  onClick: () => void
  hasUnreadMessages?: boolean
}
