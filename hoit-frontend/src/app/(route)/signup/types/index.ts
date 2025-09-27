export interface SignupFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  age: 'over14' | 'under14'
}

export interface SignupFormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
  age?: string
  general?: string
}

export interface SignupPageProps {
  onTryClick?: () => void
  onLoginClick?: () => void
}
