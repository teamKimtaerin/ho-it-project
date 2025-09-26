'use client'

import React, { useState } from 'react'
import Dropdown from '@/components/ui/Dropdown'
import { HomeIcon, UserIcon, SettingsIcon } from '@/components/icons'
import { DESIGN_SYSTEM_CONSTANTS, getSpacingClass } from './constants'

const DropdownDemo = () => {
  const [dropdowns, setDropdowns] = useState({
    basic: '',
    quiet: '',
    withIcon: '',
    error: '',
    required: '',
    sideLabel: '',
    small: '',
    medium: '',
    large: '',
    extraLarge: '',
    disabled: 'option1',
    readonly: 'option2',
  })

  const handleDropdownChange = (key: string) => (value: string) => {
    setDropdowns((prev) => ({ ...prev, [key]: value }))
  }

  // Sample dropdown options
  const basicOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
    { value: 'option4', label: 'Option 4', disabled: true },
  ]

  const iconOptions = [
    {
      value: 'home',
      label: 'Home',
      icon: <HomeIcon className="w-full h-full" />,
    },
    {
      value: 'user',
      label: 'User Profile',
      icon: <UserIcon className="w-full h-full" />,
    },
    {
      value: 'settings',
      label: 'Settings',
      icon: <SettingsIcon className="w-full h-full" />,
    },
  ]

  return (
    <div className={getSpacingClass('DEMO_SECTIONS')}>
      <div>
        <h2
          className={`text-h2 mb-${DESIGN_SYSTEM_CONSTANTS.DEMO_HEADER_MARGIN} text-text-primary`}
        >
          Dropdown Components
        </h2>
        <p
          className={`text-body text-text-secondary mb-${DESIGN_SYSTEM_CONSTANTS.DEMO_DESCRIPTION_MARGIN}`}
        >
          다양한 옵션을 선택할 수 있는 드롭다운 컴포넌트들입니다.
        </p>
      </div>

      {/* Basic Dropdowns */}
      <div className={getSpacingClass('DEMO_SECTIONS')}>
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3
            className={`text-h3 text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
          >
            Basic Dropdowns
          </h3>
          <div
            className={`grid grid-cols-${DESIGN_SYSTEM_CONSTANTS.GRID_COLS_SMALL} md:grid-cols-${DESIGN_SYSTEM_CONSTANTS.GRID_COLS_MEDIUM} ${getSpacingClass('GRID_GAP')}`}
          >
            <Dropdown
              label="Basic Dropdown"
              placeholder="Choose an option"
              options={basicOptions}
              value={dropdowns.basic}
              onChange={handleDropdownChange('basic')}
            />
            <Dropdown
              label="Alternative Style"
              placeholder="Select option"
              options={basicOptions}
              value={dropdowns.quiet}
              onChange={handleDropdownChange('quiet')}
            />
          </div>
        </div>

        {/* Dropdown with Icons */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3 className="text-h3 text-text-primary mb-4">
            Dropdown with Icons
          </h3>
          <div
            className={`grid grid-cols-${DESIGN_SYSTEM_CONSTANTS.GRID_COLS_SMALL} md:grid-cols-${DESIGN_SYSTEM_CONSTANTS.GRID_COLS_MEDIUM} ${getSpacingClass('GRID_GAP')}`}
          >
            <Dropdown
              label="With Icon Options"
              placeholder="Select with icon"
              options={iconOptions}
              value={dropdowns.withIcon}
              onChange={handleDropdownChange('withIcon')}
            />
          </div>
        </div>

        {/* Dropdown States */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3
            className={`text-h3 text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
          >
            Dropdown States
          </h3>
          <div
            className={`grid grid-cols-${DESIGN_SYSTEM_CONSTANTS.GRID_COLS_SMALL} md:grid-cols-${DESIGN_SYSTEM_CONSTANTS.GRID_COLS_MEDIUM} ${getSpacingClass('GRID_GAP')}`}
          >
            <Dropdown
              label="Error State"
              placeholder="Select option"
              options={basicOptions}
              value={dropdowns.error}
              onChange={handleDropdownChange('error')}
              isError
              errorMessage="Please select a valid option"
            />
            <Dropdown
              label="Required Field"
              placeholder="Select required option"
              options={basicOptions}
              value={dropdowns.required}
              onChange={handleDropdownChange('required')}
              isRequired
            />
            <Dropdown
              label="Disabled Dropdown"
              placeholder="Disabled"
              options={basicOptions}
              value={dropdowns.disabled}
              onChange={handleDropdownChange('disabled')}
              isDisabled
            />
            <Dropdown
              label="Read Only"
              placeholder="Read only"
              options={basicOptions}
              value={dropdowns.readonly}
              onChange={handleDropdownChange('readonly')}
              isReadOnly
            />
          </div>
        </div>

        {/* Dropdown Sizes */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3
            className={`text-h3 text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
          >
            Dropdown Sizes
          </h3>
          <div className="space-y-4">
            <Dropdown
              label="Small Size"
              size="small"
              placeholder="Small dropdown"
              options={basicOptions}
              value={dropdowns.small}
              onChange={handleDropdownChange('small')}
            />
            <Dropdown
              label="Medium Size (Default)"
              size="medium"
              placeholder="Medium dropdown"
              options={basicOptions}
              value={dropdowns.medium}
              onChange={handleDropdownChange('medium')}
            />
            <Dropdown
              label="Large Size"
              size="large"
              placeholder="Large dropdown"
              options={basicOptions}
              value={dropdowns.large}
              onChange={handleDropdownChange('large')}
            />
            <Dropdown
              label="Extra Large Size"
              size="extra-large"
              placeholder="Extra large dropdown"
              options={basicOptions}
              value={dropdowns.extraLarge}
              onChange={handleDropdownChange('extraLarge')}
            />
          </div>
        </div>

        {/* Side Label Dropdown */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3 className="text-h3 text-text-primary mb-4">Side Label Layout</h3>
          <Dropdown
            label="Category"
            labelPosition="side"
            placeholder="Select category"
            options={basicOptions}
            value={dropdowns.sideLabel}
            onChange={handleDropdownChange('sideLabel')}
          />
        </div>
      </div>
    </div>
  )
}

export default DropdownDemo
