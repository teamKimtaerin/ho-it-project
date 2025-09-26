'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignupFormData, SignupFormErrors } from '../types'
import { useAuth } from '@/hooks/useAuth'

export const useSignupForm = () => {
  const router = useRouter()
  const { signup } = useAuth()

  const [formData, setFormData] = useState<SignupFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: 'over14',
  })

  const [errors, setErrors] = useState<SignupFormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (field: keyof SignupFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: SignupFormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요.'
    }

    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요.'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.'
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.'
    } else if (formData.password.length < 6 || formData.password.length > 16) {
      newErrors.password = '비밀번호는 6자~16자 사이여야 합니다.'
    } else if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = '비밀번호는 영문과 숫자를 포함해야 합니다.'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      await signup({
        username: formData.name,
        email: formData.email,
        password: formData.password,
      })

      // Handle successful signup - redirect to home
      router.push('/')
    } catch (error) {
      console.error('Signup failed:', error)
      setErrors({
        general:
          error instanceof Error
            ? error.message
            : '회원가입 중 오류가 발생했습니다.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return {
    formData,
    errors,
    showPassword,
    showConfirmPassword,
    isLoading,
    handleInputChange,
    setShowPassword,
    setShowConfirmPassword,
    handleSubmit,
  }
}
