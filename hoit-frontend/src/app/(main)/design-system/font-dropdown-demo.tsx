'use client'

import React, { useState } from 'react'
import FontDropdown, { FontOption } from '@/components/ui/FontDropdown'

// 샘플 폰트 옵션들
const SAMPLE_FONTS: FontOption[] = [
  // 고딕 폰트들
  { value: 'Noto Sans KR', label: '본고딕', category: 'gothic' },
  { value: 'Malgun Gothic', label: '맑은 고딕', category: 'gothic' },
  {
    value: 'Apple SD Gothic Neo',
    label: '애플 SD 고딕 Neo',
    category: 'gothic',
  },
  { value: 'Nanum Gothic', label: '나눔고딕', category: 'gothic' },
  {
    value: 'Spoqa Han Sans Neo',
    label: '스포카 한 산스 Neo',
    category: 'gothic',
  },

  // 명조 폰트들
  { value: 'Noto Serif KR', label: '본명조', category: 'serif' },
  { value: 'Nanum Myeongjo', label: '나눔명조', category: 'serif' },
  { value: 'Batang', label: '바탕', category: 'serif' },

  // 손글씨 폰트들
  {
    value: 'Nanum Pen Script',
    label: '나눔펜스크립트',
    category: 'handwriting',
  },
  { value: 'Gaegu', label: '개구', category: 'handwriting' },
  { value: 'Jua', label: '주아', category: 'handwriting' },

  // 라운드 폰트들
  { value: 'Nunito Sans', label: '누니토 산스', category: 'rounded' },
  { value: 'Comfortaa', label: '컴포타', category: 'rounded' },
  { value: 'Quicksand', label: '퀵샌드', category: 'rounded' },
]

const FontDropdownDemo = () => {
  const [selectedFont, setSelectedFont] = useState('')

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-4">
          FontDropdown Component Demo
        </h1>
        <p className="text-slate-400 mb-6">
          스크린샷 디자인에 맞춘 폰트 드롭다운 컴포넌트입니다.
        </p>
      </div>

      <div className="space-y-8">
        {/* Default Variant */}
        <div className="bg-slate-800/50 p-6 rounded-lg">
          <h3 className="text-xl font-semibold text-white mb-4">
            Default Variant
          </h3>
          <div className="max-w-md">
            <FontDropdown
              value={selectedFont}
              options={SAMPLE_FONTS}
              onChange={setSelectedFont}
              variant="default"
              size="medium"
            />
          </div>
          <p className="text-slate-400 text-sm mt-2">
            Selected: {selectedFont || 'None'}
          </p>
        </div>

        {/* Toolbar Variant */}
        <div className="bg-slate-800/50 p-6 rounded-lg">
          <h3 className="text-xl font-semibold text-white mb-4">
            Toolbar Variant
          </h3>
          <div className="max-w-md">
            <FontDropdown
              value={selectedFont}
              options={SAMPLE_FONTS}
              onChange={setSelectedFont}
              variant="toolbar"
              size="medium"
            />
          </div>
        </div>

        {/* Different Sizes */}
        <div className="bg-slate-800/50 p-6 rounded-lg">
          <h3 className="text-xl font-semibold text-white mb-4">
            Different Sizes
          </h3>
          <div className="space-y-4">
            <div className="max-w-md">
              <label className="block text-sm text-slate-300 mb-1">Small</label>
              <FontDropdown
                value={selectedFont}
                options={SAMPLE_FONTS}
                onChange={setSelectedFont}
                size="small"
              />
            </div>
            <div className="max-w-md">
              <label className="block text-sm text-slate-300 mb-1">
                Medium
              </label>
              <FontDropdown
                value={selectedFont}
                options={SAMPLE_FONTS}
                onChange={setSelectedFont}
                size="medium"
              />
            </div>
            <div className="max-w-md">
              <label className="block text-sm text-slate-300 mb-1">Large</label>
              <FontDropdown
                value={selectedFont}
                options={SAMPLE_FONTS}
                onChange={setSelectedFont}
                size="large"
              />
            </div>
          </div>
        </div>

        {/* Font Preview */}
        {selectedFont && (
          <div className="bg-slate-800/50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-4">
              Font Preview
            </h3>
            <div
              className="text-2xl text-white p-4 bg-slate-700/50 rounded border"
              style={{ fontFamily: selectedFont }}
            >
              안녕하세요! 이것은{' '}
              {SAMPLE_FONTS.find((f) => f.value === selectedFont)?.label}{' '}
              폰트입니다.
              <br />
              Hello! This is{' '}
              {SAMPLE_FONTS.find((f) => f.value === selectedFont)?.label} font.
              <br />
              1234567890 !@#$%^&*()
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FontDropdownDemo
