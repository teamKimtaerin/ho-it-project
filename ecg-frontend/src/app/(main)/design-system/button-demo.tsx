'use client'

import React from 'react'
import Button from '@/components/ui/Button'
import ButtonGroup from '@/components/ui/ButtonGroup'
import { StarIcon, HeartIcon, PlusIcon } from '@/components/icons'
import { DESIGN_SYSTEM_CONSTANTS, getSpacingClass } from './constants'

const ButtonDemo = () => {
  return (
    <div className={getSpacingClass('DEMO_SECTIONS')}>
      <div>
        <h2
          className={`text-h2 mb-${DESIGN_SYSTEM_CONSTANTS.DEMO_HEADER_MARGIN} text-text-primary`}
        >
          Button Components
        </h2>
        <p
          className={`text-body text-text-secondary mb-${DESIGN_SYSTEM_CONSTANTS.DEMO_DESCRIPTION_MARGIN}`}
        >
          다양한 스타일과 크기의 버튼 컴포넌트들입니다.
        </p>
      </div>

      {/* Basic Buttons */}
      <div className={getSpacingClass('DEMO_SECTIONS')}>
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3
            className={`text-h3 text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
          >
            Basic Buttons
          </h3>
          <div className={`flex ${getSpacingClass('BUTTON_GROUP')} flex-wrap`}>
            <Button label="Primary" variant="primary" />
            <Button label="Secondary" variant="secondary" />
            <Button label="Accent" variant="accent" />
            <Button label="Negative" variant="negative" />
          </div>
        </div>

        {/* Button Styles */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3
            className={`text-h3 text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
          >
            Button Styles
          </h3>
          <div className={getSpacingClass('DEMO_SUBSECTIONS')}>
            <div
              className={`flex ${getSpacingClass('BUTTON_GROUP')} flex-wrap`}
            >
              <h4
                className={`w-full text-sm font-medium text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SUBSECTION_HEADER_MARGIN}`}
              >
                Fill Style
              </h4>
              <Button label="Primary Fill" variant="primary" style="fill" />
              <Button label="Secondary Fill" variant="secondary" style="fill" />
              <Button label="Accent Fill" variant="accent" style="fill" />
              <Button label="Negative Fill" variant="negative" style="fill" />
            </div>
            <div
              className={`flex ${getSpacingClass('BUTTON_GROUP')} flex-wrap`}
            >
              <h4
                className={`w-full text-sm font-medium text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SUBSECTION_HEADER_MARGIN}`}
              >
                Outline Style
              </h4>
              <Button
                label="Primary Outline"
                variant="primary"
                style="outline"
              />
              <Button
                label="Secondary Outline"
                variant="secondary"
                style="outline"
              />
              <Button label="Accent Outline" variant="accent" style="outline" />
              <Button
                label="Negative Outline"
                variant="negative"
                style="outline"
              />
            </div>
          </div>
        </div>

        {/* Button Sizes */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3
            className={`text-h3 text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
          >
            Button Sizes
          </h3>
          <div className="flex gap-3 flex-wrap items-center">
            <Button label="Small" variant="primary" size="small" />
            <Button label="Medium" variant="primary" size="medium" />
            <Button label="Large" variant="primary" size="large" />
            <Button label="Extra Large" variant="primary" size="extra-large" />
          </div>
        </div>

        {/* Button States */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3
            className={`text-h3 text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
          >
            Button States
          </h3>
          <div className={`flex ${getSpacingClass('BUTTON_GROUP')} flex-wrap`}>
            <Button label="Normal" variant="primary" />
            <Button label="Disabled" variant="primary" isDisabled />
            <Button label="Pending" variant="primary" isPending />
          </div>
        </div>

        {/* Button with Icons */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3
            className={`text-h3 text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
          >
            Buttons with Icons
          </h3>
          <div className={getSpacingClass('DEMO_SUBSECTIONS')}>
            <div
              className={`flex ${getSpacingClass('BUTTON_GROUP')} flex-wrap`}
            >
              <h4
                className={`w-full text-sm font-medium text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SUBSECTION_HEADER_MARGIN}`}
              >
                Icon + Label
              </h4>
              <Button label="Add Item" variant="primary" icon={<PlusIcon />} />
              <Button
                label="Favorite"
                variant="secondary"
                icon={<HeartIcon />}
              />
              <Button
                label="Star Rating"
                variant="accent"
                icon={<StarIcon />}
              />
            </div>
            <div
              className={`flex ${getSpacingClass('BUTTON_GROUP')} flex-wrap`}
            >
              <h4
                className={`w-full text-sm font-medium text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SUBSECTION_HEADER_MARGIN}`}
              >
                Icon Only
              </h4>
              <Button variant="primary" icon={<PlusIcon />} />
              <Button variant="secondary" icon={<HeartIcon />} />
              <Button variant="accent" icon={<StarIcon />} />
            </div>
          </div>
        </div>

        {/* Button Groups */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3
            className={`text-h3 text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
          >
            Button Groups
          </h3>
          <div className={getSpacingClass('DEMO_SUBSECTIONS')}>
            <ButtonGroup>
              <Button label="First" variant="secondary" />
              <Button label="Second" variant="secondary" />
              <Button label="Third" variant="secondary" />
            </ButtonGroup>

            <ButtonGroup>
              <Button label="Small" variant="primary" size="small" />
              <Button label="Group" variant="primary" size="small" />
              <Button label="Example" variant="primary" size="small" />
            </ButtonGroup>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ButtonDemo
