'use client'

import { StarIcon } from '@/components/icons'
import AlertBanner from '@/components/ui/AlertBanner'
import AlertDialog from '@/components/ui/AlertDialog'
import Badge from '@/components/ui/Badge'
import HelpText from '@/components/ui/HelpText'
import Slider from '@/components/ui/Slider'
import StatusLight from '@/components/ui/StatusLight'
import Tab from '@/components/ui/Tab'
import TabItem from '@/components/ui/TabItem'
import Tag from '@/components/ui/Tag'
import React, { useState } from 'react'
import { DESIGN_SYSTEM_CONSTANTS, getSpacingClass } from './constants'

// 탭 , 슬라이더, 태그, Status light, 배지, 알림 배너, 알림 dialog
const MiscDemo: React.FC = () => {
  const [sliderValue, setSliderValue] = useState<number>(
    DESIGN_SYSTEM_CONSTANTS.DEFAULT_SLIDER_VALUE
  )
  const [showAlert, setShowAlert] = useState(false)

  return (
    <div className={getSpacingClass('DEMO_SECTIONS')}>
      <div>
        <h2
          className={`text-h2 mb-${DESIGN_SYSTEM_CONSTANTS.DEMO_HEADER_MARGIN} text-text-primary`}
        >
          Miscellaneous Components
        </h2>
        <p
          className={`text-body text-text-secondary mb-${DESIGN_SYSTEM_CONSTANTS.DEMO_DESCRIPTION_MARGIN}`}
        >
          다양한 기능을 제공하는 기타 컴포넌트들입니다.
        </p>
      </div>

      {/* Tabs */}
      <div className={getSpacingClass('DEMO_SECTIONS')}>
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3
            className={`text-h3 text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
          >
            Tab Components
          </h3>
          <Tab>
            <TabItem id="home" label="Home">
              <div
                className={`p-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
              >
                <h4
                  className={`font-medium mb-${DESIGN_SYSTEM_CONSTANTS.SUBSECTION_HEADER_MARGIN}`}
                >
                  Home Content
                </h4>
                <p className="text-text-secondary">
                  This is the home tab content.
                </p>
              </div>
            </TabItem>
            <TabItem id="profile" label="Profile">
              <div
                className={`p-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
              >
                <h4
                  className={`font-medium mb-${DESIGN_SYSTEM_CONSTANTS.SUBSECTION_HEADER_MARGIN}`}
                >
                  Profile Content
                </h4>
                <p className="text-text-secondary">
                  This is the profile tab content.
                </p>
              </div>
            </TabItem>
            <TabItem id="settings" label="Settings">
              <div
                className={`p-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
              >
                <h4
                  className={`font-medium mb-${DESIGN_SYSTEM_CONSTANTS.SUBSECTION_HEADER_MARGIN}`}
                >
                  Settings Content
                </h4>
                <p className="text-text-secondary">
                  This is the settings tab content.
                </p>
              </div>
            </TabItem>
          </Tab>
        </div>

        {/* Slider */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3 className="text-h3 text-text-primary mb-4">Slider Components</h3>
          <div className="space-y-6">
            {/* Basic Interactive Slider */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Basic Interactive Slider
              </h4>
              <p className="text-xs text-text-secondary">
                Drag to change value
              </p>
              <Slider
                label={`Current Value: ${sliderValue}`}
                minValue={DESIGN_SYSTEM_CONSTANTS.SLIDER_MIN_VALUE}
                maxValue={DESIGN_SYSTEM_CONSTANTS.SLIDER_MAX_VALUE}
                value={sliderValue}
                onChange={setSliderValue}
                step={5}
                width={400}
                hasFill={true}
              />
            </div>

            {/* Custom Range with Fill */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Custom Range with Fill (20-80)
              </h4>
              <p className="text-xs text-text-secondary">
                Shows fill from start position
              </p>
              <Slider
                label="Range Value: 50"
                minValue={DESIGN_SYSTEM_CONSTANTS.CUSTOM_SLIDER_MIN}
                maxValue={DESIGN_SYSTEM_CONSTANTS.CUSTOM_SLIDER_MAX}
                value={50}
                onChange={() => {}}
                step={2}
                width={400}
                hasFill={true}
                fillStart={30}
              />
            </div>

            {/* Gradient Fill Slider */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Gradient Fill Slider
              </h4>
              <p className="text-xs text-text-secondary">
                Interactive slider with gradient fill effect
              </p>
              <Slider
                label="Progress: 75%"
                minValue={0}
                maxValue={100}
                value={75}
                onChange={() => {}}
                hasFill={true}
                hasGradient={true}
                step={1}
                width={400}
              />
            </div>

            {/* Label Position Left */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Left Label Position
              </h4>
              <p className="text-xs text-text-secondary">
                Label positioned to the left of slider
              </p>
              <Slider
                label="Volume:"
                labelPosition="left"
                minValue={0}
                maxValue={100}
                value={60}
                onChange={() => {}}
                step={5}
                width={300}
                hasFill={true}
              />
            </div>

            {/* Precision Slider */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                High Precision (0.1 step)
              </h4>
              <p className="text-xs text-text-secondary">
                Fine control with decimal values
              </p>
              <Slider
                label="Precision: 3.7"
                minValue={0}
                maxValue={10}
                value={3.7}
                onChange={() => {}}
                step={0.1}
                width={400}
                valueFormat={(val) => `${val.toFixed(1)}°C`}
                hasFill={true}
              />
            </div>

            {/* Logarithmic Scale */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Logarithmic Scale
              </h4>
              <p className="text-xs text-text-secondary">
                Non-linear progression for frequency ranges
              </p>
              <Slider
                label="Frequency: 10Hz"
                minValue={1}
                maxValue={1000}
                value={10}
                onChange={() => {}}
                progressionScale="log"
                width={400}
                valueFormat={(val) => `${Math.round(val)}Hz`}
                hasFill={true}
                hasGradient={true}
              />
            </div>

            {/* Read-only Slider */}
            <div className="space-y-3">
              <h4 className="text-body font-medium text-text-primary">
                Read-only Display
              </h4>
              <p className="text-xs text-text-secondary">
                Non-interactive slider for display purposes
              </p>
              <Slider
                label="CPU Usage: 65%"
                minValue={0}
                maxValue={100}
                value={65}
                isEditable={false}
                width={400}
                hasFill={true}
                hasGradient={true}
              />
            </div>

            {/* Disabled State */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Disabled State
              </h4>
              <p className="text-xs text-text-secondary">
                Disabled slider with reduced opacity
              </p>
              <Slider
                label="Disabled Setting: 40"
                minValue={0}
                maxValue={100}
                value={40}
                isDisabled={true}
                width={400}
                hasFill={true}
              />
            </div>

            {/* Custom Width Demonstration */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-text-primary">
                Different Widths
              </h4>
              <p className="text-xs text-text-secondary">
                Sliders with varying widths
              </p>
              <div className="space-y-3">
                <Slider
                  label="Small (200px)"
                  minValue={0}
                  maxValue={100}
                  value={30}
                  width={200}
                  hasFill={true}
                  onChange={() => {}}
                />
                <Slider
                  label="Medium (300px)"
                  minValue={0}
                  maxValue={100}
                  value={60}
                  width={300}
                  hasFill={true}
                  onChange={() => {}}
                />
                <Slider
                  label="Large (500px)"
                  minValue={0}
                  maxValue={100}
                  value={80}
                  width={500}
                  hasFill={true}
                  hasGradient={true}
                  onChange={() => {}}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3 className="text-h3 text-text-primary mb-4">Tag Components</h3>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Tag label="Default Tag" />
              <Tag label="With Error" isError />
              <Tag label="Basic Tag" />
              <Tag label="Another Tag" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Tag label="Small" size="small" />
              <Tag label="Medium" size="medium" />
              <Tag label="Large" size="large" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Tag
                label="Removable"
                isRemovable
                onRemove={() => console.log('Removed')}
              />
              <Tag label="With Avatar" hasAvatar avatar={<StarIcon />} />
            </div>
          </div>
        </div>

        {/* Status Lights */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3 className="text-h3 text-text-primary mb-4">
            Status Light Components
          </h3>
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <StatusLight variant="positive" label="Online" />
              <StatusLight variant="negative" label="Offline" />
              <StatusLight variant="notice" label="Warning" />
              <StatusLight variant="neutral" label="Idle" />
            </div>
            <div className="flex gap-4 items-center">
              <StatusLight variant="positive" label="Small" size="small" />
              <StatusLight variant="negative" label="Medium" size="medium" />
              <StatusLight variant="notice" label="Large" size="large" />
            </div>
          </div>
        </div>

        {/* Badges */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3 className="text-h3 text-text-primary mb-4">Badge Components</h3>
          <div className="space-y-6">
            {/* Variant Colors */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Badge Variants
              </h4>
              <p className="text-xs text-text-secondary">
                Different color variants for various use cases
              </p>
              <div className="flex gap-2 flex-wrap">
                <Badge label="Positive" variant="positive" />
                <Badge label="Informative" variant="informative" />
                <Badge label="Negative" variant="negative" />
                <Badge label="Notice" variant="notice" />
                <Badge label="Neutral" variant="neutral" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge label="Gray" variant="gray" />
                <Badge label="Red" variant="red" />
                <Badge label="Orange" variant="orange" />
                <Badge label="Yellow" variant="yellow" />
                <Badge label="Chartreuse" variant="chartreuse" />
              </div>
            </div>

            {/* Size Variants */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Badge Sizes
              </h4>
              <p className="text-xs text-text-secondary">
                Different sizes for various contexts
              </p>
              <div className="flex gap-2 flex-wrap items-center">
                <Badge label="Small" size="small" variant="positive" />
                <Badge label="Medium" size="medium" variant="informative" />
                <Badge label="Large" size="large" variant="negative" />
                <Badge
                  label="Extra Large"
                  size="extra-large"
                  variant="notice"
                />
              </div>
            </div>

            {/* With Icons */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Badges with Icons
              </h4>
              <p className="text-xs text-text-secondary">
                Icons can be used with or without labels
              </p>
              <div className="flex gap-2 flex-wrap items-center">
                <Badge label="5 items" icon={<StarIcon />} variant="positive" />
                <Badge label="New" icon={<StarIcon />} variant="informative" />
                <Badge icon={<StarIcon />} variant="negative" />
                <Badge icon={<StarIcon />} variant="notice" size="large" />
              </div>
            </div>

            {/* Rounding Options */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Badge Rounding
              </h4>
              <p className="text-xs text-text-secondary">
                Different border radius options
              </p>
              <div className="flex gap-2 flex-wrap items-center">
                <Badge label="Default" rounding="default" variant="positive" />
                <Badge label="Small" rounding="small" variant="informative" />
                <Badge label="Full" rounding="full" variant="negative" />
              </div>
            </div>

            {/* Fixed Positioning Demo */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Fixed Position Badges
              </h4>
              <p className="text-xs text-text-secondary">
                Badges that can be positioned relative to parent elements
              </p>
              <div className="flex gap-6 flex-wrap">
                <div className="relative w-16 h-16 bg-surface border rounded flex items-center justify-center">
                  <span className="text-sm text-text-secondary">Top</span>
                  <Badge label="3" variant="red" fixed="top" />
                </div>
                <div className="relative w-16 h-16 bg-surface border rounded flex items-center justify-center">
                  <span className="text-sm text-text-secondary">Right</span>
                  <Badge label="!" variant="negative" fixed="right" />
                </div>
                <div className="relative w-16 h-16 bg-surface border rounded flex items-center justify-center">
                  <span className="text-sm text-text-secondary">Bottom</span>
                  <Badge label="99+" variant="notice" fixed="bottom" />
                </div>
                <div className="relative w-16 h-16 bg-surface border rounded flex items-center justify-center">
                  <span className="text-sm text-text-secondary">Left</span>
                  <Badge icon={<StarIcon />} variant="positive" fixed="left" />
                </div>
              </div>
            </div>

            {/* Complex Examples */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Complex Badge Examples
              </h4>
              <p className="text-xs text-text-secondary">
                Real-world usage examples
              </p>
              <div className="flex gap-2 flex-wrap items-center">
                <Badge
                  label="v2.1.0"
                  variant="gray"
                  size="small"
                  rounding="small"
                />
                <Badge icon={<StarIcon />} label="Premium" variant="yellow" />
                <Badge label="BETA" variant="orange" size="small" />
                <Badge
                  label="Online"
                  variant="positive"
                  icon={<StarIcon />}
                  rounding="full"
                />
                <Badge label="Admin" variant="red" size="large" />
              </div>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3 className="text-h3 text-text-primary mb-4">
            Help Text Components
          </h3>
          <div className="space-y-3">
            <HelpText text="This is a default help text message." />
            <HelpText
              text="This is an error help text message."
              variant="negative"
            />
            <HelpText
              text="This is a neutral help text message."
              variant="neutral"
            />
          </div>
        </div>

        {/* Alert Banner */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3 className="text-h3 text-text-primary mb-4">
            Alert Banner Components
          </h3>
          <div className="space-y-4">
            <AlertBanner
              text="This is an informational alert banner."
              variant="informative"
            />
            <AlertBanner
              text="This is a neutral alert banner."
              variant="neutral"
            />
            <AlertBanner
              text="An error occurred while processing your request."
              variant="negative"
            />
          </div>
        </div>

        {/* Alert Dialog */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3 className="text-h3 text-text-primary mb-4">
            Alert Dialog Component
          </h3>
          <div className="space-y-4">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded"
              onClick={() => setShowAlert(true)}
            >
              Show Alert Dialog
            </button>
            <AlertDialog
              isOpen={showAlert}
              onClose={() => setShowAlert(false)}
              title="Confirmation"
              description="Are you sure you want to delete this item?"
              primaryActionLabel="Delete"
              secondaryActionLabel="Cancel"
              onPrimaryAction={() => {
                console.log('Confirmed')
                setShowAlert(false)
              }}
              onSecondaryAction={() => setShowAlert(false)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default MiscDemo
