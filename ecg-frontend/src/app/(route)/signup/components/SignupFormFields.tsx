'use client'

import React from 'react'
import { LuEye, LuEyeOff } from 'react-icons/lu'
import { SignupFormData, SignupFormErrors } from '../types'

interface SignupFormFieldsProps {
  formData: SignupFormData
  errors: SignupFormErrors
  showPassword: boolean
  showConfirmPassword: boolean
  onInputChange: (field: keyof SignupFormData, value: string) => void
  onTogglePassword: () => void
  onToggleConfirmPassword: () => void
}

const SignupFormFields: React.FC<SignupFormFieldsProps> = ({
  formData,
  errors,
  showPassword,
  showConfirmPassword,
  onInputChange,
  onTogglePassword,
  onToggleConfirmPassword,
}) => {
  return (
    <>
      {/* Name Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">이름</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => onInputChange('name', e.target.value)}
          placeholder="이름 입력"
          className="w-full h-[50px] px-4 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>

      {/* Email Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">이메일</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => onInputChange('email', e.target.value)}
          placeholder="이메일 주소 입력"
          className="w-full h-[50px] px-4 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
        {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
      </div>

      {/* Password Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">비밀번호</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => onInputChange('password', e.target.value)}
            placeholder="비밀번호 (6자~16자, 영문/숫자 필수)"
            className="w-full h-[50px] px-4 pr-12 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            {showPassword ? (
              <LuEye className="w-5 h-5" />
            ) : (
              <LuEyeOff className="w-5 h-5" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password}</p>
        )}
      </div>

      {/* Confirm Password Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">
          비밀번호 (확인용)
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => onInputChange('confirmPassword', e.target.value)}
            placeholder="비밀번호 확인"
            className="w-full h-[50px] px-4 pr-12 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <button
            type="button"
            onClick={onToggleConfirmPassword}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            {showConfirmPassword ? (
              <LuEye className="w-5 h-5" />
            ) : (
              <LuEyeOff className="w-5 h-5" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-red-500">{errors.confirmPassword}</p>
        )}
      </div>
    </>
  )
}

export default SignupFormFields
