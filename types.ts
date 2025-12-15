
export enum UserRole {
  DEVELOPER = 'Разработчик',
  MANAGER = 'Руководитель',
  TEAM_LEAD = 'Team Lead',
  GRAPHIC_DESIGNER = 'Графический дизайнер',
  PHOTOGRAPHER = 'Фотограф',
  RETOUCHER = 'Ретушер'
}

export interface ProfileComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  timestamp: number;
}

export interface WorkShift {
    date: string; 
    skuCount: number; 
}

export interface AppSettings {
    uiScale: number;
    notificationSound: string;
    alarmSound: string;
    messageSound: string;
    logoScale: number;
    logoColor: string;
    logoX: number;
    logoY: number;
    devButtonX?: number;
    devButtonY?: number;
    disableChangelog?: boolean;
}

export interface User {
  id: string;
  login: string;
  displayName: string;
  role: UserRole;
  password?: string;
  avatar?: string;
  bio?: string;
  age?: number;
  isAdmin: boolean;
  profileComments?: ProfileComment[];
  workShifts?: Record<string, WorkShift>;
  onlineSince?: number;
  lastActive?: number;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  timestamp: number;
}

export type TaskStatus = 'queue' | 'doing' | 'slacking' | 'partial' | 'done' | 'canceled';
export type TaskCategory = 'photo' | 'retouch' | 'infographic' | 'project';
export type InfographicTariff = 'Lite' | 'Standard' | 'Premium';

export interface TaskSlide {
    id: string;
    number: number;
    comment?: string;
}

export interface SkuLog {
    timestamp: number;
    count: number;
    userId: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  category: TaskCategory; 
  infographicTariff?: InfographicTariff; 
  is1P?: boolean; // New 1P Flag
  slides?: TaskSlide[]; 
  skuQuantity: number;
  completedSku: number;
  skuHistory?: SkuLog[];
  productId?: string;
  barcodes?: string[];
  completedBarcodes?: string[];
  sourceLink?: string; 
  resultLink?: string; 
  assigneeId?: string;
  assigneeIds?: string[];
  creatorId: string;
  deadline: string;
  timeSpentSeconds: number;
  isTracking: boolean;
  lastTrackingStartTime?: number;
  completedAt?: number;   
  createdAt: number; 
  comments: Comment[];
  resultImage?: string;
  referenceImage?: string; 
}

export interface ChatMessage {
  id: string;
  chatId?: string; 
  senderId: string;
  senderName: string;
  avatar: string; 
  text: string;
  timestamp: number;
  isEdited?: boolean;
  isRead?: boolean; 
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
    senderId: string; 
  };
  deletedFor?: string[]; 
}

export interface AppNotification {
  id: string;
  userId: string; 
  message: string;
  type: 'info' | 'warning' | 'alert';
  isRead: boolean;
  timestamp: number;
  senderAvatar?: string; 
  senderName?: string;
}

export interface WakeUpCall {
    targetId: string;
    senderName: string;
    timestamp: number;
}

export interface TypingDraft {
    userId: string;
    userName: string;
    avatar: string;
    text: string;
    timestamp: number;
}

export interface ChatSettings {
    fontSize: number;
    bgType: 'color' | 'image';
    bgColor: string;
    bgImage?: string; 
    bgBlur: number;
    isAdaptive: boolean; 
}
