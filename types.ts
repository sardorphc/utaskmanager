
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
    date: string; // ISO Date string (YYYY-MM-DD)
    skuCount: number; // Snapshot of SKU for that day
}

export interface AppSettings {
    uiScale: number;
    notificationSound: string;
    alarmSound: string;
    messageSound: string;
    logoScale: number;
    logoColor: string;
    logoX: number; // New: X Position
    logoY: number; // New: Y Position
    devButtonX?: number; // Developer Button X
    devButtonY?: number; // Developer Button Y
    disableChangelog?: boolean; // New: Disable update popup
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
  workShifts?: Record<string, WorkShift>; // Key is date string
  
  // Status fields
  onlineSince?: number; // Timestamp when they logged in
  lastActive?: number; // Timestamp of last heartbeat
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
  slides?: TaskSlide[]; 
  
  skuQuantity: number; // Total required
  completedSku: number; // Currently done
  skuHistory?: SkuLog[]; // History of completion for KPI

  productId?: string;
  barcodes?: string[];
  completedBarcodes?: string[]; // List of specific barcodes that are done
  sourceLink?: string; // Link to source files
  resultLink?: string; // Link to finished work

  assigneeId?: string; // Deprecated, kept for backward compatibility
  assigneeIds?: string[]; // New: Multiple assignees
  
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
  deletedFor?: string[]; // User IDs who deleted this message for themselves
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
    bgImage?: string; // Base64
    bgBlur: number;
    isAdaptive: boolean; // New flag for auto dark/light switching
}
