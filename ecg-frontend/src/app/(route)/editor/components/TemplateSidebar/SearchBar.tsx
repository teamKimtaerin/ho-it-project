'use client'

import React, { useState } from 'react'
import { IoSearch } from 'react-icons/io5'

interface SearchBarProps {
  placeholder?: string
  onSearchChange?: (query: string) => void
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search templates...',
  onSearchChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    onSearchChange?.(value)
  }

  return (
    <div className="px-4 pb-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <IoSearch className="text-gray-400" size={16} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-blue-200 focus:outline-none transition-colors duration-200"
        />
      </div>
    </div>
  )
}

export default SearchBar
