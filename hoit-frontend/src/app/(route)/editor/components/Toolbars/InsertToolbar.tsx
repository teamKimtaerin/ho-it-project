'use client'

import React from 'react'
import { IoLayers, IoPerson, IoShapes, IoText } from 'react-icons/io5'
import { useEditorStore } from '../../store'
import ToolbarButton from './shared/ToolbarButton'

interface InsertToolbarProps {
  onNewClick: () => void
  onCut?: () => void
  onCopy?: () => void
  onPaste?: () => void
}

const InsertToolbar: React.FC<InsertToolbarProps> = () => {
  const {
    rightSidebarType,
    setRightSidebarType,
    addTextAtCenter,
    currentTime,
  } = useEditorStore()

  const handleToggleAssetSidebar = () => {
    setRightSidebarType(rightSidebarType === 'animation' ? null : 'animation')
  }

  const handleAddTextAtCenter = () => {
    // Pause virtual timeline when adding text
    const virtualPlayerController = (
      window as {
        virtualPlayerController?: {
          pause?: () => void
        }
      }
    ).virtualPlayerController

    if (virtualPlayerController) {
      console.log('⏸️ Pausing virtual timeline for text insertion')
      virtualPlayerController.pause?.()
    } else {
      // Fallback to regular video player if virtual timeline not available
      const videoPlayer = (window as { videoPlayer?: { pause: () => void } })
        .videoPlayer
      if (videoPlayer) {
        videoPlayer.pause()
      }
    }

    addTextAtCenter(currentTime)
  }

  const handleShapesClick = () => {
    // TODO: 도형 기능 구현 예정
    console.log('도형 버튼 클릭됨')
  }

  const handleCharacterClick = () => {
    // TODO: 캐릭터 기능 구현 예정
    console.log('캐릭터 버튼 클릭됨')
  }

  return (
    <>
      <ToolbarButton
        icon={<IoText />}
        label="텍스트 삽입"
        shortcut="Alt+T"
        active={false}
        onClick={handleAddTextAtCenter}
      />

      <ToolbarButton
        icon={<IoLayers />}
        label="애니메이션 에셋"
        shortcut="Alt+A"
        active={rightSidebarType === 'animation'}
        onClick={handleToggleAssetSidebar}
      />

      <ToolbarButton
        icon={<IoShapes />}
        label="도형"
        disabled={true}
        shortcut="Alt+S"
        onClick={handleShapesClick}
      />

      <ToolbarButton
        icon={<IoPerson />}
        label="캐릭터"
        disabled={true}
        shortcut="Alt+C"
        onClick={handleCharacterClick}
      />
    </>
  )
}

export default InsertToolbar
