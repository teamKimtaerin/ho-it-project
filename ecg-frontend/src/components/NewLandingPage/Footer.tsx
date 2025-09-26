'use client'

import React from 'react'
import HoitLogo from '@/components/ui/HoitLogo'

const Footer: React.FC = () => {
  return (
    <footer className="py-20 px-4 bg-gray-100 border-t border-gray-300">
      <div className="container mx-auto max-w-7xl">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <HoitLogo size="md" />
              <span className="text-xl font-bold text-black">Hoit</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-black mb-4 text-base">서비스</h4>
            <div className="space-y-3 text-sm text-gray-600">
              <p className="hover:text-black cursor-pointer transition-colors">
                데이터 보호
              </p>
              <p className="hover:text-black cursor-pointer transition-colors">
                개인 정보 처리 방침
              </p>
              <p className="hover:text-black cursor-pointer transition-colors">
                이용 약관
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-black mb-4 text-base">자료실</h4>
            <div className="space-y-3 text-sm text-gray-600">
              <p className="hover:text-black cursor-pointer transition-colors">
                사용법 배우기
              </p>
              <p className="hover:text-black cursor-pointer transition-colors">
                커뮤니티
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-black mb-4 text-base">팀</h4>
            <div className="space-y-3 text-sm text-gray-600">
              <p className="hover:text-black cursor-pointer transition-colors">
                팀 소개
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-300 pt-8 mt-12">
          <div className="text-xs text-gray-500 space-y-2 leading-relaxed">
            <p>
              (주)김태린 | 팀장: 안태주 팀원: 김기래, 김동규, 박혜린, 신예린 |
              깃허브: https://github.com/teamKimtaerin
            </p>
            <p>문의하기 | teamKimtaerin@gmail.com | 크래프톤 정글 캠퍼스 303</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
