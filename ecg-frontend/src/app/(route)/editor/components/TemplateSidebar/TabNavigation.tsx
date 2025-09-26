'use client'

import React, { useState } from 'react'

const TabNavigation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'free' | 'my'>('free')

  const tabs = [
    { id: 'my' as const, label: '내 템플릿' },
    { id: 'free' as const, label: '무료 템플릿' },
  ]

  return (
    <div className="px-4 pb-4">
      <div className="flex rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200 hover:shadow-md transform hover:scale-105'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default TabNavigation
