import { ButtonProps } from '@/components/ui/Button'
import { type ComponentSize } from '@/utils'
import React, { Children, cloneElement, isValidElement } from 'react'

export interface ButtonGroupProps {
  orientation?: 'horizontal' | 'vertical'
  size?: ComponentSize
  spacing?: 'none' | 'small' | 'medium' | 'large'
  isDisabled?: boolean
  className?: string
  children: React.ReactNode
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({
  orientation = 'horizontal',
  size = 'medium',
  spacing = 'none',
  isDisabled = false,
  className = '',
  children,
}) => {
  // Spacing classes based on spacing size
  const getSpacingClasses = () => {
    if (spacing === 'none') return []

    const spacingMap = {
      small: 'gap-1',
      medium: 'gap-2',
      large: 'gap-4',
    }

    return [spacingMap[spacing]]
  }

  // Base classes for the group container
  const baseClasses = [
    'inline-flex',
    orientation === 'horizontal' ? 'flex-row' : 'flex-col',
    ...getSpacingClasses(),
  ]

  // Additional container classes
  const containerClasses = [...baseClasses, className].join(' ')

  // Process children to apply group styling
  const processedChildren = Children.map(children, (child, index) => {
    if (!isValidElement(child)) return child

    const childCount = Children.count(children)
    const isFirst = index === 0
    const isLast = index === childCount - 1
    const isMiddle = !isFirst && !isLast

    // Calculate border radius classes based on position and orientation
    const getBorderRadiusClasses = () => {
      if (childCount === 1 || spacing !== 'none') return '' // Single button or spaced buttons keep original radius

      if (orientation === 'horizontal') {
        if (isFirst) return 'rounded-r-none'
        if (isLast) return 'rounded-l-none'
        if (isMiddle) return 'rounded-none'
      } else {
        // vertical
        if (isFirst) return 'rounded-b-none'
        if (isLast) return 'rounded-t-none'
        if (isMiddle) return 'rounded-none'
      }
      return ''
    }

    // Calculate border classes to avoid double borders
    const getBorderClasses = () => {
      if (childCount === 1 || spacing !== 'none') return '' // Single button or spaced buttons keep original borders

      if (orientation === 'horizontal') {
        // Remove right border for all except last
        if (!isLast) return '-mr-px'
      } else {
        // vertical - remove bottom border for all except last
        if (!isLast) return '-mb-px'
      }
      return ''
    }

    // Create additional classes for the button
    const additionalClasses = [
      getBorderRadiusClasses(),
      getBorderClasses(),
      // Ensure buttons stay connected and have proper z-index
      'relative',
      'focus:z-10',
      'hover:z-10',
    ]
      .filter(Boolean)
      .join(' ')

    // Clone the child button with additional props
    const buttonChild = child as React.ReactElement<ButtonProps>
    return cloneElement(buttonChild, {
      size: buttonChild.props.size || size, // Use button's own size or group size
      isDisabled: buttonChild.props.isDisabled ?? isDisabled, // Group disabled overrides individual unless explicitly set
      className:
        `${buttonChild.props.className || ''} ${additionalClasses}`.trim(),
    })
  })

  return (
    <div className={containerClasses} role="group">
      {processedChildren}
    </div>
  )
}

export default ButtonGroup
