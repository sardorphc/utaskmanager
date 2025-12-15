
import { supabase } from '../supabase';
import { User, Task, ChatMessage, ProfileComment, AppNotification, WakeUpCall, TypingDraft, ChatSettings, AppSettings } from '../types';

const CURRENT_USER_KEY = 'uzum_studio_current_user_id';
const THEME_KEY = 'uzum_studio_theme';
const CHAT_SETTINGS_KEY = 'uzum_studio_chat_settings';

export const StorageService = {
  // --- USERS ---
  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
        console.error('Error fetching users:', error);
        return [];
    }
    return data.map((u: any) => ({
        ...u,
        displayName: u.display_name,
        isAdmin: u.is_admin,
        profileComments: u.profile_comments,
        workShifts: u.work_shifts,
        onlineSince: u.online_since,
        lastActive: u.last_active
    }));
  },

  saveUser: async (user: User) => {
    const dbUser = {
        id: user.id,
        login: user.login,
        display_name: user.displayName,
        role: user.role,
        password: user.password,
        avatar: user.avatar,
        bio: user.bio,
        age: user.age,
        is_admin: user.isAdmin,
        profile_comments: user.profileComments,
        work_shifts: user.workShifts,
        online_since: user.onlineSince,
        last_active: user.lastActive
    };
    const { error } = await supabase.from('users').upsert(dbUser);
    if (error) console.error('Error saving user:', error);
  },

  updateUserActivity: async (userId: string) => {
      await supabase.from('users').update({ last_active: Date.now() }).eq('id', userId);
  },

  deleteUser: async (userId: string) => {
      await supabase.from('users').delete().eq('id', userId);
      return await StorageService.getUsers();
  },

  getUserById: async (id: string): Promise<User | undefined> => {
      const { data } = await supabase.from('users').select('*').eq('id', id).single();
      if (!data) return undefined;
      return {
          ...data,
          displayName: data.display_name,
          isAdmin: data.is_admin,
          profileComments: data.profile_comments,
          workShifts: data.work_shifts,
          onlineSince: data.online_since,
          lastActive: data.last_active
      };
  },

  addProfileComment: async (targetUserId: string, comment: ProfileComment) => {
      const user = await StorageService.getUserById(targetUserId);
      if (!user) return null;
      
      const newComments = [...(user.profileComments || []), comment];
      const { error } = await supabase.from('users')
        .update({ profile_comments: newComments })
        .eq('id', targetUserId);
      
      if (error) console.error(error);
      return { ...user, profileComments: newComments };
  },

  // --- TASKS ---
  getTasks: async (): Promise<Task[]> => {
    const { data, error } = await supabase.from('tasks').select('*');
    if (error) {
        console.error(error);
        return [];
    }
    return data.map((t: any) => ({
        ...t,
        skuQuantity: t.sku_quantity,
        completedSku: t.completed_sku,
        skuHistory: t.sku_history,
        productId: t.product_id,
        completedBarcodes: t.completed_barcodes,
        sourceLink: t.source_link,
        resultLink: t.result_link,
        assigneeId: t.assignee_ids?.[0], 
        assigneeIds: t.assignee_ids,
        creatorId: t.creator_id,
        timeSpentSeconds: t.time_spent_seconds,
        isTracking: t.is_tracking,
        lastTrackingStartTime: t.last_tracking_start_time,
        completedAt: t.completed_at,
        createdAt: t.created_at,
        resultImage: t.result_image,
        referenceImage: t.reference_image,
        infographicTariff: t.infographic_tariff,
        is1P: t.is_1p
    }));
  },

  saveTask: async (task: Task) => {
      const dbTask = {
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          category: task.category,
          infographic_tariff: task.infographicTariff,
          is_1p: task.is1P,
          sku_quantity: task.skuQuantity,
          completed_sku: task.completedSku,
          sku_history: task.skuHistory,
          product_id: task.productId,
          barcodes: task.barcodes,
          completed_barcodes: task.completedBarcodes,
          source_link: task.sourceLink,
          result_link: task.resultLink,
          assignee_ids: task.assigneeIds,
          creator_id: task.creatorId,
          deadline: task.deadline,
          time_spent_seconds: task.timeSpentSeconds,
          is_tracking: task.isTracking,
          last_tracking_start_time: task.lastTrackingStartTime,
          completed_at: task.completedAt,
          created_at: task.createdAt,
          comments: task.comments,
          result_image: task.resultImage,
          reference_image: task.referenceImage,
          slides: task.slides
      };
      const { error } = await supabase.from('tasks').upsert(dbTask);
      if (error) console.error('Save task error', error);
  },

  deleteTask: async (taskId: string) => {
      await supabase.from('tasks').delete().eq('id', taskId);
  },

  // --- CHAT ---
  getChatMessages: async (chatId: string = 'global', currentUserId?: string): Promise<ChatMessage[]> => {
      const { data, error } = await supabase.from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('timestamp', { ascending: true })
        .limit(200);

      if (error) return [];
      
      let messages = data.map((m: any) => ({
          ...m,
          chatId: m.chat_id,
          senderId: m.sender_id,
          senderName: m.sender_name,
          isRead: m.is_read,
          isEdited: m.is_edited,
          replyTo: m.reply_to,
          deletedFor: m.deleted_for
      }));

      if (currentUserId) {
          messages = messages.filter(m => !m.deletedFor?.includes(currentUserId));
      }
      return messages;
  },

  addChatMessage: async (msg: ChatMessage) => {
      const dbMsg = {
          id: msg.id,
          chat_id: msg.chatId,
          sender_id: msg.senderId,
          sender_name: msg.senderName,
          avatar: msg.avatar,
          text: msg.text,
          timestamp: msg.timestamp,
          is_read: msg.isRead,
          is_edited: msg.isEdited,
          reply_to: msg.replyTo,
          deleted_for: msg.deletedFor
      };
      
      await supabase.from('chat_messages').insert(dbMsg);
  },

  updateChatMessage: async (msgId: string, newText: string) => {
      await supabase.from('chat_messages').update({ text: newText, is_edited: true }).eq('id', msgId);
  },

  deleteChatMessage: async (msgId: string, userId: string, forEveryone: boolean) => {
      if (forEveryone) {
          await supabase.from('chat_messages').delete().eq('id', msgId);
      } else {
          const { data } = await supabase.from('chat_messages').select('deleted_for').eq('id', msgId).single();
          const current = data?.deleted_for || [];
          if (!current.includes(userId)) {
              await supabase.from('chat_messages').update({ deleted_for: [...current, userId] }).eq('id', msgId);
          }
      }
  },

  clearChat: async (chatId: string) => {
      await supabase.from('chat_messages').delete().eq('chat_id', chatId);
  },

  // --- SETTINGS ---
  getAppSettings: async (): Promise<AppSettings> => {
      const { data } = await supabase.from('app_settings').select('*').limit(1).single();
      const defaultSettings: AppSettings = {
          uiScale: 1,
          notificationSound: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
          alarmSound: "https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3",
          messageSound: "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3",
          logoScale: 1,
          logoColor: '#7000ff',
          logoX: 0,
          logoY: 0,
          devButtonX: 20,
          devButtonY: window.innerHeight - 80,
          disableChangelog: false
      };
      
      if (!data || !data.settings) {
          return defaultSettings;
      }
      return { ...defaultSettings, ...data.settings };
  },

  saveAppSettings: async (settings: AppSettings) => {
      const { data } = await supabase.from('app_settings').select('id').limit(1);
      if (data && data.length > 0) {
          await supabase.from('app_settings').update({ settings }).eq('id', data[0].id);
      } else {
          await supabase.from('app_settings').insert({ settings });
      }
  },

  // --- LOCAL ONLY ---
  saveChatSettings: (settings: ChatSettings) => {
      localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(settings));
  },

  getChatSettings: (): ChatSettings => {
      const defaultSettings: ChatSettings = {
          fontSize: 14,
          bgType: 'color',
          bgColor: '#f0f2f5',
          bgBlur: 0,
          isAdaptive: true
      };
      try {
        const item = localStorage.getItem(CHAT_SETTINGS_KEY);
        return item ? JSON.parse(item) : defaultSettings;
      } catch { return defaultSettings; }
  },

  saveTheme: (isDark: boolean) => {
      localStorage.setItem(THEME_KEY, String(isDark));
  },

  getTheme: (): boolean => {
      return localStorage.getItem(THEME_KEY) === 'true';
  },

  // --- SESSION ---
  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, user.id);
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    const id = localStorage.getItem(CURRENT_USER_KEY);
    if (!id) return null;
    return await StorageService.getUserById(id) || null;
  },

  // --- REALTIME PLACEHOLDERS (Fixes TS Build Errors) ---
  getDrafts: (): TypingDraft[] => [],
  updateDraft: (user: User, text: string) => { void user; void text; },
  
  getNotifications: (userId: string): AppNotification[] => { void userId; return []; }, 
  addNotification: (n: AppNotification) => { void n; }, 
  markNotificationRead: (id: string) => { void id; },
  
  sendWakeUp: (targetId: string, senderName: string) => { void targetId; void senderName; },
  checkWakeUp: (myId: string): WakeUpCall | null => { void myId; return null; }
};
