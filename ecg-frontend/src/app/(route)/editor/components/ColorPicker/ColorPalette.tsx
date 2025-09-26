'use client'

import React from 'react'

interface ColorPaletteProps {
  selectedColor: string
  onColorSelect: (color: string) => void
  showCustomColor?: boolean
  onCustomColorClick?: () => void
  className?: string
}

// 색상 팔레트 정의 (40개 색상)
const COLOR_PALETTE = [
  // 첫 번째 줄 - 어두운 색상들
  [
    '#4A5F3A',
    '#7B6B43',
    '#8B6F47',
    '#8B4513',
    '#A0522D',
    '#800020',
    '#663399',
    '#4169E1',
    '#008B8B',
    '#000000',
  ],
  // 두 번째 줄 - 중간 밝기
  [
    '#556B2F',
    '#DAA520',
    '#D2691E',
    '#FF8C00',
    '#DC143C',
    '#C71585',
    '#9370DB',
    '#1E90FF',
    '#48D1CC',
    '#808080',
  ],
  // 세 번째 줄 - 밝은 색상들
  [
    '#9ACD32',
    '#FFD700',
    '#FFA500',
    '#FF7F50',
    '#FF69B4',
    '#DA70D6',
    '#BA55D3',
    '#87CEEB',
    '#00CED1',
    '#C0C0C0',
  ],
  // 네 번째 줄 - 매우 밝은 색상들
  [
    '#F0E68C',
    '#FFFFE0',
    '#FFDAB9',
    '#FFE4B5',
    '#FFB6C1',
    '#DDA0DD',
    '#E6E6FA',
    '#B0E0E6',
    '#AFEEEE',
    '#FFFFFF',
  ],
]

export default function ColorPalette({
  selectedColor,
  onColorSelect,
  showCustomColor = false,
  onCustomColorClick,
  className = '',
}: ColorPaletteProps) {
  return (
    <div className={`p-3 ${className}`}>
      <div className="space-y-2">
        {/* 색상 섹션 헤더 */}
        <div className="text-xs text-gray-400 font-medium mb-2">색</div>

        {/* 색상 그리드 */}
        <div className="space-y-1">
          {COLOR_PALETTE.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1">
              {row.map((color) => (
                <button
                  key={color}
                  className={`w-8 h-8 rounded-md border-2 transition-all hover:scale-110 ${
                    selectedColor === color
                      ? 'border-white shadow-lg'
                      : 'border-transparent hover:border-gray-500'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => onColorSelect(color)}
                />
              ))}
            </div>
          ))}
        </div>

        {/* 하단 컨트롤 */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-700">
          <div className="flex gap-2">
            {/* 투명 색상 버튼 */}
            <button
              className={`w-10 h-10 rounded-md border-2 bg-white relative overflow-hidden ${
                selectedColor === 'transparent'
                  ? 'border-white shadow-lg'
                  : 'border-gray-500 hover:border-gray-400'
              }`}
              onClick={() => onColorSelect('transparent')}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-200 to-white" />
              <svg
                className="absolute inset-0 w-full h-full p-1 text-red-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="4" y1="20" x2="20" y2="4" />
              </svg>
            </button>
          </div>

          {/* 커스텀 색상 선택 버튼 */}
          {showCustomColor && (
            <div className="flex gap-2">
              {/* 스포이드 버튼 */}
              <button
                className="w-10 h-10 rounded-md border-2 border-gray-600 hover:border-gray-400 bg-gray-800 flex items-center justify-center transition-colors"
                onClick={() => console.log('Eyedropper clicked')}
                title="스포이드"
              >
                <svg
                  className="w-5 h-5 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>

              {/* 무지개 색상 선택 버튼 */}
              <button
                className="w-10 h-10 rounded-md border-2 border-gray-600 hover:border-gray-400 flex items-center justify-center transition-colors overflow-hidden"
                onClick={onCustomColorClick}
                title="색상 선택기"
              >
                <div className="w-full h-full bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 via-indigo-500 to-purple-500" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
