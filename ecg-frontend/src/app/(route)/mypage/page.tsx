'use client'

import { useState } from 'react'
import { useAuthStatus } from '@/hooks/useAuthStatus'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { showToast } from '@/utils/ui/toast'

export default function MyPage() {
  const { user, logout } = useAuthStatus()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: user?.username || '',
    email: user?.email || '',
  })

  const handleEditToggle = () => {
    if (isEditing) {
      // 편집 취소 시 원래 값으로 되돌리기
      setEditForm({
        name: user?.username || '',
        email: user?.email || '',
      })
    }
    setIsEditing(!isEditing)
  }

  const handleSave = async () => {
    try {
      // TODO: API 호출로 사용자 정보 업데이트
      // await updateUserProfile(editForm)

      setIsEditing(false)
      showToast('프로필이 업데이트되었습니다.', 'success')
    } catch {
      showToast('프로필 업데이트에 실패했습니다.', 'error')
    }
  }

  const handleLogout = () => {
    logout()
    showToast('로그아웃되었습니다.', 'success')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            로그인이 필요합니다
          </h1>
          <p className="text-gray-600 mb-6">
            마이페이지에 접근하려면 로그인해주세요.
          </p>
          <Button
            label="로그인하기"
            variant="primary"
            onClick={() => (window.location.href = '/')}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">마이페이지</h1>
            <Button
              label="에디터로 돌아가기"
              variant="secondary"
              style="outline"
              onClick={() => window.history.back()}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Profile Section */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                프로필 정보
              </h2>
              {!isEditing ? (
                <Button
                  label="편집"
                  variant="secondary"
                  style="outline"
                  size="small"
                  onClick={handleEditToggle}
                />
              ) : (
                <div className="flex space-x-2">
                  <Button
                    label="취소"
                    variant="secondary"
                    style="outline"
                    size="small"
                    onClick={handleEditToggle}
                  />
                  <Button
                    label="저장"
                    variant="primary"
                    size="small"
                    onClick={handleSave}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사용자명
                </label>
                {isEditing ? (
                  <Input
                    value={editForm.name}
                    onChange={(value: string) =>
                      setEditForm((prev) => ({
                        ...prev,
                        name: value,
                      }))
                    }
                    placeholder="사용자명을 입력하세요"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    {user.username}
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이메일
                </label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(value: string) =>
                      setEditForm((prev) => ({
                        ...prev,
                        email: value,
                      }))
                    }
                    placeholder="이메일을 입력하세요"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    {user.email}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Account Section */}
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              계정 설정
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-800">비밀번호 변경</h3>
                  <p className="text-sm text-gray-600">
                    계정 보안을 위해 정기적으로 비밀번호를 변경하세요
                  </p>
                </div>
                <Button
                  label="변경"
                  variant="secondary"
                  style="outline"
                  size="small"
                  onClick={() =>
                    showToast('비밀번호 변경 기능은 준비 중입니다.')
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-800">계정 삭제</h3>
                  <p className="text-sm text-gray-600">
                    계정을 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                  </p>
                </div>
                <Button
                  label="삭제"
                  variant="negative"
                  style="outline"
                  size="small"
                  onClick={() => showToast('계정 삭제 기능은 준비 중입니다.')}
                />
              </div>
            </div>
          </div>

          {/* Logout Section */}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800">로그아웃</h3>
                <p className="text-sm text-gray-600">
                  현재 세션에서 로그아웃합니다
                </p>
              </div>
              <Button
                label="로그아웃"
                variant="secondary"
                style="outline"
                size="small"
                onClick={handleLogout}
              />
            </div>
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              사용 통계
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-2">12</div>
                <div className="text-sm text-gray-600">생성한 프로젝트</div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-2">45</div>
                <div className="text-sm text-gray-600">편집한 자막 수</div>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 mb-2">8</div>
                <div className="text-sm text-gray-600">내보낸 영상</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
