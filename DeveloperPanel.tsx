
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, AppSettings } from '../types';
import { StorageService } from '../services/storage';
import { Settings, Shield, UserX, Save, X, GripHorizontal, RotateCcw, Zap, EyeOff, History, Volume2, Database } from 'lucide-react';

interface DeveloperPanelProps {
    onSettingsChange: (settings: AppSettings) => void;
    currentSettings: AppSettings;
}

const DeveloperPanel: React.FC<DeveloperPanelProps> = ({ onSettingsChange, currentSettings }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [settings, setSettings] = useState<AppSettings>(currentSettings);
    
    const [panelPosition, setPanelPosition] = useState({ x: 100, y: 100 });
    const [isDraggingPanel, setIsDraggingPanel] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    const [buttonPosition, setButtonPosition] = useState({ x: currentSettings.devButtonX || 20, y: currentSettings.devButtonY || (window.innerHeight - 80) });
    const [isDraggingButton, setIsDraggingButton] = useState(false);
    const buttonDragStartRef = useRef({ x: 0, y: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const loadUsers = async () => {
            setUsers(await StorageService.getUsers());
        };
        loadUsers();
        const interval = setInterval(loadUsers, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setSettings(currentSettings);
        if (currentSettings.devButtonX && currentSettings.devButtonY) {
            setButtonPosition({ x: currentSettings.devButtonX, y: currentSettings.devButtonY });
        }
    }, [currentSettings]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDraggingPanel) {
                setPanelPosition({
                    x: e.clientX - dragStartRef.current.x,
                    y: e.clientY - dragStartRef.current.y
                });
            }
        };
        const handleMouseUp = () => setIsDraggingPanel(false);

        if (isDraggingPanel) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingPanel]);

    useEffect(() => {
        const handleButtonMove = (e: MouseEvent) => {
            if (isDraggingButton) {
                setButtonPosition({
                    x: e.clientX - buttonDragStartRef.current.x,
                    y: e.clientY - buttonDragStartRef.current.y
                });
            }
        };
        
        const handleButtonUp = () => {
            if (isDraggingButton) {
                setIsDraggingButton(false);
                const newSettings = { ...settings, devButtonX: buttonPosition.x, devButtonY: buttonPosition.y };
                StorageService.saveAppSettings(newSettings);
                onSettingsChange(newSettings);
            }
        };

        if (isDraggingButton) {
            window.addEventListener('mousemove', handleButtonMove);
            window.addEventListener('mouseup', handleButtonUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleButtonMove);
            window.removeEventListener('mouseup', handleButtonUp);
        };
    }, [isDraggingButton, buttonPosition, settings]);

    const startDragPanel = (e: React.MouseEvent) => {
        setIsDraggingPanel(true);
        dragStartRef.current = {
            x: e.clientX - panelPosition.x,
            y: e.clientY - panelPosition.y
        };
    };

    const startDragButton = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDraggingButton(true);
        buttonDragStartRef.current = {
            x: e.clientX - buttonPosition.x,
            y: e.clientY - buttonPosition.y
        };
    };

    const handleSaveSettings = () => {
        StorageService.saveAppSettings(settings);
        onSettingsChange(settings);
        alert("Настройки разработчика сохранены.");
    };

    const handleResetDefaults = () => {
        if (!confirm('Сбросить все настройки интерфейса (масштаб, звуки, логотип) по умолчанию?')) return;
        const defaults: AppSettings = {
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
        setSettings(defaults);
        StorageService.saveAppSettings(defaults);
        onSettingsChange(defaults);
    };

    const handleBanUser = async (id: string) => {
        if (!confirm('Вы уверены, что хотите забанить (удалить) этого пользователя?')) return;
        const updated = await StorageService.deleteUser(id);
        setUsers(updated);
    };

    const handleChangeRole = (id: string, newRole: UserRole) => {
        const user = users.find(u => u.id === id);
        if (user) {
            user.role = newRole;
            StorageService.saveUser(user);
            setUsers([...users]); 
        }
    };

    const resetVersionHistory = () => {
        localStorage.removeItem('uzum_app_version');
        alert("История версий сброшена. При следующей загрузке (F5) появится окно 'Что нового'.");
    };

    const handleWipeData = () => {
        if (confirm("ВНИМАНИЕ! Это удалит ВСЕ задачи, пользователей и настройки из браузера. Продолжить?")) {
            localStorage.clear();
            window.location.reload();
        }
    }

    if (!isOpen) {
        return (
            <button 
                ref={buttonRef}
                onMouseDown={startDragButton}
                onClick={(e) => setIsOpen(true)}
                className="fixed z-[200] bg-black text-white p-3 rounded-full shadow-2xl border-2 border-yellow-400 hover:scale-110 transition-transform cursor-move active:cursor-grabbing"
                style={{ left: buttonPosition.x, top: buttonPosition.y }}
                title="Панель Разработчика (Перетащи меня)"
            >
                <Shield size={24} className="text-yellow-400"/>
            </button>
        );
    }

    return (
        <div 
            className="fixed z-[200] flex flex-col bg-gray-900 border-2 border-yellow-500 rounded-2xl w-full max-w-4xl shadow-[0_0_50px_rgba(234,179,8,0.3)] overflow-hidden font-mono max-h-[80vh]"
            style={{ left: panelPosition.x, top: panelPosition.y }}
        >
            <div 
                className="p-4 bg-black border-b border-yellow-500/30 flex justify-between items-center cursor-move select-none"
                onMouseDown={startDragPanel}
            >
                <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
                    <Shield /> DEVELOPER MODE: САРДОР
                </h2>
                <div className="flex gap-2">
                    <GripHorizontal className="text-gray-600"/>
                    <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 text-gray-300">
                
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white border-b border-gray-700 pb-2 flex items-center gap-2">
                        <Zap size={18}/> Расширенный функционал
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition ${settings.disableChangelog ? 'bg-green-900/30 border-green-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`} onClick={() => setSettings({...settings, disableChangelog: !settings.disableChangelog})}>
                            <div>
                                <p className="font-bold text-white mb-1 flex items-center gap-2"><EyeOff size={16}/> Скрыть Changelog</p>
                                <p className="text-xs text-gray-400">Отключить окно "Что нового"</p>
                            </div>
                            <div className={`w-10 h-6 rounded-full relative transition ${settings.disableChangelog ? 'bg-green-500' : 'bg-gray-600'}`}>
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.disableChangelog ? 'left-5' : 'left-1'}`}></div>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-gray-800 border border-gray-700 hover:border-yellow-500 cursor-pointer transition flex items-center gap-3" onClick={resetVersionHistory}>
                            <div className="p-2 bg-yellow-900/30 rounded-lg text-yellow-500">
                                <History size={20}/>
                            </div>
                            <div>
                                <p className="font-bold text-white mb-1">Сбросить версию</p>
                                <p className="text-xs text-gray-400">Показать окно обновления снова</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-red-900/20 border border-red-800 hover:border-red-500 cursor-pointer transition flex items-center gap-3" onClick={handleWipeData}>
                            <div className="p-2 bg-red-900/50 rounded-lg text-red-500">
                                <Database size={20}/>
                            </div>
                            <div>
                                <p className="font-bold text-white mb-1">Очистить данные</p>
                                <p className="text-xs text-red-400">Удалить все задачи и пользователей (LocalStorage)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Settings size={18}/> Интерфейс и Логотип
                        </h3>
                        <button 
                            onClick={handleResetDefaults}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 border border-red-900 bg-red-900/20 px-2 py-1 rounded"
                        >
                            <RotateCcw size={12}/> Сбросить настройки
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800 p-4 rounded-xl">
                            <label className="block text-xs uppercase mb-2 text-gray-500">Глобальный Масштаб</label>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="range" 
                                    min="0.5" 
                                    max="1.5" 
                                    step="0.05"
                                    value={settings.uiScale}
                                    onChange={(e) => setSettings({ ...settings, uiScale: parseFloat(e.target.value) })}
                                    className="w-full accent-yellow-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="font-bold text-yellow-400 w-16 text-right">{(settings.uiScale * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-xl">
                            <label className="block text-xs uppercase mb-2 text-gray-500">Размер Логотипа</label>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="range" 
                                    min="0.5" 
                                    max="3" 
                                    step="0.1"
                                    value={settings.logoScale || 1}
                                    onChange={(e) => setSettings({ ...settings, logoScale: parseFloat(e.target.value) })}
                                    className="w-full accent-yellow-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="font-bold text-yellow-400 w-16 text-right">{(settings.logoScale || 1).toFixed(1)}x</span>
                            </div>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-xl col-span-2">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs uppercase text-gray-500">Цвет Логотипа</label>
                                <span className="text-[10px] text-gray-500">Положение: X:{settings.logoX?.toFixed(0)}, Y:{settings.logoY?.toFixed(0)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="color" 
                                    value={settings.logoColor || '#7000ff'}
                                    onChange={(e) => setSettings({ ...settings, logoColor: e.target.value })}
                                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-none"
                                />
                                <input 
                                    type="text" 
                                    value={settings.logoColor || '#7000ff'}
                                    onChange={(e) => setSettings({ ...settings, logoColor: e.target.value })}
                                    className="bg-gray-700 border border-gray-600 text-white p-2 rounded text-sm w-32"
                                />
                                <div className="ml-auto text-xs text-yellow-500/70 italic">
                                    Перетащите логотип мышкой в боковой панели
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white border-b border-gray-700 pb-2 flex items-center gap-2">
                        <Volume2 size={18}/> Настройка Звуков (URL mp3)
                    </h3>
                    <div className="grid gap-4">
                        <div>
                            <label className="block text-xs uppercase mb-1 text-gray-500">Уведомление</label>
                            <input 
                                type="text" 
                                value={settings.notificationSound}
                                onChange={(e) => setSettings({...settings, notificationSound: e.target.value})}
                                className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded text-sm focus:border-yellow-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase mb-1 text-gray-500">Будильник (Сирена)</label>
                            <input 
                                type="text" 
                                value={settings.alarmSound}
                                onChange={(e) => setSettings({...settings, alarmSound: e.target.value})}
                                className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded text-sm focus:border-yellow-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase mb-1 text-gray-500">Сообщение чата</label>
                            <input 
                                type="text" 
                                value={settings.messageSound}
                                onChange={(e) => setSettings({...settings, messageSound: e.target.value})}
                                className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded text-sm focus:border-yellow-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white border-b border-gray-700 pb-2 flex items-center gap-2">
                        <UserX size={18}/> Управление Пользователями
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3">Имя</th>
                                    <th className="px-4 py-3">Логин</th>
                                    <th className="px-4 py-3">Роль</th>
                                    <th className="px-4 py-3 text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-gray-800/50">
                                        <td className="px-4 py-3 font-bold text-white">{u.displayName}</td>
                                        <td className="px-4 py-3">{u.login}</td>
                                        <td className="px-4 py-3">
                                            <select 
                                                value={u.role}
                                                disabled={u.id === 'solar_bridge'}
                                                onChange={(e) => handleChangeRole(u.id, e.target.value as UserRole)}
                                                className={`bg-gray-800 border border-gray-600 rounded p-1 text-xs text-yellow-400 focus:border-yellow-500 outline-none ${u.id === 'solar_bridge' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {Object.values(UserRole).map(r => (
                                                    <option key={r} value={r}>{r}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {u.id !== 'solar_bridge' && (
                                                <button 
                                                    onClick={() => handleBanUser(u.id)}
                                                    className="text-red-500 hover:text-red-400 hover:bg-red-900/30 p-2 rounded transition"
                                                    title="Забанить навсегда"
                                                >
                                                    <UserX size={16}/>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <div className="p-4 bg-black border-t border-yellow-500/30 flex justify-end">
                <button 
                    onClick={handleSaveSettings}
                    className="bg-yellow-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-400 flex items-center gap-2 shadow-lg shadow-yellow-500/20"
                >
                    <Save size={20}/> Сохранить и Применить
                </button>
            </div>
        </div>
    );
};

export default DeveloperPanel;
