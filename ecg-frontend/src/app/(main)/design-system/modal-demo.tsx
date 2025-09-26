'use client'

import React, { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { DESIGN_SYSTEM_CONSTANTS, getSpacingClass } from './constants'

const SimpleModalDemo: React.FC = () => {
  const [modals, setModals] = useState({
    basic: false,
    withHeader: false,
    withFooter: false,
    sizeSmall: false,
    sizeMedium: false,
    sizeLarge: false,
    actions: false,
    scrollable: false,
    nonDismissible: false,
  })

  const handleModalOpen = (key: keyof typeof modals) => {
    setModals((prev) => ({ ...prev, [key]: true }))
  }

  const handleModalClose = (key: keyof typeof modals) => {
    setModals((prev) => ({ ...prev, [key]: false }))
  }

  return (
    <div className={getSpacingClass('DEMO_SECTIONS')}>
      <div>
        <h2
          className={`text-h2 mb-${DESIGN_SYSTEM_CONSTANTS.DEMO_HEADER_MARGIN} text-text-primary`}
        >
          Modal Component (Simplified)
        </h2>
        <p
          className={`text-body text-text-secondary mb-${DESIGN_SYSTEM_CONSTANTS.DEMO_DESCRIPTION_MARGIN}`}
        >
          간소화된 Modal 컴포넌트: 기본 기능 중심으로 최적화되었습니다.
        </p>
      </div>

      {/* Basic Examples */}
      <div className={getSpacingClass('DEMO_SECTIONS')}>
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3
            className={`text-h3 text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
          >
            Basic Examples
          </h3>
          <div className={`flex ${getSpacingClass('BUTTON_GROUP')} flex-wrap`}>
            <Button
              label="Basic Modal"
              onClick={() => handleModalOpen('basic')}
            />
            <Button
              label="With Header"
              onClick={() => handleModalOpen('withHeader')}
            />
            <Button
              label="With Action Footer"
              onClick={() => handleModalOpen('withFooter')}
            />
          </div>
        </div>

        {/* Size Variants */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3
            className={`text-h3 text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
          >
            Size Variants
          </h3>
          <div className={`flex ${getSpacingClass('BUTTON_GROUP')} flex-wrap`}>
            <Button
              label="Small (sm)"
              onClick={() => handleModalOpen('sizeSmall')}
              size="small"
            />
            <Button
              label="Medium (md)"
              onClick={() => handleModalOpen('sizeMedium')}
              size="medium"
            />
            <Button
              label="Large (lg)"
              onClick={() => handleModalOpen('sizeLarge')}
              size="large"
            />
          </div>
        </div>

        {/* Behavior Options */}
        <div
          className={`${getSpacingClass('CARD')} bg-surface-secondary rounded-small`}
        >
          <h3
            className={`text-h3 text-text-primary mb-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
          >
            Behavior Options
          </h3>
          <div className={`flex ${getSpacingClass('BUTTON_GROUP')} flex-wrap`}>
            <Button
              label="Action Buttons"
              onClick={() => handleModalOpen('actions')}
            />
            <Button
              label="Scrollable Content"
              onClick={() => handleModalOpen('scrollable')}
            />
            <Button
              label="Non-Dismissible"
              onClick={() => handleModalOpen('nonDismissible')}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={modals.basic}
        onClose={() => handleModalClose('basic')}
        title="Basic Modal"
      >
        <p className="text-body text-text-secondary">
          This is a basic modal with minimal configuration. Simple and clean.
        </p>
      </Modal>

      <Modal
        isOpen={modals.withHeader}
        onClose={() => handleModalClose('withHeader')}
        title="Modal with Header"
        subtitle="This modal includes a subtitle for additional context"
      >
        <p className="text-body text-text-secondary">
          모달 헤더에는 제목과 부제목이 포함될 수 있습니다.
        </p>
      </Modal>

      <Modal
        isOpen={modals.withFooter}
        onClose={() => handleModalClose('withFooter')}
        title="Modal with Actions"
        primaryAction={{
          label: 'Save Changes',
          onClick: () => {
            alert('Changes saved!')
            handleModalClose('withFooter')
          },
        }}
        secondaryAction={{
          label: 'Save Draft',
          onClick: () => {
            alert('Draft saved!')
          },
          variant: 'secondary',
        }}
        cancelAction={{
          label: 'Cancel',
          onClick: () => {
            handleModalClose('withFooter')
          },
        }}
      >
        <div className={getSpacingClass('DEMO_SUBSECTIONS')}>
          <p className="text-body text-text-secondary">
            This modal includes action buttons in the footer.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Setting Name
              </label>
              <input
                type="text"
                className={`w-full p-${DESIGN_SYSTEM_CONSTANTS.INPUT_PADDING} border border-gray-medium rounded-default`}
                placeholder="Enter setting name"
                autoFocus
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Size Demonstration Modals */}
      <Modal
        isOpen={modals.sizeSmall}
        onClose={() => handleModalClose('sizeSmall')}
        title="Small Modal (sm)"
        size="sm"
      >
        <div className={getSpacingClass('DEMO_SUBSECTIONS')}>
          <p className="text-body text-text-secondary">
            This is a small modal (max-width: 384px). Perfect for simple
            confirmations and alerts.
          </p>
          <div
            className={`p-${DESIGN_SYSTEM_CONSTANTS.BUTTON_GROUP_GAP} bg-blue-50 border border-blue-200 rounded`}
          >
            <p className="text-blue-800 text-sm">
              📏 Small size modal demonstration
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modals.sizeMedium}
        onClose={() => handleModalClose('sizeMedium')}
        title="Medium Modal (md)"
        size="md"
      >
        <div className={getSpacingClass('DEMO_SUBSECTIONS')}>
          <p className="text-body text-text-secondary">
            This is a medium modal (max-width: 448px). The default size for most
            use cases.
          </p>
          <div
            className={`p-${DESIGN_SYSTEM_CONSTANTS.BUTTON_GROUP_GAP} bg-green-50 border border-green-200 rounded`}
          >
            <p className="text-green-800 text-sm">
              📏 Medium size modal demonstration
            </p>
          </div>
          <p className="text-sm text-text-secondary">
            Medium modals provide a good balance between content space and
            screen real estate.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={modals.sizeLarge}
        onClose={() => handleModalClose('sizeLarge')}
        title="Large Modal (lg)"
        size="lg"
      >
        <div className={getSpacingClass('DEMO_SUBSECTIONS')}>
          <p className="text-body text-text-secondary">
            This is a large modal (max-width: 512px). Great for forms and
            complex content.
          </p>
          <div
            className={`p-${DESIGN_SYSTEM_CONSTANTS.BUTTON_GROUP_GAP} bg-purple-50 border border-purple-200 rounded`}
          >
            <p className="text-purple-800 text-sm">
              📏 Large size modal demonstration
            </p>
          </div>
          <div
            className={`grid grid-cols-${DESIGN_SYSTEM_CONSTANTS.MODAL_CONTENT_GRID_COLS} ${getSpacingClass('GRID_GAP')} mt-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN}`}
          >
            <div
              className={`p-${DESIGN_SYSTEM_CONSTANTS.BUTTON_GROUP_GAP} bg-gray-50 rounded`}
            >
              <h4 className="font-medium mb-1">Feature 1</h4>
              <p className="text-sm text-gray-600">
                Large modals can accommodate more detailed content.
              </p>
            </div>
            <div
              className={`p-${DESIGN_SYSTEM_CONSTANTS.BUTTON_GROUP_GAP} bg-gray-50 rounded`}
            >
              <h4 className="font-medium mb-1">Feature 2</h4>
              <p className="text-sm text-gray-600">
                Perfect for complex forms and data presentation.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modals.actions}
        onClose={() => handleModalClose('actions')}
        title="Action Buttons Demo"
        size="md"
        primaryAction={{
          label: 'Primary Action',
          onClick: () => alert('Primary action clicked!'),
          variant: 'primary',
        }}
        secondaryAction={{
          label: 'Secondary Action',
          onClick: () => alert('Secondary action clicked!'),
          variant: 'secondary',
        }}
        cancelAction={{
          label: 'Cancel',
          onClick: () => handleModalClose('actions'),
        }}
      >
        <div className={getSpacingClass('DEMO_SUBSECTIONS')}>
          <p className="text-body text-text-secondary">
            Modal with customizable action buttons in the footer.
          </p>
          <ul className="space-y-2 text-text-secondary text-sm">
            <li>
              • <strong>Primary Action:</strong> Main call-to-action button
            </li>
            <li>
              • <strong>Secondary Action:</strong> Alternative action
            </li>
            <li>
              • <strong>Cancel Action:</strong> Close or cancel button
            </li>
          </ul>
        </div>
      </Modal>

      <Modal
        isOpen={modals.scrollable}
        onClose={() => handleModalClose('scrollable')}
        title="Scrollable Content Demo"
        size="md"
        scrollable={true}
      >
        <div className="space-y-6">
          <p className="text-body text-text-secondary">
            This modal demonstrates scrollable content with proper overflow
            handling.
          </p>

          {/* Generate long content */}
          {Array.from(
            { length: DESIGN_SYSTEM_CONSTANTS.SCROLLABLE_CONTENT_ITEMS },
            (_, i) => (
              <div
                key={i}
                className={`p-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN} bg-gray-light rounded-default`}
              >
                <h4 className="font-semibold text-text-primary mb-2">
                  Section {i + DESIGN_SYSTEM_CONSTANTS.SECTION_INDEX_OFFSET}:
                  Content Block
                </h4>
                <p className="text-text-secondary">
                  This is scrollable content section{' '}
                  {i + DESIGN_SYSTEM_CONSTANTS.SECTION_INDEX_OFFSET}. The modal
                  maintains proper scrolling behavior while keeping the header
                  and footer fixed. Lorem ipsum dolor sit amet, consectetur
                  adipiscing elit.
                </p>
              </div>
            )
          )}
        </div>
      </Modal>

      <Modal
        isOpen={modals.nonDismissible}
        onClose={() => handleModalClose('nonDismissible')}
        title="Non-Dismissible Modal"
        size="md"
        dismissible={false}
        closeOnEsc={false}
        closeOnBackdropClick={false}
        primaryAction={{
          label: 'Complete Action',
          onClick: () => {
            alert('Action completed!')
            handleModalClose('nonDismissible')
          },
        }}
      >
        <div className={getSpacingClass('DEMO_SUBSECTIONS')}>
          <div
            className={`p-${DESIGN_SYSTEM_CONSTANTS.SECTION_TITLE_MARGIN} bg-red-50 border border-red-200 rounded-default`}
          >
            <p className="text-red-800">
              ⚠️ This modal cannot be dismissed by clicking outside or pressing
              ESC.
            </p>
          </div>
          <p className="text-body text-text-secondary">
            Non-dismissible modals are useful for critical actions that require
            explicit user confirmation. The only way to close this modal is by
            clicking the action button.
          </p>
        </div>
      </Modal>
    </div>
  )
}

export default SimpleModalDemo
