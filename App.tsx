
import React, { useState, useEffect, useRef } from 'react';
import { User, AppNotification, UserRole, AppSettings } from '../types';
import { StorageService } from '../services/storage';
import Auth from './Auth';
import TaskBoard from './TaskBoard';
import ProfileModal from './ProfileModal';
import GlobalChat from './GlobalChat';
import TeamKPI from './TeamKPI';
import DeveloperPanel from './DeveloperPanel';
import AboutModal, { APP_VERSION } from './AboutModal';
import { LogOut, Settings, Bell, AlertTriangle, Users, AlarmClock, MessageSquare, X, Layers, Volume2, VolumeX, BarChart2, Moon, Sun, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';

interface ToastProps {
  notification: AppNotification;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
    const isChat = notification.type === 'info' && notification.message.includes('ответил(а)');

    if (isChat) {
        return (
            <div className="fixed bottom-4 right-4 z-[60] max-w-sm animate-message-pop flex gap-2 items-end">
                <img src={notification.senderAvatar || "https://picsum.photos/200"} className="w-8 h-8 rounded-full border border-gray-200 shadow-sm mb-1"/>
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-xl rounded-2xl rounded-bl-none p-3 relative">
                    <button onClick={onClose} className="absolute -top-1 -right-1 bg-gray-200 dark:bg-gray-700 rounded-full p-0.5 text-gray-500 hover:text-red-500"><X size={12}/></button>
                    <p className="text-xs font-bold text-uzum-600 dark:text-uzum-400 mb-0.5">{notification.senderName || 'Коллега'}</p>
                    <p className="text-sm text-gray-800 dark:text-gray-100">{notification.message.split(': ')[1] || notification.message}</p>
                </div>
            </div>
        );
    }

    return (
      <div className={`fixed bottom-4 right-4 z-[60] bg-white dark:bg-gray-800 border-l-4 rounded-lg shadow-xl p-4 max-w-sm animate-slide-in-right flex gap-3 items-start ${notification.type === 'alert' ? 'border-red-600' : 'border-uzum-600'}`}>
        <div className={`p-2 rounded-full ${notification.type === 'alert' ? 'bg-red-100 text-red-600' : 'bg-uzum-100 text-uzum-600'}`}>
            {notification.type === 'alert' ? <AlertTriangle size={20} /> : <Bell size={20} />}
        </div>
        <div className="flex-1">
            <p className="text-sm text-gray-800 dark:text-gray-100 font-medium">{notification.message}</p>
            <p className="text-xs text-gray-400 mt-1">{new Date(notification.timestamp).toLocaleTimeString()}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">×</button>
      </div>
    );
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Sidebar State
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); 
  
  // Views Navigation State
  const [currentView, setCurrentView] = useState<'tasks' | 'kpi'>('tasks');

  // Modals
  const [profileModalUser, setProfileModalUser] = useState<User | null>(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [isUpdateMessage, setIsUpdateMessage] = useState(false);
  
  const [directChatUser, setDirectChatUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isShaking, setIsShaking] = useState(false);

  const [taskCount, setTaskCount] = useState(0);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(StorageService.getTheme());
  const [appSettings, setAppSettings] = useState<AppSettings>({} as AppSettings);

  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const logoDragStart = useRef({ x: 0, y: 0 });
  const logoStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const init = async () => {
        try {
            const currentUser = await StorageService.getCurrentUser();
            if (currentUser) {
              setUser(currentUser);
            }
            const savedSound = localStorage.getItem('uzum_sound_enabled');
            if (savedSound !== null) {
                setIsSoundEnabled(savedSound === 'true');
            }
            
            const settings = await StorageService.getAppSettings();
            setAppSettings(settings);

            const lastVersion = localStorage.getItem('uzum_app_version');
            if (lastVersion !== APP_VERSION && !settings.disableChangelog) {
                setIsUpdateMessage(true);
                setShowAboutModal(true);
                localStorage.setItem('uzum_app_version', APP_VERSION);
            } else if (lastVersion !== APP_VERSION) {
                localStorage.setItem('uzum_app_version', APP_VERSION);
            }
            
            // Load users initially for sidebar
            const u = await StorageService.getUsers();
            setUsers(u);

        } catch (e) {
            console.error("Initialization error:", e);
        } finally {
            setIsInitializing(false);
        }
    };
    init();
  }, []);

  useEffect(() => {
      if (isDarkMode) {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
      StorageService.saveTheme(isDarkMode);
  }, [isDarkMode]);

  const toggleSound = () => {
      const newState = !isSoundEnabled;
      setIsSoundEnabled(newState);
      localStorage.setItem('uzum_sound_enabled', String(newState));
  };

  const toggleTheme = () => {
      setIsDarkMode(!isDarkMode);
  };

  useEffect(() => {
      if (!user) return;
      
      const poll = setInterval(async () => {
          await StorageService.updateUserActivity(user.id);
          const u = await StorageService.getUsers();
          setUsers(u);

          const tasks = await StorageService.getTasks();
          const activeCount = tasks.filter(t => t.status !== 'done' && t.status !== 'canceled').length;
          setTaskCount(activeCount);

      }, 5000); 
      return () => clearInterval(poll);
  }, [user, isSoundEnabled, appSettings]);

  // Sidebar Resizing
  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (isResizing && !isSidebarCollapsed) {
              const newWidth = Math.max(280, Math.min(600, e.clientX));
              setSidebarWidth(newWidth);
          }
      };
      const handleMouseUp = () => { setIsResizing(false); };

      if (isResizing) {
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isResizing, isSidebarCollapsed]);

  // Logo Dragging Logic
  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (isDraggingLogo) {
              const dx = e.clientX - logoDragStart.current.x;
              const dy = e.clientY - logoDragStart.current.y;
              const newX = logoStartPos.current.x + dx;
              const newY = logoStartPos.current.y + dy;
              setAppSettings(prev => ({ ...prev, logoX: newX, logoY: newY }));
          }
      };

      const handleMouseUp = () => {
          if (isDraggingLogo) {
              setIsDraggingLogo(false);
              StorageService.saveAppSettings(appSettings);
          }
      };

      if (isDraggingLogo) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isDraggingLogo, appSettings]);

  const startLogoDrag = (e: React.MouseEvent) => {
      if (user?.role !== UserRole.DEVELOPER) return;
      e.preventDefault();
      setIsDraggingLogo(true);
      logoDragStart.current = { x: e.clientX, y: e.clientY };
      logoStartPos.current = { x: appSettings.logoX || 0, y: appSettings.logoY || 0 };
  };

  const handleLogin = (loggedInUser: User) => {
    const updatedUser = { ...loggedInUser, onlineSince: Date.now(), lastActive: Date.now() };
    setUser(updatedUser);
    StorageService.saveUser(updatedUser); 
    StorageService.setCurrentUser(updatedUser);
  };

  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setUser(null);
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    if (profileModalUser?.id === updatedUser.id) {
        setProfileModalUser(updatedUser);
    }
  };

  const openProfile = async (userId: string) => {
      const foundUser = await StorageService.getUserById(userId);
      if (foundUser) setProfileModalUser(foundUser);
  };

  const addInternalNotification = (msg: string) => {
      if (user?.login === 'Natalya Pak') {
           const n: AppNotification = {
               id: `internal_${Date.now()}`,
               userId: user.id,
               message: msg,
               type: 'info',
               isRead: true,
               timestamp: Date.now()
           };
           setNotifications(prev => [...prev, n]);
           if (isSoundEnabled) {
                const audio = new Audio(appSettings.notificationSound);
                audio.volume = 0.5;
                audio.play().catch(e => console.log('Audio play failed', e));
           }
      }
  };
  
  const handleChatNotification = (notification: AppNotification) => {
      // StorageService.addNotification(notification); 
  };

  const sendWakeUp = (targetUser: User) => {
      if (user) {
        StorageService.sendWakeUp(targetUser.id, user.displayName);
        alert(`БУДИЛЬНИК ОТПРАВЛЕН ${targetUser.displayName}!`);
      }
  };

  const startDirectChat = (targetUser: User) => {
      setDirectChatUser(targetUser);
      setShowTeamModal(false);
      setIsMobileSidebarOpen(true); 
  };

  const getChatId = (u1: string, u2: string) => {
      return [u1, u2].sort().join('_');
  };

  const formatCount = (n: number) => {
      if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
      if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
      return n.toString();
  };

  if (isInitializing) {
      return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-500">Загрузка...</div>;
  }

  if (!user) {
    return <Auth onLogin={handleLogin} onToggleTheme={toggleTheme} isDarkMode={isDarkMode} />;
  }

  const isNatalya = user.login === 'Natalya Pak';
  const isDeveloper = user.role === UserRole.DEVELOPER;
  const isManager = user.isAdmin || user.role === UserRole.MANAGER || isNatalya || isDeveloper;

  const logoFillColor = isDarkMode ? '#ffffff' : (appSettings.logoColor || '#7000ff');

  return (
    <div 
        className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex font-travels overflow-hidden ${isShaking ? 'bass-boosted' : ''}`}
        style={{ 
            zoom: appSettings.uiScale,
            height: `${100 / appSettings.uiScale}vh`,
            width: `${100 / appSettings.uiScale}vw` 
        }}
    >
      
      {notifications.map((n) => (
          <Toast key={n.id} notification={n} onClose={() => setNotifications(prev => prev.filter(x => x.id !== n.id))} />
      ))}

      {isMobileSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileSidebarOpen(false)}></div>
      )}

      <aside 
        style={{ width: isSidebarCollapsed ? '80px' : `${sidebarWidth}px` }}
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:flex bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col h-full flex-shrink-0 group/sidebar`}
      >
        <div className={`p-4 border-b border-gray-100 dark:border-gray-700 flex ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} items-center shrink-0 h-24 transition-all`}>
           {!isSidebarCollapsed ? (
               <div 
                    className={`h-16 flex items-center pl-4 transition-all duration-300 ${isDeveloper ? 'cursor-move' : ''}`}
                    onMouseDown={startLogoDrag}
                    style={{ 
                        transform: `translate(${appSettings.logoX}px, ${appSettings.logoY}px) scale(${appSettings.logoScale || 1})`,
                        transformOrigin: 'center left'
                    }}
               >
                    <svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1080 1080" className="h-full w-auto select-none pointer-events-none">
                      <style>{`.st0 { fill: ${logoFillColor}; }`}</style>
                      <path className="st0" d="M353.57,575.95c.06,22.56-6.58,44.62-19.07,63.41-12.49,18.78-30.28,33.44-51.1,42.11-20.82,8.67-43.75,10.97-65.88,6.6-22.13-4.37-42.47-15.2-58.44-31.13-15.97-15.93-26.86-36.24-31.28-58.36-4.42-22.12-2.18-45.05,6.44-65.9,8.62-20.85,23.23-38.67,41.98-51.2,18.75-12.54,40.8-19.23,63.36-19.23,14.95-.03,29.77,2.89,43.59,8.6,13.82,5.7,26.39,14.07,36.98,24.63,10.59,10.56,18.99,23.1,24.72,36.91,5.74,13.81,8.69,28.61,8.7,43.57h0ZM252.67,501.73c-4.26-.4-8.65-.56-13.09-.56s-8.75.16-13.03.56v60.64h26.14l-.02-60.64ZM312.98,537.07c-9.53-3.12-19.26-5.57-29.13-7.32v50.88c0,36.65-15.58,55.93-44.23,55.93s-44.23-19.28-44.23-55.93v-50.88c-9.87,1.76-19.6,4.2-29.13,7.32v43.87c.63,19.04,8.64,37.09,22.33,50.34,13.69,13.25,32,20.65,51.05,20.65s37.36-7.41,51.05-20.65c13.69-13.25,21.7-31.3,22.33-50.34l-.04-43.87Z"/>
                      <path className="st0" d="M722.03,579.77c0,14.78-8.34,21.61-20.78,21.61s-20.47-6.7-20.47-21.61v-48.79h-26.8v49.73c0,32.4,27.11,45.1,47.48,45.1s47.51-12.7,47.51-45.1v-49.73h-26.8l-.13,48.79Z"/>
                      <path className="st0" d="M631.29,553.63v-22.65h-87.12v22.65h51.57l-53.65,47.82v22.65h92.45v-22.65h-56.8l53.54-47.82Z"/>
                      <path className="st0" d="M883.17,529.21c-16.99,0-29.79,6.9-36.12,17.42-6.47-10.52-20.51-17.42-35.08-17.42-28.65,0-43.56,18.26-43.56,40.81v54.08h26.81v-50.26c0-10.79,5.66-20.27,18.66-20.27,2.65-.16,5.3.25,7.78,1.2,2.48.95,4.73,2.41,6.6,4.29,1.87,1.88,3.32,4.14,4.26,6.63.93,2.49,1.33,5.14,1.16,7.79v50.66h26.81v-50.7c0-10.82,6.37-19.9,19.23-19.9s19.07,9.48,19.07,20.27v50.26h26.8v-53.98c0-22.55-13.84-40.81-42.65-40.81l.23-.07Z"/>
                      <path className="st0" d="M497.62,579.77c0,14.78-8.34,21.61-20.67,21.61s-20.57-6.7-20.57-21.61v-48.79h-26.81v49.73c0,32.4,27.01,45.1,47.48,45.1s47.41-12.7,47.41-45.1v-49.73h-26.81l-.03,48.79Z"/>
                </svg>
            </div>
           ) : (
                <div className="w-10 h-10 transition-all duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" className="w-full h-full">
                        <path fill={logoFillColor} d="M353.57,575.95c.06,22.56-6.58,44.62-19.07,63.41-12.49,18.78-30.28,33.44-51.1,42.11-20.82,8.67-43.75,10.97-65.88,6.6-22.13-4.37-42.47-15.2-58.44-31.13-15.97-15.93-26.86-36.24-31.28-58.36-4.42-22.12-2.18-45.05,6.44-65.9,8.62-20.85,23.23-38.67,41.98-51.2,18.75-12.54,40.8-19.23,63.36-19.23,14.95-.03,29.77,2.89,43.59,8.6,13.82,5.7,26.39,14.07,36.98,24.63,10.59,10.56,18.99,23.1,24.72,36.91,5.74,13.81,8.69,28.61,8.7,43.57h0ZM252.67,501.73c-4.26-.4-8.65-.56-13.09-.56s-8.75.16-13.03.56v60.64h26.14l-.02-60.64ZM312.98,537.07c-9.53-3.12-19.26-5.57-29.13-7.32v50.88c0,36.65-15.58,55.93-44.23,55.93s-44.23-19.28-44.23-55.93v-50.88c-9.87,1.76-19.6,4.2-29.13,7.32v43.87c.63,19.04,8.64,37.09,22.33,50.34,13.69,13.25,32,20.65,51.05,20.65s37.36-7.41,51.05-20.65c13.69-13.25,21.7-31.3,22.33-50.34l-.04-43.87Z"/>
                    </svg>
                </div>
           )}
           <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                className="hidden md:block p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-uzum-600 hover:bg-uzum-50 dark:hover:bg-gray-600 transition"
           >
               {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
           </button>
           <button onClick={() => setIsMobileSidebarOpen(false)} className="md:hidden p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500"><ChevronLeft size={24} /></button>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
             <div className="flex flex-col gap-2 shrink-0">
                <button 
                    onClick={() => {
                        setDirectChatUser(null);
                        setCurrentView('tasks');
                        setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-4'} py-3 rounded-xl font-bold transition-all text-left shadow-sm group relative ${currentView === 'tasks' && !directChatUser ? 'bg-uzum-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                    <div className="flex items-center gap-3">
                        <Layers size={20} />
                        {!isSidebarCollapsed && <span>Задачи</span>}
                    </div>
                    {taskCount > 0 && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${!isSidebarCollapsed ? '' : 'absolute top-1 right-1'} ${currentView === 'tasks' && !directChatUser ? 'bg-white text-uzum-600' : 'bg-uzum-600 text-white'}`}>
                            {formatCount(taskCount)}
                        </span>
                    )}
                </button>
                <button 
                    onClick={() => {
                        setShowTeamModal(true);
                        setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center px-0' : 'px-4'} py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl font-bold transition-all text-left shadow-sm group relative`}
                >
                    <Users size={20} />
                    {!isSidebarCollapsed && <span>Наша команда</span>}
                </button>
                {isManager && (
                    <button 
                        onClick={() => {
                            setCurrentView('kpi');
                            setDirectChatUser(null);
                            setIsMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center px-0' : 'px-4'} py-3 rounded-xl font-bold transition-all text-left shadow-sm group relative ${currentView === 'kpi' ? 'bg-uzum-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <BarChart2 size={20} />
                        {!isSidebarCollapsed && <span>KPI Команды</span>}
                    </button>
                )}
             </div>
             
             <div className={`flex-1 min-h-0 flex flex-col pt-2 border-t border-gray-100 dark:border-gray-700 mt-2 ${isSidebarCollapsed ? 'hidden' : 'flex'}`}>
                {directChatUser ? (
                    <div className="flex flex-col h-full">
                        <button onClick={() => setDirectChatUser(null)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-uzum-600 mb-2 flex items-center gap-1 shrink-0">
                            <span className="text-lg">←</span> Назад
                        </button>
                        <GlobalChat 
                            currentUser={user} 
                            onUserClick={openProfile} 
                            onNotify={handleChatNotification}
                            chatId={getChatId(user.id, directChatUser.id)}
                            title={`ЛС: ${directChatUser.displayName}`}
                            isSoundEnabled={isSoundEnabled}
                            messageSoundUrl={appSettings.messageSound}
                        />
                    </div>
                ) : (
                    <GlobalChat 
                        currentUser={user} 
                        onUserClick={openProfile} 
                        onNotify={handleChatNotification} 
                        isSoundEnabled={isSoundEnabled}
                        title={'Общий чат'}
                        messageSoundUrl={appSettings.messageSound}
                    />
                )}
             </div>
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
            {!isSidebarCollapsed && (
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 cursor-pointer hover:bg-white dark:hover:bg-gray-700 p-2 rounded-lg transition" onClick={() => setProfileModalUser(user)}>
                        <img src={user.avatar || 'https://picsum.photos/200'} alt="Me" className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-600 shadow-sm" />
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.displayName}</p>
                            {isNatalya ? (
                                <p className="text-[10px] font-black text-uzum-600 dark:text-uzum-400 uppercase tracking-widest">Насальника</p>
                            ) : (
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.role}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            <div className={`grid gap-2 ${isSidebarCollapsed ? 'grid-cols-1' : 'grid-cols-5'}`}>
                {isSidebarCollapsed && (
                    <button onClick={() => setProfileModalUser(user)} className="flex justify-center mb-2">
                        <img src={user.avatar || 'https://picsum.photos/200'} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600"/>
                    </button>
                )}

                <button onClick={() => setProfileModalUser(user)} className={`flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-uzum-300 hover:text-uzum-600 text-gray-600 dark:text-gray-300 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${isSidebarCollapsed ? 'hidden' : ''}`}><Settings size={16} /></button>
                <button onClick={toggleSound} className={`flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${!isSoundEnabled ? 'text-red-500 border-red-200' : 'text-gray-600 dark:text-gray-300 hover:text-uzum-600'}`}>{isSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>
                <button onClick={toggleTheme} className="flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:text-uzum-600 text-gray-600 dark:text-gray-300 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm">{isDarkMode ? <Sun size={16} /> : <Moon size={16} />}</button>
                <button onClick={() => { setIsUpdateMessage(false); setShowAboutModal(true); }} className="flex items-center justify-center bg-uzum-100 text-uzum-600 dark:bg-gray-700 dark:text-white hover:bg-uzum-200 dark:hover:bg-gray-600 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"><HelpCircle size={16} /></button>
                <button onClick={handleLogout} className="flex items-center justify-center bg-red-50 text-red-500 border border-red-100 dark:bg-red-900/20 dark:border-red-900 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"><LogOut size={16} /></button>
            </div>
            {!isSidebarCollapsed && (<div className="mt-2 flex justify-center items-center text-[10px] text-gray-400"><span>v{APP_VERSION}</span></div>)}
        </div>
        
        {!isSidebarCollapsed && (
            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-uzum-500 transition-colors z-20 hidden md:block" onMouseDown={() => setIsResizing(true)}></div>
        )}
      </aside>

      <main className="flex-1 overflow-y-auto h-full relative bg-gray-50 dark:bg-gray-900 transition-all duration-300">
          {currentView === 'tasks' ? (
              <TaskBoard 
                currentUser={user} 
                onNotify={(msg) => addInternalNotification(msg)}
                onUserClick={openProfile}
                isSoundEnabled={isSoundEnabled}
                onToggleTheme={toggleTheme}
                isDarkMode={isDarkMode}
                onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
              />
          ) : (
              <TeamKPI onClose={() => setCurrentView('tasks')} />
          )}
      </main>

      {profileModalUser && (<ProfileModal viewingUser={profileModalUser} currentUser={user} isOpen={!!profileModalUser} onClose={() => setProfileModalUser(null)} onUpdate={handleUserUpdate}/>)}
      {showTeamModal && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">Наша команда</h3>
                      <button onClick={() => setShowTeamModal(false)}><X className="text-gray-500 dark:text-gray-400"/></button>
                  </div>
                  <div className="overflow-y-auto p-2">
                      {users.map(u => (
                          <div key={u.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition" onClick={() => openProfile(u.id)}>
                              <img src={u.avatar} className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600 object-cover"/>
                              <div className="flex-1">
                                  <p className="font-bold text-sm text-gray-900 dark:text-white">{u.displayName}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{u.role}</p>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); startDirectChat(u); }} className="p-2 bg-uzum-50 dark:bg-gray-600 text-uzum-600 dark:text-white rounded-lg hover:bg-uzum-100 dark:hover:bg-gray-500 transition"><MessageSquare size={16}/></button>
                              {isManager && u.id !== user.id && (
                                  <button onClick={(e) => { e.stopPropagation(); sendWakeUp(u); }} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition" title="БУДИЛЬНИК!"><AlarmClock size={16}/></button>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
      {showAboutModal && (<AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} isUpdateMessage={isUpdateMessage} />)}
      {isDeveloper && (<DeveloperPanel onSettingsChange={setAppSettings} currentSettings={appSettings}/>)}
    </div>
  );
}

export default App;
