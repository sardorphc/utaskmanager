
import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage, UserRole, AppNotification, TypingDraft, ChatSettings } from '../types';
import { StorageService } from '../services/storage';
import { Send, MessageCircle, Smile, X, Maximize2, Minimize2, Reply, Pencil, Trash2, Eraser, Settings, Image as ImageIcon, Minus, Plus, Check, CheckCheck, GripHorizontal, Palette, RefreshCw } from 'lucide-react';

interface GlobalChatProps {
  currentUser: User;
  onUserClick: (userId: string) => void;
  onNotify: (notification: AppNotification) => void;
  chatId?: string; 
  title?: string;
  isSoundEnabled?: boolean;
  messageSoundUrl?: string; 
}

const MSG_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3"; 

const EMOJI_CATEGORIES = {
  "Популярные": ['👍', '🔥', '❤️', '😂', '😮', '🎉', '✅', '👀', '🤝', '🚀', '🥺', '🤡', '💀'],
  "Лица": ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😜', '🤪', '😎', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'],
  "Жесты": ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪', '💅', '🤳'],
  "Символы": ['✅', '☑️', '✔️', '❌', '❎', '❓', '❗️', '❕', '💯', '⚠️', '⛔️', '🚫', '🛑', '♻️', '🆗', '🆙', '🆒', '🆕', '🆓']
};

