'use client'

import React from 'react'
import ChatBotModal from './ChatBotModal'
import ChatBotFloatingButton from './ChatBotFloatingButton'
import useChatBot from '../../hooks/useChatBot'

const ChatBotContainer: React.FC = () => {
  const {
    messages,
    isTyping,
    isOpen,
    sendMessage,
    openChatBot,
    closeChatBot,
    selectedClipsCount,
    selectedWordsCount,
    clearSelection,
  } = useChatBot()

  return (
    <>
      <ChatBotFloatingButton onClick={openChatBot} hasUnreadMessages={false} />

      <ChatBotModal
        isOpen={isOpen}
        onClose={closeChatBot}
        messages={messages}
        isTyping={isTyping}
        onSendMessage={sendMessage}
        selectedClipsCount={selectedClipsCount}
        selectedWordsCount={selectedWordsCount}
        onClearSelection={clearSelection}
      />
    </>
  )
}

export default ChatBotContainer
