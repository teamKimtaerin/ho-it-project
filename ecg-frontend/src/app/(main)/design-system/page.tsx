'use client'

import React from 'react'
import SimpleModalDemo from './modal-demo'
import ButtonDemo from './button-demo'
import SwitchDemo from './switch-demo'
import DropdownDemo from './dropdown-demo'
import ProgressDemo from './progress-demo'
import MiscDemo from './misc-demo'
import { DESIGN_SYSTEM_CONSTANTS, getSpacingClass } from './constants'

export default function DesignSystem() {
  return (
    <div
      className={`font-sans min-h-screen bg-background text-foreground ${getSpacingClass('MAIN_CONTAINER')}`}
    >
      <main
        className={`max-w-${DESIGN_SYSTEM_CONSTANTS.MAIN_CONTENT_MAX_WIDTH} mx-auto ${getSpacingClass('MAIN_CONTENT')}`}
      >
        <div className={`text-center ${getSpacingClass('HEADER_SECTION')}`}>
          <h1 className="text-h1">디자인 시스템</h1>
          <p className="text-sm text-text-secondary">
            TailwindCSS 기반 컬러 팔레트, 타이포그래피 및 컴포넌트 시스템
          </p>
        </div>

        {/* Typography Section */}
        <section className={getSpacingClass('SECTION')}>
          <h2
            className={`text-h2 mb-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN} text-text-primary`}
          >
            Typography
          </h2>

          {/* Font Sizes */}
          <div className={getSpacingClass('SUBSECTION')}>
            <h3
              className={`text-h3 mb-${DESIGN_SYSTEM_CONSTANTS.BUTTON_GROUP_GAP} text-text-primary`}
            >
              Font Sizes
            </h3>
            <div
              className={`bg-surface ${getSpacingClass('CARD')} rounded-default border border-border ${getSpacingClass('DEMO_SUBSECTIONS')}`}
            >
              <div>
                <h1 className="text-h1 text-text-primary">H1 (XL) - 56px</h1>
                <p className="text-sm text-text-secondary">
                  메인 헤드라인 - Bold (700)
                </p>
              </div>
              <div>
                <h2 className="text-h2 text-text-primary">H2 (Large) - 36px</h2>
                <p className="text-sm text-text-secondary">
                  섹션 헤드라인 - SemiBold (600)
                </p>
              </div>
              <div>
                <h3 className="text-h3 text-text-primary">
                  H3 (Medium) - 24px
                </h3>
                <p className="text-sm text-text-secondary">
                  서브섹션 헤드라인 - SemiBold (600)
                </p>
              </div>
              <div>
                <p className="text-body text-text-primary">Body - 16px</p>
                <p className="text-sm text-text-secondary">
                  본문 텍스트 - Regular (400)
                </p>
              </div>
              <div>
                <p className="text-caption text-text-secondary">
                  Caption - 14px
                </p>
                <p className="text-sm text-text-secondary">
                  캡션 텍스트 - Regular (400)
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Color Palette Section */}
        <section className={getSpacingClass('SECTION')}>
          <h2
            className={`text-h2 mb-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN} text-text-primary`}
          >
            Color Palette
          </h2>

          {/* Primary Colors */}
          <div className={getSpacingClass('SUBSECTION')}>
            <h3
              className={`text-h3 mb-${DESIGN_SYSTEM_CONSTANTS.BUTTON_GROUP_GAP} text-text-primary`}
            >
              Primary Colors
            </h3>
            <div
              className={`grid grid-cols-${DESIGN_SYSTEM_CONSTANTS.GRID_COLS_MEDIUM} md:grid-cols-${DESIGN_SYSTEM_CONSTANTS.GRID_COLS_LARGE} ${getSpacingClass('GRID_GAP')}`}
            >
              <div className="bg-primary rounded-default p-4 text-white">
                <div className="font-semibold">Primary</div>
                <div className="text-sm opacity-90">#3B82F6</div>
              </div>
              <div className="bg-accent rounded-default p-4 text-white">
                <div className="font-semibold">Accent</div>
                <div className="text-sm opacity-90">#10B981</div>
              </div>
              <div className="bg-secondary rounded-default p-4 text-white">
                <div className="font-semibold">Secondary</div>
                <div className="text-sm opacity-90">#6B7280</div>
              </div>
              <div className="bg-negative rounded-default p-4 text-white">
                <div className="font-semibold">Negative</div>
                <div className="text-sm opacity-90">#EF4444</div>
              </div>
            </div>
          </div>

          {/* Surface Colors */}
          <div className={getSpacingClass('SUBSECTION')}>
            <h3
              className={`text-h3 mb-${DESIGN_SYSTEM_CONSTANTS.BUTTON_GROUP_GAP} text-text-primary`}
            >
              Surface Colors
            </h3>
            <div
              className={`grid grid-cols-${DESIGN_SYSTEM_CONSTANTS.GRID_COLS_MEDIUM} md:grid-cols-${DESIGN_SYSTEM_CONSTANTS.SURFACE_GRID_COLS} ${getSpacingClass('GRID_GAP')}`}
            >
              <div className="bg-background border border-border rounded-default p-4">
                <div className="font-semibold text-text-primary">
                  Background
                </div>
                <div className="text-sm text-text-secondary">#FFFFFF</div>
              </div>
              <div className="bg-surface border border-border rounded-default p-4">
                <div className="font-semibold text-text-primary">Surface</div>
                <div className="text-sm text-text-secondary">#F9FAFB</div>
              </div>
              <div className="bg-surface-secondary border border-border rounded-default p-4">
                <div className="font-semibold text-text-primary">
                  Surface Secondary
                </div>
                <div className="text-sm text-text-secondary">#F3F4F6</div>
              </div>
            </div>
          </div>
        </section>

        {/* Component Sections */}
        <section
          className={`space-y-${DESIGN_SYSTEM_CONSTANTS.COMPONENT_SECTIONS_SPACING}`}
        >
          <ButtonDemo />
          <SwitchDemo />
          <DropdownDemo />
          <ProgressDemo />
          <MiscDemo />
          <SimpleModalDemo />
        </section>
      </main>
    </div>
  )
}
