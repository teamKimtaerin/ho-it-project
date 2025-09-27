import {
  FaFile,
  FaFileAlt,
  FaFilm,
  FaImage,
  FaMusic,
  FaVideo,
  FaRocket,
} from 'react-icons/fa'
import { MdAudiotrack, MdSubtitles } from 'react-icons/md'
import { SiAdobepremierepro, SiApple } from 'react-icons/si'
import { ExportOption } from './ExportTypes'

export const exportOptions: ExportOption[] = [
  // GPU 고속 렌더링 (추천)
  {
    id: 'gpu-render',
    label: '영상 파일',
    description: 'mp4',
    icon: 'FaVideo',
    category: 'video',
    isRecentlyUsed: true,
  },

  // 자막 파일
  {
    id: 'srt',
    label: '자막 파일',
    description: 'srt',
    icon: 'MdSubtitles',
    category: 'subtitle',
    isRecentlyUsed: false,
  },
  {
    id: 'txt',
    label: '텍스트',
    description: 'txt',
    icon: 'FaFileAlt',
    category: 'subtitle',
    isRecentlyUsed: false,
  },

  // 오디오 파일
  {
    id: 'mp3',
    label: '오디오 파일',
    description: 'mp3, wav',
    icon: 'MdAudiotrack',
    category: 'audio',
    isRecentlyUsed: false,
  },
]

export const getIconComponent = (iconName: string) => {
  const iconMap: {
    [key: string]: React.ComponentType<React.SVGProps<SVGSVGElement>>
  } = {
    FaVideo,
    FaFileAlt,
    FaMusic,
    FaImage,
    FaFile,
    FaFilm,
    FaRocket,
    MdSubtitles,
    MdAudiotrack,
    SiAdobepremierepro,
    SiApple,
  }

  return iconMap[iconName] || FaFile
}
