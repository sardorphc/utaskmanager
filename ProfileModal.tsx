
import React, { useState, useRef, useEffect } from 'react';
import { User, ProfileComment } from '../types';
import { X, Camera, Save, MessageSquare, Send, Edit3, UserCheck, Check, RotateCcw, ZoomIn, Move, Award, BarChart3 } from 'lucide-react';
import { StorageService } from '../services/storage';
import StatisticsModal from './StatisticsModal';

interface ProfileModalProps {
  viewingUser: User;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedUser: User) => void;
}

const POPULAR_EMOJIS = ['👍', '🔥', '❤️', '👏', '🚀', '✅', '👀', '🎉'];

const ProfileModal: React.FC<ProfileModalProps> = ({ viewingUser, currentUser, isOpen, onClose, onUpdate }) => {
  const isOwnProfile = viewingUser.id === currentUser.id;
  const isNatalya = viewingUser.login === 'Natalya Pak';
  const [isEditing, setIsEditing] = useState(false);

  const [displayName, setDisplayName] = useState(viewingUser.displayName);
  const [age, setAge] = useState(viewingUser.age || '');
  const [bio, setBio] = useState(viewingUser.bio || '');
  const [avatar, setAvatar] = useState(viewingUser.avatar || '');
  const [comments, setComments] = useState<ProfileComment[]>(viewingUser.profileComments || []);
  const [newComment, setNewComment] = useState('');
  
  const [showStats, setShowStats] = useState(false);

  // Crop State
  const [cropMode, setCropMode] = useState(false);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isViewingAvatar, setIsViewingAvatar] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayName(viewingUser.displayName);
    setAge(viewingUser.age || '');
    setBio(viewingUser.bio || '');
    setAvatar(viewingUser.avatar || '');
    setComments(viewingUser.profileComments || []);
    setIsEditing(false); 
    setCropMode(false);
    setIsViewingAvatar(false);
    setShowStats(false);
  }, [viewingUser, isOpen]);

  useEffect(() => {
      if (cropMode && originalImage && canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#f3f4f6';
          ctx.fillRect(0,0, canvas.width, canvas.height);

          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;

          const scaledWidth = originalImage.width * scale;
          const scaledHeight = originalImage.height * scale;
          
          const drawX = centerX - (scaledWidth / 2) + position.x;
          const drawY = centerY - (scaledHeight / 2) + position.y;

          ctx.drawImage(originalImage, drawX, drawY, scaledWidth, scaledHeight);
      }
  }, [cropMode, originalImage, scale, position]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOwnProfile) return;
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'image/gif') {
          const reader = new FileReader();
          reader.onloadend = () => {
              setAvatar(reader.result as string);
              if (fileInputRef.current) fileInputRef.current.value = '';
          };
          reader.readAsDataURL(file);
          return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
            setOriginalImage(img);
            const initialScale = Math.max(256 / img.width, 256 / img.height);
            setScale(initialScale);
            setPosition({ x: 0, y: 0 });
            setCropMode(true);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const confirmCrop = () => {
      if (canvasRef.current) {
          const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);
          setAvatar(dataUrl);
          setCropMode(false);
          setOriginalImage(null);
      }
  };

  const cancelCrop = () => {
      setCropMode(false);
      setOriginalImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
      if (isDragging) {
          setPosition({
              x: e.clientX - dragStart.x,
              y: e.clientY - dragStart.y
          });
      }
  };

  const handleMouseUp = () => {
      setIsDragging(false);
  };

  const handleSave = () => {
    if (!isOwnProfile) return;
    const updatedUser: User = {
      ...viewingUser,
      displayName,
      age: Number(age),
      bio,
      avatar
    };
    StorageService.saveUser(updatedUser);
    onUpdate(updatedUser);
    setIsEditing(false);
  };

  const handleAddComment = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!newComment.trim()) return;

      const comment: ProfileComment = {
          id: `pc_${Date.now()}`,
          authorId: currentUser.id,
          authorName: currentUser.displayName,
          text: newComment,
          timestamp: Date.now()
      };

      const updatedUser = await StorageService.addProfileComment(viewingUser.id, comment);
      if (updatedUser) {
          setComments(updatedUser.profileComments || []);
          if (isOwnProfile) onUpdate(updatedUser); 
      }
      setNewComment('');
  };

  if (isViewingAvatar) {
      return (
          <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center animate-fade-in p-4" onClick={() => setIsViewingAvatar(false)}>
              <button className="absolute top-4 right-4 text-white hover:text-gray-300 p-2">
                  <X size={32} />
              </button>
              <img 
                src={avatar || "https://picsum.photos/500"} 
                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain animate-scale-in"
                onClick={(e) => e.stopPropagation()} 
              />
          </div>
      );
  }

  if (cropMode) {
      return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-travels">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 flex flex-col items-center">
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Настройте фото</h3>
                
                <div 
                    className="relative w-64 h-64 mb-4 cursor-move rounded-full overflow-hidden border-4 border-uzum-600 shadow-xl bg-gray-100"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <canvas 
                        ref={canvasRef} 
                        width={256} 
                        height={256} 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition duration-500">
                         <Move className="text-white drop-shadow-md" size={32}/>
                    </div>
                </div>

                <div className="w-full space-y-4 mb-6">
                    <div className="flex items-center gap-3">
                        <ZoomIn size={20} className="text-gray-400"/>
                        <input 
                            type="range" 
                            min="0.1" 
                            max="3" 
                            step="0.1" 
                            value={scale} 
                            onChange={(e) => setScale(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-uzum-600"
                        />
                    </div>
                    <p className="text-xs text-gray-400 text-center">Перетащите фото для центрирования и используйте зум</p>
                </div>

                <div className="flex gap-3 w-full">
                    <button onClick={cancelCrop} className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2">
                        <RotateCcw size={18}/> Отмена
                    </button>
                    <button onClick={confirmCrop} className="flex-1 py-3 rounded-xl bg-uzum-600 font-bold text-white hover:bg-uzum-700 flex items-center justify-center gap-2 shadow-lg">
                        <Check size={18}/> Готово
                    </button>
                </div>
            </div>
        </div>
      );
  }

  return (
    <>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-travels">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
        <div className="bg-uzum-600 dark:bg-uzum-900 p-4 flex justify-between items-center text-white shrink-0">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <UserCheck size={20} />
            {isOwnProfile ? (isEditing ? 'Редактирование' : 'Мой профиль') : 'Профиль сотрудника'}
          </h3>
          <div className="flex gap-2">
             <button 
                onClick={() => setShowStats(true)} 
                className="p-1 hover:bg-white/20 rounded-full transition flex items-center gap-1 px-2" 
                title="Статистика"
             >
                 <BarChart3 size={20} />
             </button>
             {isOwnProfile && !isEditing && (
                 <button onClick={() => setIsEditing(true)} className="p-1 hover:bg-white/20 rounded-full transition" title="Редактировать">
                     <Edit3 size={20} />
                 </button>
             )}
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition">
                <X size={24} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 flex-1">
          <div className="flex flex-col items-center mb-6">
            <div 
                className={`relative group ${isEditing ? 'cursor-pointer' : 'cursor-zoom-in'}`} 
                onClick={() => isEditing ? fileInputRef.current?.click() : setIsViewingAvatar(true)}
            >
              <img 
                src={avatar || "https://picsum.photos/200"} 
                alt="Avatar" 
                className="w-32 h-32 rounded-full object-cover border-4 border-uzum-100 dark:border-uzum-900 shadow-md group-hover:opacity-90 transition bg-gray-100 dark:bg-gray-700"
              />
              {isEditing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition">
                    <Camera className="text-white w-8 h-8" />
                  </div>
              )}
            </div>
            {isEditing && <input type="file" ref={fileInputRef} className="hidden" accept="image/*,image/gif" onChange={handleFileChange} />}
            {isEditing && <p className="text-gray-500 dark:text-gray-400 text-xs mt-2 text-center font-medium">Нажмите на фото, чтобы изменить<br/>(GIF поддерживаются!)</p>}
            {!isEditing && <p className="text-gray-400 dark:text-gray-500 text-xs mt-2 text-center">Нажмите на фото для просмотра</p>}
          </div>

          <div className="space-y-4">
             {(!isEditing) && (
                 <div className="text-center mb-6">
                     <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center justify-center gap-2">
                         {displayName}
                         {isNatalya && (
                             <div className="group relative">
                                 <Award className="text-yellow-500 fill-yellow-100" size={24}/>
                                 <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">Lead</span>
                             </div>
                         )}
                     </h2>
                     <div className="mt-2 flex justify-center gap-2">
                         <span className="px-3 py-1 bg-uzum-100 dark:bg-uzum-900/50 text-uzum-700 dark:text-white dark:shadow-[0_0_15px_rgba(139,92,246,0.3)] rounded-full text-xs font-bold uppercase tracking-wider border dark:border-uzum-600 transition-all">{viewingUser.role}</span>
                         {age && <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-bold">{age} лет</span>}
                     </div>

                     {bio ? (
                        <p className="text-gray-600 dark:text-gray-300 mt-4 italic max-w-xs mx-auto text-sm leading-relaxed">"{bio}"</p>
                     ) : (
                        <p className="text-gray-400 dark:text-gray-500 mt-4 text-sm">Информация о себе не заполнена.</p>
                     )}
                     
                     <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-4 text-left">
                         <div>
                             <p className="text-xs text-gray-400 font-bold uppercase">Логин</p>
                             <p className="text-sm font-medium text-gray-800 dark:text-white">{viewingUser.login}</p>
                         </div>
                         <div>
                             <p className="text-xs text-gray-400 font-bold uppercase">Статус</p>
                             <p className="text-sm font-medium text-green-600 dark:text-green-400">В сети</p>
                         </div>
                     </div>
                 </div>
             )}

            {isEditing && (
                <div className="animate-fade-in space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Логин</label>
                            <input type="text" value={viewingUser.login} disabled className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-300 border border-transparent font-medium"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Роль</label>
                            <input type="text" value={viewingUser.role} disabled className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-300 border border-transparent font-medium"/>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Имя и Фамилия</label>
                        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-uzum-500 focus:ring-2 focus:ring-uzum-100 dark:focus:ring-uzum-900 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 font-medium"/>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Возраст</label>
                        <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-uzum-500 focus:ring-2 focus:ring-uzum-100 dark:focus:ring-uzum-900 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 font-medium"/>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">О себе</label>
                        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-uzum-500 focus:ring-2 focus:ring-uzum-100 dark:focus:ring-uzum-900 outline-none resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 font-medium" placeholder="Расскажите о своих навыках..."/>
                    </div>
                </div>
            )}

            <div className="pt-6 border-t border-gray-100 dark:border-gray-700 mt-6">
                <h4 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <MessageSquare size={18} /> Стена сотрудника ({comments.length})
                </h4>
                
                <div className="space-y-3 mb-4 max-h-40 overflow-y-auto pr-2">
                    {comments.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Пока нет комментариев.</p>
                    ) : (
                        comments.map(c => (
                            <div key={c.id} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-gray-800 dark:text-white">{c.authorName}</span>
                                    <span className="text-[10px] text-gray-400">{new Date(c.timestamp).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{c.text}</p>
                            </div>
                        ))
                    )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                    <input 
                        type="text" 
                        value={newComment} 
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Оставьте комментарий..." 
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-uzum-500 outline-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400"
                    />
                    <button type="submit" className="bg-uzum-600 text-white p-2 rounded-lg hover:bg-uzum-700">
                        <Send size={16} />
                    </button>
                </form>
                <div className="flex gap-2 mt-2 flex-wrap">
                    {POPULAR_EMOJIS.map(emoji => (
                        <button key={emoji} type="button" onClick={() => setNewComment(prev => prev + emoji)} className="text-lg hover:scale-110 transition">{emoji}</button>
                    ))}
                </div>
            </div>

          </div>
        </div>

        {isEditing && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 shrink-0 flex gap-3">
                 <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-lg transition-all"
                >
                    Отмена
                </button>
                <button
                    onClick={handleSave}
                    className="flex-1 bg-uzum-600 hover:bg-uzum-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-uzum-200"
                >
                    <Save size={20} />
                    Сохранить
                </button>
            </div>
        )}
      </div>
    </div>
    
    {showStats && (
        <StatisticsModal 
            targetUser={viewingUser}
            isOpen={true}
            onClose={() => setShowStats(false)}
        />
    )}
    </>
  );
};

export default ProfileModal;