export const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
        if (part.match(urlRegex)) {
            return (
                <a 
                    key={i} 
                    href={part} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-500 hover:text-blue-700 underline font-medium break-all transition-colors" 
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
};

const GlobalChat: React.FC<GlobalChatProps> = ({ currentUser, onUserClick, onNotify, chatId = 'global', title = 'Общий чат', isSoundEnabled = true, messageSoundUrl }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [inputText, setInputText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [chatSettings, setChatSettings] = useState<ChatSettings>(StorageService.getChatSettings());
  
  const [settingsPos, setSettingsPos] = useState({ x: 50, y: 50 });
  const [isDraggingSettings, setIsDraggingSettings] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  
  const [msgToDelete, setMsgToDelete] = useState<ChatMessage | null>(null);
  const [deleteForEveryone, setDeleteForEveryone] = useState(true);

  const [showClearModal, setShowClearModal] = useState(false);
  const [saveArchive, setSaveArchive] = useState(false);

  const [drafts, setDrafts] = useState<TypingDraft[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBoss = currentUser.isAdmin || currentUser.role === UserRole.MANAGER || currentUser.login === 'Natalya Pak' || currentUser.role === UserRole.DEVELOPER;

  const loadData = async () => {
    setMessages(await StorageService.getChatMessages(chatId, currentUser.id));
    setUsers(await StorageService.getUsers());
  };

  const loadDrafts = () => {
      if (chatId === 'global') {
          const allDrafts = StorageService.getDrafts();
          setDrafts(allDrafts.filter(d => d.userId !== currentUser.id));
      } else {
          setDrafts([]);
      }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
        loadData();
        loadDrafts();
    }, 1000); 
    return () => clearInterval(interval);
  }, [chatId, currentUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, drafts, isFullscreen]); 

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (isDraggingSettings) {
              setSettingsPos({
                  x: e.clientX - dragStartRef.current.x,
                  y: e.clientY - dragStartRef.current.y
              });
          }
      };
      const handleMouseUp = () => setIsDraggingSettings(false);

      if (isDraggingSettings) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isDraggingSettings]);

  const startDragSettings = (e: React.MouseEvent) => {
      setIsDraggingSettings(true);
      dragStartRef.current = {
          x: e.clientX - settingsPos.x,
          y: e.clientY - settingsPos.y
      };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputText(val);
      if (chatId === 'global') {
          StorageService.updateDraft(currentUser, val);
      }
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    if (editingMsgId) {
        StorageService.updateChatMessage(editingMsgId, inputText);
        setEditingMsgId(null);
        setInputText('');
        if (chatId === 'global') StorageService.updateDraft(currentUser, '');
        loadData();
        return;
    }

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      chatId: chatId,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      avatar: '', 
      text: inputText,
      timestamp: Date.now(),
      isRead: false,
      replyTo: replyTo ? {
          id: replyTo.id,
          senderName: replyTo.senderName,
          text: replyTo.text,
          senderId: replyTo.senderId
      } : undefined,
      deletedFor: []
    };

    StorageService.addChatMessage(newMessage);
    loadData();
    setInputText('');
    setShowEmojis(false);
    if (chatId === 'global') StorageService.updateDraft(currentUser, '');
    
    if (replyTo && replyTo.senderId !== currentUser.id) {
        const msgText = isBoss 
            ? `Руководитель ${currentUser.displayName} ответил(а) вам: ${inputText.substring(0, 30)}...`
            : `${currentUser.displayName} ответил(а) вам: ${inputText.substring(0, 30)}...`;

        const notif: AppNotification = {
            id: `notif_${Date.now()}`,
            userId: replyTo.senderId,
            message: msgText,
            type: 'info',
            isRead: false,
            timestamp: Date.now(),
            senderAvatar: currentUser.avatar, 
            senderName: currentUser.displayName
        };
        onNotify(notif);
    }

    setReplyTo(null);
    if (isSoundEnabled) {
        const audio = new Audio(messageSoundUrl || MSG_SOUND_URL);
        audio.volume = 0.5;
        audio.play().catch(e => console.log(e));
    }
  };

  const initiateDelete = (msg: ChatMessage) => {
      setMsgToDelete(msg);
      setDeleteForEveryone(true);
  };

  const confirmDelete = () => {
      if (!msgToDelete) return;
      StorageService.deleteChatMessage(msgToDelete.id, currentUser.id, deleteForEveryone);
      const updatedMessages = messages.filter(m => m.id !== msgToDelete.id);
      setMessages(updatedMessages);
      setMsgToDelete(null);
  };

  const startEdit = (msg: ChatMessage) => {
      setEditingMsgId(msg.id);
      setInputText(msg.text);
      setReplyTo(null);
      inputRef.current?.focus();
  };

  const cancelEdit = () => {
      setEditingMsgId(null);
      setInputText('');
  };

  const initiateClearChat = () => {
      setSaveArchive(false);
      setShowClearModal(true);
  };

  const performClearChat = () => {
      if (saveArchive) {
          const BOM = "\uFEFF"; 
          const header = `АРХИВ ЧАТА: ${title}\nДата выгрузки: ${new Date().toLocaleString('ru-RU')}\n\n`;
          const content = messages.map(m => {
              const date = new Date(m.timestamp).toLocaleString('ru-RU');
              return `[${date}] ${m.senderName}:\n${m.text}`;
          }).join('\n--------------------------------------------------\n');
          
          const fullText = BOM + header + content;
          const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `archive_${chatId}_${Date.now()}.txt`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }

      StorageService.clearChat(chatId);
      setMessages([]);
      setShowClearModal(false);
  };

  const addEmoji = (emoji: string) => {
      const newVal = inputText + emoji;
      setInputText(newVal);
      if (chatId === 'global') StorageService.updateDraft(currentUser, newVal);
  };

  const startReply = (msg: ChatMessage) => {
      setReplyTo(msg);
      inputRef.current?.focus();
  };

  const getAvatar = (userId: string, fallbackAvatar: string) => {
      const user = users.find(u => u.id === userId);
      return user?.avatar || fallbackAvatar || "https://picsum.photos/200"; 
  };

  const updateSettings = (newSettings: Partial<ChatSettings>) => {
      const updated = { ...chatSettings, ...newSettings };
      setChatSettings(updated);
      StorageService.saveChatSettings(updated);
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              updateSettings({ bgImage: reader.result as string, bgType: 'image', isAdaptive: false });
          };
          reader.readAsDataURL(file);
      }
  };

  const containerClasses = isFullscreen 
    ? "fixed inset-0 z-[150] bg-white dark:bg-gray-900 m-4 rounded-2xl shadow-2xl flex flex-col" 
    : "flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden relative";

  return (
    <div className={containerClasses}>
      <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0 z-20 relative">
        <div className="flex items-center gap-2">
            <MessageCircle className="text-uzum-600 dark:text-uzum-400" size={20} />
            <h3 className="font-bold text-gray-800 dark:text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setShowSettings(!showSettings)} 
                className={`p-1.5 rounded-lg transition ${showSettings ? 'bg-uzum-100 text-uzum-600 dark:bg-gray-700 dark:text-white' : 'text-gray-400 hover:text-uzum-600 dark:hover:text-white'}`}
            >
                <Settings size={20} />
            </button>
            {isBoss && messages.length > 0 && (
                <button onClick={initiateClearChat} className="text-red-400 hover:text-red-600 p-1" title="Очистить чат">
                    <Eraser size={20} />
                </button>
            )}
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="text-gray-400 hover:text-uzum-600 dark:hover:text-white transition p-1">
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
        </div>

        {showSettings && (
            <div 
                className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl w-80 z-[200] animate-scale-in"
                style={{ left: settingsPos.x, top: settingsPos.y }}
            >
                <div 
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-t-2xl cursor-move flex items-center justify-between border-b border-gray-100 dark:border-gray-600"
                    onMouseDown={startDragSettings}
                >
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase flex items-center gap-2"><GripHorizontal size={16}/> Настройки чата</span>
                    <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-red-500"><X size={16}/></button>
                </div>
                
                <div className="p-4 space-y-4 text-sm">
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                        <button 
                            onClick={() => updateSettings({ isAdaptive: true })}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${chatSettings.isAdaptive ? 'bg-white dark:bg-gray-600 text-uzum-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <RefreshCw size={12}/> Авто
                        </button>
                        <button 
                            onClick={() => updateSettings({ isAdaptive: false })}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${!chatSettings.isAdaptive ? 'bg-white dark:bg-gray-600 text-uzum-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Settings size={12}/> Ручной
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Размер текста</label>
                        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-lg p-1 border border-gray-200 dark:border-gray-600">
                            <button onClick={() => updateSettings({ fontSize: Math.max(10, chatSettings.fontSize - 1) })} className="p-2 bg-white dark:bg-gray-600 shadow-sm rounded-md transition text-gray-700 dark:text-white hover:bg-gray-50"><Minus size={14}/></button>
                            <span className="font-bold text-gray-800 dark:text-white">{chatSettings.fontSize}px</span>
                            <button onClick={() => updateSettings({ fontSize: Math.min(30, chatSettings.fontSize + 1) })} className="p-2 bg-white dark:bg-gray-600 shadow-sm rounded-md transition text-gray-700 dark:text-white hover:bg-gray-50"><Plus size={14}/></button>
                        </div>
                    </div>

                    {!chatSettings.isAdaptive ? (
                        <div className="animate-fade-in border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Настройка Фона</label>
                            <div className="flex gap-2 mb-2">
                                <button 
                                    onClick={() => updateSettings({ bgType: 'color' })}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${chatSettings.bgType === 'color' ? 'bg-uzum-50 border-uzum-600 text-uzum-700 dark:bg-uzum-900/30 dark:text-uzum-300' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}
                                >
                                    Цвет
                                </button>
                                <button 
                                    onClick={() => updateSettings({ bgType: 'image' })}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${chatSettings.bgType === 'image' ? 'bg-uzum-50 border-uzum-600 text-uzum-700 dark:bg-uzum-900/30 dark:text-uzum-300' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}
                                >
                                    Фото
                                </button>
                            </div>

                            {chatSettings.bgType === 'color' ? (
                                <div className="space-y-2">
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {['#f0f2f5', '#eef2ff', '#f0fdf4', '#fef2f2', '#fff7ed', '#111827', '#ffffff'].map(c => (
                                            <button 
                                                key={c} 
                                                onClick={() => updateSettings({ bgColor: c })}
                                                className={`w-8 h-8 rounded-full border-2 shrink-0 ${chatSettings.bgColor === c ? 'border-uzum-600' : 'border-gray-200 dark:border-gray-600'}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 w-full border border-gray-200 dark:border-gray-600">
                                            <div 
                                                className="w-6 h-6 rounded-full border border-gray-300 shadow-sm"
                                                style={{ backgroundColor: chatSettings.bgColor }}
                                            ></div>
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Выбрать свой цвет</span>
                                            <input 
                                                type="color" 
                                                value={chatSettings.bgColor}
                                                onChange={(e) => updateSettings({ bgColor: e.target.value })}
                                                className="opacity-0 w-0 h-0" 
                                            />
                                            <Palette size={16} className="ml-auto text-gray-400"/>
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-600">
                                            <ImageIcon size={14}/> Загрузить
                                        </button>
                                        {chatSettings.bgImage && (
                                            <button onClick={() => updateSettings({ bgImage: undefined })} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"><Trash2 size={14}/></button>
                                        )}
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleBgUpload} />
                                    
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Размытие: {chatSettings.bgBlur}px</label>
                                        <input 
                                            type="range" 
                                            min="0" max="20" 
                                            value={chatSettings.bgBlur}
                                            onChange={(e) => updateSettings({ bgBlur: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-uzum-600"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="pt-2 text-center text-xs text-gray-400">
                            В режиме "Авто" тема адаптируется под систему (День/Ночь).
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2 relative z-0" 
           style={{ 
               backgroundColor: (!chatSettings.isAdaptive && chatSettings.bgType === 'color') ? chatSettings.bgColor : 'transparent',
           }}>
        
        {!chatSettings.isAdaptive && chatSettings.bgType === 'image' && chatSettings.bgImage && (
            <div 
                className="absolute inset-0 z-[-1] bg-cover bg-center pointer-events-none"
                style={{ 
                    backgroundImage: `url(${chatSettings.bgImage})`,
                    filter: `blur(${chatSettings.bgBlur}px)`,
                    transform: 'scale(1.05)' 
                }}
            />
        )}

        {messages.length === 0 && drafts.length === 0 ? (
            <div className="text-center text-gray-400 text-sm mt-10 p-2 bg-white/50 dark:bg-black/50 rounded-xl backdrop-blur-sm inline-block mx-auto">
                Сообщений пока нет. Напишите первым!
            </div>
        ) : (
            messages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                const canModify = isMe || isBoss;
                const avatarSrc = getAvatar(msg.senderId, msg.avatar);

                let bubbleClass = `px-3 py-2 rounded-2xl shadow-sm break-words whitespace-pre-wrap transition-all `;
                let bubbleStyle = { fontSize: `${chatSettings.fontSize}px`, backgroundColor: undefined as string | undefined };

                if (isMe) {
                    bubbleClass += 'bg-uzum-600 text-white rounded-br-none shadow-uzum-200 dark:shadow-none';
                } else {
                    if (chatSettings.isAdaptive) {
                        bubbleClass += 'bg-white text-gray-900 rounded-bl-none shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.7)] dark:border-transparent';
                    } else {
                        bubbleClass += 'rounded-bl-none text-gray-900 shadow-sm';
                        if (chatSettings.bgType === 'color') {
                             bubbleClass += ' bg-white'; 
                        } else {
                             bubbleClass += ' bg-white/90 backdrop-blur-sm';
                        }
                    }
                }

                return (
                    <div key={msg.id} className={`flex gap-2 animate-message-pop ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                        <button onClick={() => onUserClick(msg.senderId)} className="focus:outline-none transition-transform hover:scale-105 shrink-0">
                            <img src={avatarSrc} className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 object-cover" />
                        </button>
                        
                        <div className={`relative max-w-[70%] group/bubble`}>
                            <div 
                                className={bubbleClass}
                                style={bubbleStyle}
                            >
                                {!isMe && (
                                    <p 
                                        className="text-[10px] font-extrabold text-uzum-600 mb-1 cursor-pointer hover:underline"
                                        onClick={() => onUserClick(msg.senderId)}
                                    >
                                        {msg.senderName}
                                    </p>
                                )}

                                {msg.replyTo && (
                                    <div className={`mb-1 px-2 py-1 rounded text-xs border-l-2 bg-black/5 opacity-80 ${isMe ? 'border-white/50' : 'border-uzum-500'}`}>
                                        <span className="font-bold block">{msg.replyTo.senderName}</span>
                                        <span className="truncate block">{msg.replyTo.text.substring(0,25)}...</span>
                                    </div>
                                )}

                                {renderTextWithLinks(msg.text)}
                                {msg.isEdited && <span className="text-[9px] opacity-60 ml-1 italic">(ред.)</span>}
                                
                                <div className={`float-right ml-2 mt-1.5 flex items-center gap-1 select-none ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                                    <span className="text-[9px]">
                                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                    {isMe && (
                                        <span className="text-[10px]">
                                            {msg.isRead ? <CheckCheck size={12}/> : <Check size={12}/>}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover/bubble:opacity-100 transition-opacity flex gap-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full p-1 shadow-sm ${isMe ? 'right-0' : 'left-0'} z-10`}>
                                <button onClick={() => startReply(msg)} className="p-1 hover:text-uzum-600 text-gray-500 dark:text-gray-300" title="Ответить">
                                    <Reply size={12} />
                                </button>
                                {canModify && (
                                    <>
                                        {isMe && <button onClick={() => startEdit(msg)} className="p-1 hover:text-blue-600 text-gray-500 dark:text-gray-300" title="Редактировать"><Pencil size={12}/></button>}
                                        <button onClick={() => initiateDelete(msg)} className="p-1 hover:text-red-600 text-gray-500 dark:text-gray-300" title="Удалить"><Trash2 size={12}/></button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })
        )}
        
        {drafts.map(draft => {
             const draftAvatar = getAvatar(draft.userId, draft.avatar);
             return (
             <div key={draft.userId} className="flex gap-2 items-end opacity-60 animate-pulse">
                <img src={draftAvatar} className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 object-cover grayscale" />
                <div className="bg-white dark:bg-gray-700 px-3 py-2 rounded-2xl rounded-bl-none text-sm shadow-sm text-gray-500 dark:text-gray-300 italic border border-gray-200 dark:border-gray-600">
                    <span className="text-[10px] font-bold block mb-1">{draft.userName} печатает...</span>
                    {draft.text}
                </div>
             </div>
        )})}
        
        <div ref={messagesEndRef} />
      </div>

      {replyTo && (
          <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs text-gray-600 dark:text-gray-300 relative z-20">
              <div className="flex items-center gap-2">
                  <Reply size={14} className="text-uzum-600 dark:text-uzum-400"/>
                  <div className="flex flex-col">
                      <span className="font-bold text-uzum-600 dark:text-uzum-400">Ответ {replyTo.senderName}</span>
                      <span className="line-clamp-1">{replyTo.text}</span>
                  </div>
              </div>
              <button onClick={() => setReplyTo(null)}><X size={14} /></button>
          </div>
      )}
      {editingMsgId && (
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800 flex justify-between items-center text-xs text-blue-700 dark:text-blue-300 relative z-20">
              <div className="flex items-center gap-2">
                  <Pencil size={14} />
                  <span className="font-bold">Редактирование сообщения</span>
              </div>
              <button onClick={cancelEdit}><X size={14} /></button>
          </div>
      )}

      {msgToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Удалить сообщение?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Вы действительно хотите удалить это сообщение?
                </p>
                
                {(msgToDelete.senderId === currentUser.id || isBoss) && (
                    <div className="flex items-center gap-2 mb-6 cursor-pointer group" onClick={() => setDeleteForEveryone(!deleteForEveryone)}>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${deleteForEveryone ? 'bg-uzum-600 border-uzum-600' : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700'}`}>
                            {deleteForEveryone && <Check size={14} className="text-white"/>}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 select-none group-hover:text-uzum-600 transition-colors">Удалить для всех</span>
                    </div>
                )}

                <div className="flex gap-2">
                    <button 
                        onClick={() => setMsgToDelete(null)}
                        className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                        Отмена
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="flex-1 py-2.5 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 font-bold transition"
                    >
                        Удалить
                    </button>
                </div>
            </div>
        </div>
      )}

      {showClearModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">Очистка чата</h3>
                <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
                    Вы уверены, что хотите стереть <strong>всю переписку</strong>? Это действие необратимо.
                </p>

                <div 
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl mb-6 cursor-pointer border border-gray-100 dark:border-gray-700 hover:border-uzum-200 dark:hover:border-uzum-500 transition"
                    onClick={() => setSaveArchive(!saveArchive)}
                >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all flex-shrink-0 ${saveArchive ? 'bg-uzum-600 border-uzum-600' : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'}`}>
                        {saveArchive && <Check size={14} className="text-white"/>}
                    </div>
                    <div className="text-left">
                        <span className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            Скачать архив переписки 
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Файл .txt с датой и временем</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowClearModal(false)}
                        className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                        Отмена
                    </button>
                    <button 
                        onClick={performClearChat}
                        className="flex-1 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200 font-bold transition flex items-center justify-center gap-2"
                    >
                        {saveArchive ? 'Скачать и Стереть' : 'Стереть'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {showEmojis && (
          <div ref={emojiRef} className="absolute bottom-16 left-2 right-2 md:w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl p-3 z-30 animate-fade-in max-h-80 overflow-y-auto">
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Эмодзи</span>
                  <button onClick={() => setShowEmojis(false)} className="text-gray-400 hover:text-red-500"><X size={16}/></button>
              </div>
              {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                  <div key={category} className="mb-3">
                      <h4 className="text-[10px] font-bold text-gray-400 mb-1 sticky top-8 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm py-1">{category}</h4>
                      <div className="grid grid-cols-8 gap-1">
                        {emojis.map(emoji => (
                            <button key={emoji} onClick={() => addEmoji(emoji)} className="text-lg hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded transition w-full text-center">{emoji}</button>
                        ))}
                      </div>
                  </div>
              ))}
          </div>
      )}

      <form onSubmit={handleSend} className="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex gap-2 shrink-0 items-end z-20 relative rounded-b-2xl">
        <button 
            type="button" 
            onClick={() => setShowEmojis(!showEmojis)}
            className={`p-2 transition rounded-xl mb-1 ${showEmojis ? 'bg-uzum-100 text-uzum-600 dark:bg-uzum-900 dark:text-uzum-300' : 'text-gray-400 hover:text-uzum-600 dark:hover:text-uzum-400'}`}
        >
            <Smile size={24} />
        </button>

        <div className="flex-1 relative">
            <input
                ref={inputRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                    }
                }}
                placeholder="Напишите сообщение..."
                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-uzum-500 placeholder:text-gray-400 font-medium"
            />
        </div>
        
        <button 
            type="submit" 
            className={`p-3 rounded-xl transition shadow-lg ${inputText.trim() ? 'bg-uzum-600 text-white hover:bg-uzum-700 shadow-uzum-200' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}
            disabled={!inputText.trim()}
        >
            <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default GlobalChat;
