'use client'

import React, { useState } from 'react'
import Switch from '@/components/ui/Switch'
import { DESIGN_SYSTEM_CONSTANTS, getSpacingClass } from './constants'

const SwitchDemo: React.FC = () => {
  const [switches, setSwitches] = useState({
    wifi: false,
    bluetooth: true,
    location: false,
    enhanced: false,
    premium: true,
    advanced: false,
    normal: false,
    selected: true,
    small: false,
    medium: false,
    large: false,
    extraLarge: false,
    smallNoLabel: true,
    mediumNoLabel: true,
    largeNoLabel: true,
    xlNoLabel: true,
  })

  const handleSwitchChange = (key: string) => (selected: boolean) => {
    setSwitches((prev) => ({ ...prev, [key]: selected }))
  }

  return (
    <div className={getSpacingClass('DEMO_SECTIONS')}>
      <div>
        <h2
          className={`text-h2 mb-${DESIGN_SYSTEM_CONSTANTS.DEMO_HEADER_MARGIN} text-text-primary`}
        >
          Switch Components
        </h2>
        <p
          className={`text-body text-text-secondary mb-${DESIGN_SYSTEM_CONSTANTS.DEMO_DESCRIPTION_MARGIN}`}
        >
          토글 기능을 제공하는 스위치 컴포넌트들입니다.
        </p>
      </div>

      {/* Basic Switches */}
      <div className={getSpacingClass('DEMO_SECTIONS')}>
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3
            className={`text-h3 text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
          >
            Basic Switches
          </h3>
          <div className={getSpacingClass('SWITCH_LIST')}>
            <Switch
              label="WiFi"
              isSelected={switches.wifi}
              onChange={handleSwitchChange('wifi')}
            />
            <Switch
              label="Bluetooth"
              isSelected={switches.bluetooth}
              onChange={handleSwitchChange('bluetooth')}
            />
            <Switch
              label="Location Services"
              isSelected={switches.location}
              onChange={handleSwitchChange('location')}
            />
          </div>
        </div>

        {/* Switch Variants */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3
            className={`text-h3 text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
          >
            Switch Variants
          </h3>
          <div className={getSpacingClass('DEMO_SUBSECTIONS')}>
            <div className={getSpacingClass('SWITCH_LIST')}>
              <h4 className="text-sm font-medium text-text-primary">
                Enhanced Switch
              </h4>
              <Switch
                label="Enhanced Features"
                isSelected={switches.enhanced}
                onChange={handleSwitchChange('enhanced')}
              />
            </div>
            <div className={getSpacingClass('SWITCH_LIST')}>
              <h4 className="text-sm font-medium text-text-primary">
                Premium Switch
              </h4>
              <Switch
                label="Premium Access"
                isSelected={switches.premium}
                onChange={handleSwitchChange('premium')}
              />
            </div>
          </div>
        </div>

        {/* Switch States */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3
            className={`text-h3 text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
          >
            Switch States
          </h3>
          <div className={getSpacingClass('SWITCH_LIST')}>
            <Switch
              label="Advanced Settings"
              isSelected={switches.advanced}
              onChange={handleSwitchChange('advanced')}
            />
            <Switch
              label="Normal Mode"
              isSelected={switches.normal}
              onChange={handleSwitchChange('normal')}
            />
            <Switch
              label="Selected State"
              isSelected={switches.selected}
              onChange={handleSwitchChange('selected')}
            />
            <Switch
              label="Disabled Switch"
              isSelected={false}
              isDisabled
              onChange={() => {}}
            />
            <Switch
              label="Read Only Switch"
              isSelected={true}
              isReadOnly
              onChange={() => {}}
            />
          </div>
        </div>

        {/* Switch Sizes */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3
            className={`text-h3 text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
          >
            Switch Sizes
          </h3>
          <div className={getSpacingClass('DEMO_SUBSECTIONS')}>
            <div className={getSpacingClass('SWITCH_LIST')}>
              <h4 className="text-sm font-medium text-text-primary">
                With Labels
              </h4>
              <Switch
                label="Small Switch"
                size="small"
                isSelected={switches.small}
                onChange={handleSwitchChange('small')}
              />
              <Switch
                label="Medium Switch"
                size="medium"
                isSelected={switches.medium}
                onChange={handleSwitchChange('medium')}
              />
              <Switch
                label="Large Switch"
                size="large"
                isSelected={switches.large}
                onChange={handleSwitchChange('large')}
              />
              <Switch
                label="Extra Large Switch"
                size="extra-large"
                isSelected={switches.extraLarge}
                onChange={handleSwitchChange('extraLarge')}
              />
            </div>
            <div className={getSpacingClass('SWITCH_LIST')}>
              <h4 className="text-sm font-medium text-text-primary">
                Without Labels
              </h4>
              <div
                className={`flex gap-${DESIGN_SYSTEM_CONSTANTS.SWITCH_COMPONENTS_GAP} items-center`}
              >
                <Switch
                  size="small"
                  isSelected={switches.smallNoLabel}
                  onChange={handleSwitchChange('smallNoLabel')}
                />
                <Switch
                  size="medium"
                  isSelected={switches.mediumNoLabel}
                  onChange={handleSwitchChange('mediumNoLabel')}
                />
                <Switch
                  size="large"
                  isSelected={switches.largeNoLabel}
                  onChange={handleSwitchChange('largeNoLabel')}
                />
                <Switch
                  size="extra-large"
                  isSelected={switches.xlNoLabel}
                  onChange={handleSwitchChange('xlNoLabel')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SwitchDemo
