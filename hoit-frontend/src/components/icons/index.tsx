import React from 'react'
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  XCircle,
  Star,
  Heart,
  Plus,
  Home,
  User,
  Settings,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  Copy,
  Trash2,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Volume2,
  VolumeX,
  MessageCircle,
} from 'lucide-react'

export interface IconProps {
  className?: string
  size?: number
}

// Chevron Down Icon (Dropdown용)
export const ChevronDownIcon: React.FC<IconProps> = ({
  className,
  size = 20,
}) => <ChevronDown className={className} size={size} />

// Chevron Up Icon (Collapse용)
export const ChevronUpIcon: React.FC<IconProps> = ({
  className,
  size = 20,
}) => <ChevronUp className={className} size={size} />

// Info Icon (Help Text neutral용)
export const InfoIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <Info className={className} size={size} />
)

// Error Icon (Help Text negative용)
export const ErrorIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <XCircle className={className} size={size} />
)

// 기본 아이콘들 (디자인 시스템 페이지용)
export const StarIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
  <Star className={className} size={size} />
)

export const HeartIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
  <Heart className={className} size={size} />
)

export const PlusIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
  <Plus className={className} size={size} />
)

export const HomeIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
  <Home className={className} size={size} />
)

export const UserIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
  <User className={className} size={size} />
)

export const SettingsIcon: React.FC<IconProps> = ({ className, size = 24 }) => (
  <Settings className={className} size={size} />
)

// Close/X Icon (Alert Banner dismiss용)
export const CloseIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <X className={className} size={size} />
)

// Alert Icon (Alert Banner informative/negative용)
export const AlertIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <AlertCircle className={className} size={size} />
)

// Check Circle Icon (AlertDialog confirmation용)
export const CheckCircleIcon: React.FC<IconProps> = ({
  className,
  size = 20,
}) => <CheckCircle className={className} size={size} />

// Exclamation Triangle Icon (AlertDialog warning용)
export const ExclamationTriangleIcon: React.FC<IconProps> = ({
  className,
  size = 20,
}) => <AlertTriangle className={className} size={size} />

// X Circle Icon (AlertDialog error용)
export const XCircleIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <XCircle className={className} size={size} />
)

// Video/Audio Control Icons
export const PlayIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <Play className={className} size={size} />
)

export const PauseIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <Pause className={className} size={size} />
)

export const ChevronLeftIcon: React.FC<IconProps> = ({
  className,
  size = 20,
}) => <ChevronLeft className={className} size={size} />

export const ChevronRightIcon: React.FC<IconProps> = ({
  className,
  size = 20,
}) => <ChevronRight className={className} size={size} />

export const CopyIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <Copy className={className} size={size} />
)

export const TrashIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <Trash2 className={className} size={size} />
)

// Virtual Timeline Video Control Icons
export const SkipBackIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <SkipBack className={className} size={size} />
)

export const SkipForwardIcon: React.FC<IconProps> = ({
  className,
  size = 20,
}) => <SkipForward className={className} size={size} />

export const RewindIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <Rewind className={className} size={size} />
)

export const FastForwardIcon: React.FC<IconProps> = ({
  className,
  size = 20,
}) => <FastForward className={className} size={size} />

export const VolumeIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <Volume2 className={className} size={size} />
)

export const VolumeOffIcon: React.FC<IconProps> = ({
  className,
  size = 20,
}) => <VolumeX className={className} size={size} />

// Chat Bot Icon
export const MessageCircleIcon: React.FC<IconProps> = ({
  className,
  size = 20,
}) => <MessageCircle className={className} size={size} />
