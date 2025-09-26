'use client'

import React, { useState } from 'react'
import ProgressBar from '@/components/ui/ProgressBar'
import ProgressCircle from '@/components/ui/ProgressCircle'
import { getProgressValue } from './constants'

const ProgressDemo: React.FC = () => {
  const [progressValues, setProgressValues] = useState<{
    basic: number
    download: number
    upload: number
    processing: number
    loading: number
  }>({
    basic: getProgressValue('basic'),
    download: getProgressValue('download'),
    upload: getProgressValue('upload'),
    processing: getProgressValue('processing'),
    loading: getProgressValue('loading'),
  })

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-h2 mb-6 text-text-primary">Progress Components</h2>
        <p className="text-body text-text-secondary mb-8">
          진행 상태를 시각적으로 표시하는 프로그레스 컴포넌트들입니다.
        </p>
      </div>

      {/* Progress Bars */}
      <div className="space-y-6">
        <div className="p-6 bg-surface-secondary rounded-small">
          <h3 className="text-h3 text-text-primary mb-4">Progress Bars</h3>
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Basic Progress Bar
              </h4>
              <ProgressBar
                value={progressValues.basic}
                label="Overall Progress"
              />
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Download Progress
              </h4>
              <ProgressBar value={progressValues.download} label="Download" />
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Upload Progress
              </h4>
              <ProgressBar value={progressValues.upload} label="Upload" />
            </div>
          </div>
        </div>

        {/* Progress Bar Sizes */}
        <div className="p-6 bg-surface-secondary rounded-small">
          <h3 className="text-h3 text-text-primary mb-4">Progress Bar Sizes</h3>
          <div className="space-y-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Small Size
              </h4>
              <ProgressBar value={75} label="Small Size" size="small" />
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Medium Size (Default)
              </h4>
              <ProgressBar
                value={75}
                label="Medium Size (Default)"
                size="medium"
              />
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Large Size
              </h4>
              <ProgressBar value={75} label="Large Size" size="large" />
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Extra Large Size
              </h4>
              <ProgressBar
                value={75}
                label="Extra Large Size"
                size="extra-large"
              />
            </div>
          </div>
        </div>

        {/* Progress Circles */}
        <div className="p-6 bg-surface-secondary rounded-small">
          <h3 className="text-h3 text-text-primary mb-4">Progress Circles</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <ProgressCircle value={25} size="small" />
              <p className="mt-2 text-sm text-text-secondary">Small (25%)</p>
            </div>
            <div className="text-center">
              <ProgressCircle value={50} size="medium" />
              <p className="mt-2 text-sm text-text-secondary">Medium (50%)</p>
            </div>
            <div className="text-center">
              <ProgressCircle value={75} size="large" />
              <p className="mt-2 text-sm text-text-secondary">Large (75%)</p>
            </div>
            <div className="text-center">
              <ProgressCircle value={90} size="large">
                <span className="text-xs font-medium">90%</span>
              </ProgressCircle>
              <p className="mt-2 text-sm text-text-secondary">With Content</p>
            </div>
          </div>
        </div>

        {/* Progress Bar Variants */}
        <div className="p-6 bg-surface-secondary rounded-small">
          <h3 className="text-h3 text-text-primary mb-4">
            Progress Bar Variants
          </h3>
          <div className="space-y-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Default Variant
              </h4>
              <ProgressBar
                value={60}
                label="Default Progress"
                variant="default"
              />
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Over Background Variant
              </h4>
              <div className="p-4 bg-gray-600 rounded">
                <ProgressBar
                  value={75}
                  label="Over Background Progress"
                  variant="over-background"
                />
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Indeterminate Progress
              </h4>
              <ProgressBar isIndeterminate={true} label="Loading..." />
            </div>
          </div>
        </div>

        {/* Interactive Progress */}
        <div className="p-6 bg-surface-secondary rounded-small">
          <h3 className="text-h3 text-text-primary mb-4">
            Interactive Progress
          </h3>
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-primary">
                Dynamic Progress Control
              </h4>
              <div className="flex gap-3 flex-wrap">
                <button
                  className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-blue-600 transition-colors"
                  onClick={() =>
                    setProgressValues((prev) => ({
                      ...prev,
                      processing: Math.min(100, prev.processing + 10),
                    }))
                  }
                >
                  +10%
                </button>
                <button
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                  onClick={() =>
                    setProgressValues((prev) => ({
                      ...prev,
                      processing: Math.max(0, prev.processing - 10),
                    }))
                  }
                >
                  -10%
                </button>
                <button
                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
                  onClick={() =>
                    setProgressValues((prev) => ({
                      ...prev,
                      processing: 0,
                    }))
                  }
                >
                  Reset
                </button>
                <button
                  className="px-3 py-1 bg-green-400 text-white rounded text-sm hover:bg-green-600 transition-colors"
                  onClick={() =>
                    setProgressValues((prev) => ({
                      ...prev,
                      processing: 100,
                    }))
                  }
                >
                  Complete
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-text-primary">
                  Progress Bar
                </h4>
                <ProgressBar
                  value={progressValues.processing}
                  label={`Processing Task (${progressValues.processing}%)`}
                />
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-text-primary">
                  Progress Circle
                </h4>
                <div className="flex justify-center">
                  <ProgressCircle
                    value={progressValues.processing}
                    size="large"
                  >
                    <div className="text-center">
                      <div className="text-sm font-medium text-text-primary">
                        {progressValues.processing}%
                      </div>
                      <div className="text-xs text-text-secondary">
                        Complete
                      </div>
                    </div>
                  </ProgressCircle>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProgressDemo
