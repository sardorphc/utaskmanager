
import React, { useState, useEffect, useRef } from 'react';
import { User, Task, Comment, UserRole, TaskStatus, TaskCategory, InfographicTariff, SkuLog } from '../types';
import { StorageService } from '../services/storage';
import { renderTextWithLinks } from './GlobalChat';
import { 
  CheckCircle2, AlertCircle, MessageSquare, Play, Plus, Calendar,
  Trash2, Coffee, Check, X,
  User as UserIcon, FileImage, Upload, Image as ImageIcon, Download,
  Camera, Brush, Layers, Briefcase, ListPlus, Layout, Link as LinkIcon,
  Barcode, Tag, CheckSquare, Pencil, Save, Send, Copy, FileSpreadsheet, ExternalLink, Cloud, PenTool, RotateCcw, Ban, Search, ChevronDown, Menu, Archive, HelpCircle, ShoppingBag
} from 'lucide-react';

interface TaskBoardProps {
  currentUser: User;
  onNotify: (message: string) => void;
  onUserClick: (userId: string) => void;
  isSoundEnabled: boolean;
  onToggleTheme?: () => void;
  isDarkMode?: boolean;
  onToggleMobileSidebar?: () => void;
}

const TaskBoard: React.FC<TaskBoardProps> = ({ currentUser, onNotify, onUserClick, isSoundEnabled, onToggleTheme, isDarkMode, onToggleMobileSidebar }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [detailedTask, setDetailedTask] = useState<Task | null>(null);
  const [isEditingTaskDetails, setIsEditingTaskDetails] = useState(false);
  const [completionTask, setCompletionTask] = useState<Task | null>(null);
  
  const [newComment, setNewComment] = useState('');
  
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('photo');
  const [newTaskTariff, setNewTaskTariff] = useState<InfographicTariff>('Standard');
  const [newTaskSku, setNewTaskSku] = useState<number>(1);
  const [newTaskIs1P, setNewTaskIs1P] = useState(false); 
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([currentUser.id]);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [newTaskReference, setNewTaskReference] = useState<string>('');
  const [newTaskProductId, setNewTaskProductId] = useState('');
  const [newTaskBarcodes, setNewTaskBarcodes] = useState('');
  const [newTaskSourceLink, setNewTaskSourceLink] = useState('');

  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editProductId, setEditProductId] = useState('');
  const [editBarcodes, setEditBarcodes] = useState('');
  const [editSku, setEditSku] = useState(0);
  const [editSourceLink, setEditSourceLink] = useState('');
  const [editResultLink, setEditResultLink] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleteToArchive, setDeleteToArchive] = useState(false);

  const [showPartialModal, setShowPartialModal] = useState(false);
  const [partialSkuInput, setPartialSkuInput] = useState<number>(1);
  const getLocalDate = (daysOffset: number = 0) => {
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };
  const [partialDateInput, setPartialDateInput] = useState<string>(getLocalDate());

  type FilterType = 'all' | TaskCategory | 'done';
  const [viewFilter, setViewFilter] = useState<FilterType>('all');
  
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  const isNatalya = currentUser.login === 'Natalya Pak';
  const isManager = currentUser.isAdmin || currentUser.role === UserRole.MANAGER || isNatalya;

  useEffect(() => {
    const fetchInitialData = async () => {
        const fetchedTasks = await StorageService.getTasks();
        const fetchedUsers = await StorageService.getUsers();
        setTasks(fetchedTasks);
        setUsers(fetchedUsers);
    };
    fetchInitialData();

    const interval = setInterval(async () => {
        const cloudTasks = await StorageService.getTasks();
        const cloudUsers = await StorageService.getUsers();
        setUsers(cloudUsers);

        const now = Date.now();
        const displayTasks = cloudTasks.map(t => {
            if (t.status === 'doing' && t.lastTrackingStartTime) {
                const additionalSeconds = Math.floor((now - t.lastTrackingStartTime) / 1000);
                return {
                    ...t,
                    timeSpentSeconds: t.timeSpentSeconds + additionalSeconds
                };
            }
            return t;
        });
        
        setTasks(displayTasks);
        
        if (detailedTask) {
             const fresh = displayTasks.find(t => t.id === detailedTask.id);
             if (fresh && !isEditingTaskDetails) {
                 setDetailedTask(fresh);
             }
        }

    }, 1000);

    return () => clearInterval(interval);
  }, [detailedTask, isEditingTaskDetails]);

  useEffect(() => {
      if (isSearchExpanded && searchInputRef.current) {
          searchInputRef.current.focus();
      }
  }, [isSearchExpanded]);

  useEffect(() => {
      if (newTaskBarcodes.trim()) {
          const matches = newTaskBarcodes.match(/\d{13}/g);
          if (matches && matches.length > 0) {
              setNewTaskSku(matches.length);
          }
      }
  }, [newTaskBarcodes]);

  useEffect(() => {
      if (isEditingTaskDetails && editBarcodes.trim()) {
          const matches = editBarcodes.match(/\d{13}/g);
          if (matches && matches.length > 0) {
              setEditSku(matches.length);
          }
      }
  }, [editBarcodes, isEditingTaskDetails]);

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => setNewTaskReference(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const setDeadlineShortcut = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      const offset = date.getTimezoneOffset() * 60000;
      const localISOTime = new Date(date.getTime() - offset).toISOString().split('T')[0];
      setNewTaskDeadline(localISOTime);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    let barcodesArray: string[] = newTaskBarcodes.match(/\d{13}/g) || [];
    if (barcodesArray.length === 0 && newTaskSku > 0) {
        barcodesArray = Array.from({ length: newTaskSku }, (_, i) => `Работа ${i + 1}`);
    }
    const randomId = Math.floor(10000 + Math.random() * 900000); 
    const autoTitle = `Заявка #${randomId}`;
    const finalAssignees = newTaskAssignees.length > 0 ? newTaskAssignees : [currentUser.id];
    const uniqueId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newTask: Task = {
      id: uniqueId, 
      title: autoTitle, 
      description: newTaskDesc, 
      category: newTaskCategory, 
      infographicTariff: newTaskCategory === 'infographic' ? newTaskTariff : undefined, 
      is1P: newTaskIs1P,
      skuQuantity: Number(newTaskSku) || 1, 
      completedSku: 0, 
      skuHistory: [], 
      productId: newTaskProductId.trim() || undefined, 
      barcodes: barcodesArray.length > 0 ? barcodesArray : undefined, 
      completedBarcodes: [], 
      status: 'queue', 
      assigneeId: finalAssignees[0], 
      assigneeIds: finalAssignees, 
      creatorId: currentUser.id, 
      deadline: newTaskDeadline || new Date(Date.now() + 86400000).toISOString(), 
      timeSpentSeconds: 0, 
      isTracking: false, 
      createdAt: Date.now(), 
      comments: [], 
      referenceImage: newTaskReference, 
      sourceLink: newTaskSourceLink
    };

    setTasks(prev => [...prev, newTask]); 
    await StorageService.saveTask(newTask); 
    
    finalAssignees.forEach(uid => { if (uid !== currentUser.id) onNotify(`Вам назначена новая задача (${newTask.skuQuantity} SKU): ${newTask.title}`); });
    setShowNewTaskForm(false); setNewTaskDesc(''); setNewTaskSku(1); setNewTaskIs1P(false); setNewTaskCategory('photo'); setNewTaskTariff('Standard'); setNewTaskReference(''); setNewTaskProductId(''); setNewTaskBarcodes(''); setNewTaskSourceLink(''); setNewTaskAssignees([currentUser.id]);
  };

  const getTaskAssignees = (task: Task): string[] => task.assigneeIds && task.assigneeIds.length > 0 ? task.assigneeIds : (task.assigneeId ? [task.assigneeId] : []);
  
  const toggleAssigneeSelection = (userId: string) => {
      setNewTaskAssignees(prev => prev.includes(userId) ? (prev.filter(id => id !== userId).length ? prev.filter(id => id !== userId) : [currentUser.id]) : [...prev, userId]);
  };

  const initiateDeleteTask = (e: React.MouseEvent, task: Task) => { e.stopPropagation(); e.preventDefault(); setTaskToDelete(task); setDeleteToArchive(false); setShowDeleteModal(true); };
  
  const executeDeleteTask = async () => { 
      if (!taskToDelete) return; 
      
      if (deleteToArchive) {
          const archivedTask = { ...taskToDelete, status: 'canceled' as TaskStatus, completedAt: Date.now() };
          setTasks(prev => prev.map(t => t.id === taskToDelete.id ? archivedTask : t));
          await StorageService.saveTask(archivedTask);
          onNotify(`Задача "${taskToDelete.title}" перемещена в архив (Отказано).`);
      } else {
          setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
          await StorageService.deleteTask(taskToDelete.id);
      }
      
      if (detailedTask?.id === taskToDelete.id) setDetailedTask(null); 
      setShowDeleteModal(false); 
      setTaskToDelete(null); 
  };

  const restoreTask = async (e: React.MouseEvent, taskId: string) => { 
      e.stopPropagation(); 
      const task = tasks.find(t => t.id === taskId);
      if (task) {
          const restored = { ...task, status: 'queue' as TaskStatus, completedAt: undefined };
          setTasks(prev => prev.map(t => t.id === taskId ? restored : t));
          await StorageService.saveTask(restored);
          onNotify('Задача восстановлена из архива в очередь.'); 
      }
  };

  const handleQuickCompleteClick = (task: Task) => { setCompletionTask(task); setPartialDateInput(getLocalDate()); };
  const confirmCompletion = () => { if (!completionTask) return; changeStatus(completionTask, 'done', partialDateInput); setCompletionTask(null); };

  const changeStatus = async (task: Task, newStatus: TaskStatus, customDateStr?: string) => {
    const now = Date.now();
    let timestamp = now;
    if (customDateStr) { const d = new Date(customDateStr); d.setHours(12,0,0,0); timestamp = d.getTime(); }
    
    let updatedTask: Task;

    if (newStatus === 'done' && task.status !== 'done') {
        const remaining = task.skuQuantity - task.completedSku;
        let newSkuHistory = [...(task.skuHistory || [])];
        if (remaining > 0) newSkuHistory.push({ timestamp: timestamp, count: remaining, userId: currentUser.id });
        updatedTask = { ...task, status: 'done', completedSku: task.skuQuantity, skuHistory: newSkuHistory, completedAt: timestamp, lastTrackingStartTime: undefined };
        onNotify(`Задача "${task.title}" завершена!`);
    } else {
        if (newStatus === 'doing' && task.status !== 'doing') onNotify(`@${currentUser.displayName} приступил(а) к работе над задачей "${task.title}"`);
        updatedTask = { ...task, status: newStatus, lastTrackingStartTime: newStatus === 'doing' ? now : undefined, completedAt: newStatus === 'done' ? now : task.completedAt };
    }

    setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
    await StorageService.saveTask(updatedTask);
    if (detailedTask && detailedTask.id === task.id) setDetailedTask(updatedTask);
  };

  const submitPartialSku = async (overrideAmount?: number, overrideDateStr?: string) => { 
      if (!detailedTask) return; 
      const countToAdd = overrideAmount !== undefined ? overrideAmount : partialSkuInput; 
      if (countToAdd <= 0) return; 
      
      const dateStr = overrideDateStr || partialDateInput; 
      const completionDate = new Date(dateStr); 
      completionDate.setHours(12, 0, 0, 0); 
      const timestamp = completionDate.getTime(); 
      
      const newHistoryLog: SkuLog = { timestamp: timestamp, count: countToAdd, userId: currentUser.id }; 
      const newTotalCompleted = detailedTask.completedSku + countToAdd; 
      const isFinished = newTotalCompleted >= detailedTask.skuQuantity; 
      const newStatus: TaskStatus = isFinished ? 'done' : 'partial'; 
      
      const updatedTask = { 
          ...detailedTask, 
          completedSku: newTotalCompleted, 
          status: newStatus, 
          skuHistory: [...(detailedTask.skuHistory || []), newHistoryLog], 
          completedAt: isFinished ? timestamp : undefined, 
          lastTrackingStartTime: newStatus === 'done' ? undefined : detailedTask.lastTrackingStartTime 
      };

      setTasks(prev => prev.map(t => t.id === detailedTask.id ? updatedTask : t));
      setDetailedTask(updatedTask);
      await StorageService.saveTask(updatedTask);
      
      onNotify(`${currentUser.displayName} сдал ${countToAdd} SKU по задаче ${detailedTask.title}`); 
      setShowPartialModal(false); setPartialSkuInput(1); setPartialDateInput(getLocalDate()); 
  };

  const handleCompleteSpecificBarcode = async (barcode: string) => { 
      if (!detailedTask) return; 
      const isUndoing = detailedTask.completedBarcodes?.includes(barcode); 
      const countChange = isUndoing ? -1 : 1; 
      const newTotalCompleted = detailedTask.completedSku + countChange; 
      const isFinished = newTotalCompleted >= detailedTask.skuQuantity; 
      const newStatus: TaskStatus = isFinished ? 'done' : (newTotalCompleted > 0 ? 'partial' : 'doing'); 
      const timestamp = Date.now(); 
      const newHistoryLog: SkuLog = { timestamp: timestamp, count: countChange, userId: currentUser.id }; 
      
      const updatedTask = { 
          ...detailedTask, 
          completedSku: newTotalCompleted < 0 ? 0 : newTotalCompleted, 
          status: newStatus, 
          skuHistory: [...(detailedTask.skuHistory || []), newHistoryLog], 
          completedBarcodes: isUndoing ? (detailedTask.completedBarcodes || []).filter(b => b !== barcode) : [...(detailedTask.completedBarcodes || []), barcode], 
          completedAt: isFinished ? Date.now() : undefined, 
          lastTrackingStartTime: newStatus === 'done' ? undefined : detailedTask.lastTrackingStartTime 
      };

      setTasks(prev => prev.map(t => t.id === detailedTask.id ? updatedTask : t));
      setDetailedTask(updatedTask);
      await StorageService.saveTask(updatedTask);
  };

  const handleCopyBarcodes = () => { if (detailedTask && detailedTask.barcodes) navigator.clipboard.writeText(detailedTask.barcodes.join('\n')); };
  const handleCopySingleBarcode = (code: string) => { navigator.clipboard.writeText(code); };
  
  const handleExportCsv = () => { if (!detailedTask?.barcodes || detailedTask.barcodes.length === 0) return; const BOM = "\uFEFF"; const csvRows = detailedTask.barcodes.map(bc => `="${bc}"`); const csvContent = BOM + "Штрихкод\n" + csvRows.join("\n"); const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); const url = URL.createObjectURL(blob); link.setAttribute("href", url); link.setAttribute("download", `barcodes_${detailedTask.id}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); };
  
  const addSlide = async (taskId: string) => { 
      const task = tasks.find(t => t.id === taskId);
      if (task) {
          const updated = { 
              ...task, 
              skuQuantity: (task.skuQuantity || 0) + 1, 
              slides: [...(task.slides || []), { id: Date.now().toString(), number: (task.slides?.length || 0) + 1 }] 
          };
          setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
          if (detailedTask && detailedTask.id === taskId) setDetailedTask(updated);
          await StorageService.saveTask(updated);
      }
  };

  const handleAddComment = async (taskId: string) => { 
      if (!newComment.trim()) return; 
      const task = tasks.find(t => t.id === taskId);
      if (task) {
          const comment: Comment = { id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, authorId: currentUser.id, authorName: currentUser.displayName, text: newComment, timestamp: Date.now() }; 
          const updated = { ...task, comments: [...task.comments, comment] };
          setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
          if (activeTask && activeTask.id === taskId) setActiveTask(updated);
          await StorageService.saveTask(updated);
      }
      setNewComment(''); 
  };

  const handleResultImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { 
      const file = e.target.files?.[0]; 
      if (file && detailedTask) { 
          const reader = new FileReader(); 
          reader.onloadend = async () => { 
              const base64 = reader.result as string; 
              const updated = { ...detailedTask, resultImage: base64 };
              setTasks(prev => prev.map(t => t.id === detailedTask.id ? updated : t));
              setDetailedTask(updated);
              await StorageService.saveTask(updated);
          }; 
          reader.readAsDataURL(file); 
      } 
  };
  
  const startEditingTask = () => { if (!detailedTask) return; setEditTitle(detailedTask.title); setEditDesc(detailedTask.description); setEditProductId(detailedTask.productId || ''); setEditBarcodes(detailedTask.barcodes ? detailedTask.barcodes.join('\n') : ''); setEditSku(detailedTask.skuQuantity); setEditSourceLink(detailedTask.sourceLink || ''); setEditResultLink(detailedTask.resultLink || ''); setIsEditingTaskDetails(true); };
  
  const saveTaskDetails = async () => { 
      if (!detailedTask) return; 
      const barcodesArray = editBarcodes.match(/\d{13}/g) || []; 
      const updated = { 
          ...detailedTask, 
          title: editTitle, 
          description: editDesc, 
          productId: editProductId, 
          barcodes: barcodesArray.length > 0 ? barcodesArray : undefined, 
          skuQuantity: Number(editSku) || 1, 
          sourceLink: editSourceLink, 
          resultLink: editResultLink 
      };
      
      setTasks(prev => prev.map(t => t.id === detailedTask.id ? updated : t));
      setDetailedTask(updated);
      setIsEditingTaskDetails(false); 
      await StorageService.saveTask(updated);
  };

  const formatTime = (seconds: number) => { const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60; return `${h}ч ${m}м ${s}с`; };
  const formatCount = (n: number) => { if (n >= 1000) return (n / 1000).toFixed(1) + 'k'; return n.toString(); };

  const getCategoryIcon = (cat: TaskCategory) => {
      switch(cat) {
          case 'photo': return <Camera size={14}/>;
          case 'retouch': return <Brush size={14}/>;
          case 'infographic': return <PenTool size={14}/>; 
          case 'project': return <Briefcase size={14}/>;
          default: return <CheckCircle2 size={14}/>;
      }
  };

  const getCategoryName = (cat: TaskCategory) => {
      switch(cat) {
          case 'photo': return 'Фото';
          case 'retouch': return 'Ретушь';
          case 'infographic': return 'Инфографика';
          case 'project': return 'Проект';
          default: return 'Задача';
      }
  };

  const renderStatus = (status: TaskStatus) => {
      switch(status) {
          case 'doing': return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200 shadow-sm animate-pulse">В работе</span>;
          case 'slacking': return <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs font-bold border border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">Отдыхает</span>;
          case 'partial': return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">Частично</span>;
          case 'done': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">Готово</span>;
          case 'canceled': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200 flex items-center gap-1"><Ban size={10}/> Отказано</span>;
          default: return <span className="bg-gray-50 text-gray-500 px-3 py-1 rounded-full text-xs font-bold border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">Очередь</span>;
      }
  };

  const TabButton = ({ id, label, icon }: { id: FilterType, label: string, icon?: React.ReactNode }) => {
      const count = tasks.filter(t => {
          if (id === 'done') return t.status === 'done' || t.status === 'canceled';
          if (t.status === 'done' || t.status === 'canceled') return false;
          if (id === 'all') return true;
          return t.category === id;
      }).length;

      const active = viewFilter === id;

      return (
        <button 
            onClick={() => {
                setViewFilter(id);
            }} 
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                active ? 'bg-uzum-100 text-uzum-700 shadow-sm dark:bg-uzum-900 dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
        >
            {icon}
            {label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                active ? 'bg-uzum-600 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            }`}>
                {formatCount(count)}
            </span>
        </button>
      );
  };

  const filteredTasks = tasks.filter(t => {
    const statusMatch = viewFilter === 'done' 
        ? (t.status === 'done' || t.status === 'canceled')
        : (t.status !== 'done' && t.status !== 'canceled');
    if (!statusMatch) return false;

    let categoryMatch = true;
    if (viewFilter !== 'all' && viewFilter !== 'done') {
        categoryMatch = t.category === viewFilter;
    }
    if (!categoryMatch) return false;

    if (isSearchExpanded && searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const idMatch = t.title.toLowerCase().includes(query);
        const descMatch = t.description.toLowerCase().includes(query);
        const barcodeMatch = t.barcodes?.some(b => b.includes(query));
        if (!(idMatch || descMatch || barcodeMatch)) return false;
    }

    return true;
  });

  const getUser = (id: string) => users.find(u => u.id === id);

  return (
    <div className="p-6 max-w-7xl mx-auto font-travels pb-24">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
        <div className="shrink-0">
            <div className="flex items-center gap-3">
                <button 
                    onClick={onToggleMobileSidebar}
                    className="md:hidden p-2 bg-white dark:bg-gray-800 rounded-lg text-gray-500 shadow-sm"
                >
                    <Menu size={24}/>
                </button>

                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Задачи</h2>
                <button 
                    onClick={() => {
                        setShowNewTaskForm(true);
                        setNewTaskAssignees([currentUser.id]); // Reset to self on new open
                    }}
                    className="text-gray-400 hover:text-uzum-600 hover:bg-uzum-50 dark:hover:bg-uzum-900/30 p-1.5 rounded-full transition-all flex items-center justify-center"
                    title={isManager ? 'Дать задачу' : 'Создать задачу'}
                >
                    <Plus size={20} /> 
                </button>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">Управление потоком работ студии</p>
        </div>

        {/* Right Side - Search & Tabs */}
        <div className={`flex flex-wrap gap-2 items-center transition-all duration-300 ease-in-out ${isSearchExpanded ? 'w-full xl:w-auto xl:flex-1 xl:justify-end' : 'w-full xl:w-auto'}`}>
            {isSearchExpanded ? (
                <div className="flex items-center w-full bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700 shadow-sm animate-scale-in">
                    <Search size={20} className="text-gray-400 ml-3 shrink-0"/>
                    <input 
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Поиск..."
                        className="bg-transparent border-none outline-none px-3 py-2 text-sm text-gray-900 dark:text-white w-full"
                    />
                    <button 
                        onClick={() => {
                            setIsSearchExpanded(false);
                            setSearchQuery('');
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 transition shrink-0"
                    >
                        <X size={20}/>
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-2 w-full xl:w-auto">
                    <button 
                        onClick={() => setIsSearchExpanded(true)}
                        className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 hover:text-uzum-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-400 transition-all shadow-sm shrink-0"
                        title="Поиск"
                    >
                        <Search size={20}/>
                    </button>

                    <div className="bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap gap-1 flex-1 xl:flex-none">
                        <TabButton id="all" label="Все" />
                        <TabButton id="photo" label="Фото" icon={<Camera size={14}/>} />
                        <TabButton id="retouch" label="Ретушь" icon={<Brush size={14}/>} />
                        <TabButton id="infographic" label="Инфографика" icon={<PenTool size={14}/>} />
                        <TabButton id="project" label="Проекты" icon={<Briefcase size={14}/>} />
                        <div className="w-px bg-gray-200 dark:bg-gray-600 mx-1 h-6 self-center"></div>
                        <TabButton id="done" label="Архив" icon={<Archive size={14}/>} />
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Task Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredTasks.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-700 mb-4">
                    <Search className="text-gray-300 dark:text-gray-500 w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Задач не найдено
                </h3>
                <p className="text-gray-500 text-sm">В этой категории (или по запросу) пока пусто</p>
            </div>
        ) : (
             <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                                <th className="px-6 py-4">Задача / SKU</th>
                                <th className="px-6 py-4">Категория</th>
                                <th className="px-6 py-4">Статус</th>
                                <th className="px-6 py-4">Дедлайн</th>
                                <th className="px-6 py-4">Время</th>
                                <th className="px-6 py-4">Действия</th>
                                {(viewFilter === 'all' || viewFilter === 'done' || isSearchExpanded) && <th className="px-6 py-4">Исполнители</th>}
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                            {filteredTasks.map(task => {
                                const isOverdue = new Date(task.deadline).getTime() < Date.now() && task.status !== 'done' && task.status !== 'canceled';
                                const taskAssignees = getTaskAssignees(task);
                                const isAssignedToMe = taskAssignees.includes(currentUser.id);
                                const isCanceled = task.status === 'canceled';
                                
                                return (
                                <tr 
                                    key={task.id} 
                                    className={`hover:bg-uzum-50/30 dark:hover:bg-uzum-900/20 transition-colors group cursor-pointer ${isCanceled ? 'opacity-60 bg-red-50/20' : ''}`}
                                    onClick={() => {
                                        setDetailedTask(task);
                                        setIsEditingTaskDetails(false);
                                    }}
                                >
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-800 dark:text-gray-100 text-base flex items-center gap-2">
                                            {/* 1P BADGE - Moved to front */}
                                            {task.is1P && (
                                                <span 
                                                    className="inline-flex items-center justify-center bg-purple-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-md shadow-purple-500/40 animate-pulse border border-purple-400"
                                                    title="Товар 1P (First Party) - Товар выкуплен маркетплейсом"
                                                >
                                                    1P
                                                </span>
                                            )}
                                            
                                            <div className="text-gray-400 dark:text-gray-500">
                                                {getCategoryIcon(task.category)}
                                            </div>
                                            <span className={isCanceled ? 'line-through text-gray-500' : ''}>{task.title}</span>
                                            
                                            {task.infographicTariff && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase ${
                                                    task.infographicTariff === 'Premium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                                    task.infographicTariff === 'Standard' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                    'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                                                }`}>
                                                    {task.infographicTariff}
                                                </span>
                                            )}
                                            {task.resultImage && <FileImage size={14} className="text-uzum-500" />}
                                            {task.referenceImage && <LinkIcon size={14} className="text-blue-500" />}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold bg-white dark:bg-gray-600 px-2 py-0.5 rounded text-gray-600 dark:text-white border border-gray-200 dark:border-gray-500 shadow-sm">
                                                {task.completedSku} / {task.skuQuantity} SKU
                                            </span>
                                            <div className="text-gray-500 dark:text-gray-400 text-xs truncate max-w-xs">{task.description}</div>
                                        </div>
                                    </td>
                                    {/* ... rest of columns ... */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-medium">
                                            {getCategoryIcon(task.category)}
                                            <span className="capitalize">{getCategoryName(task.category)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-2 items-start" onClick={e => e.stopPropagation()}>
                                            {renderStatus(task.status)}
                                            
                                            {isManager && task.status !== 'done' && task.status !== 'canceled' && (
                                                <button 
                                                    type="button"
                                                    onClick={() => changeStatus(task, 'slacking', undefined)}
                                                    className="text-[10px] text-gray-400 hover:text-uzum-600 flex items-center gap-1 font-bold uppercase tracking-wide transition-colors"
                                                >
                                                    <Coffee size={10} /> Отдыхает
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-500 font-bold' : 'text-gray-600 dark:text-gray-300 font-medium'}`}>
                                            <Calendar size={14} />
                                            {new Date(task.deadline).toLocaleDateString()}
                                            {isOverdue && <AlertCircle size={14} />}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-gray-700 dark:text-gray-300 font-bold">
                                        {formatTime(task.timeSpentSeconds)}
                                    </td>
                                    
                                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                        {task.status === 'canceled' ? (
                                            <button 
                                                type="button"
                                                onClick={(e) => restoreTask(e, task.id)}
                                                className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                            >
                                                <RotateCcw size={12} /> Восстановить
                                            </button>
                                        ) : (
                                            (isAssignedToMe || isManager) && (
                                                <div className="flex gap-2">
                                                    {task.status !== 'doing' && task.status !== 'done' && task.status !== 'partial' && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => changeStatus(task, 'doing', undefined)}
                                                            className="bg-uzum-100 hover:bg-uzum-200 text-uzum-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                                        >
                                                            <Play size={12} fill="currentColor" /> Начать
                                                        </button>
                                                    )}
                                                    {(task.status === 'doing' || task.status === 'partial') && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleQuickCompleteClick(task)}
                                                            className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                                        >
                                                            <Check size={14} /> Завершить
                                                        </button>
                                                    )}
                                                    {task.status === 'done' && (
                                                        <span className="text-xs text-gray-400 italic">Закрыта</span>
                                                    )}
                                                </div>
                                            )
                                        )}
                                    </td>

                                    {(viewFilter === 'all' || viewFilter === 'done' || isSearchExpanded) && (
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex -space-x-2 overflow-hidden hover:space-x-1 transition-all">
                                                {taskAssignees.map(uid => {
                                                    const u = users.find(user => user.id === uid);
                                                    return (
                                                        <img 
                                                            key={uid}
                                                            src={u?.avatar || "https://picsum.photos/200"} 
                                                            className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800 object-cover cursor-pointer hover:z-10 hover:scale-110 transition"
                                                            title={u?.displayName || 'Unknown'}
                                                            onClick={() => onUserClick(uid)}
                                                        />
                                                    );
                                                })}
                                                {taskAssignees.length === 0 && <span className="text-gray-400 text-xs">-</span>}
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-right relative z-50" onClick={e => e.stopPropagation()}>
                                       <div className="flex justify-end gap-2 items-center">
                                            <button 
                                                type="button"
                                                onClick={() => setActiveTask(task)}
                                                className="text-gray-400 hover:text-uzum-600 transition-colors relative"
                                            >
                                                <MessageSquare size={20} />
                                                {task.comments.length > 0 && (
                                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                                        {task.comments.length}
                                                    </span>
                                                )}
                                            </button>
                                            
                                            <button 
                                                type="button"
                                                onClick={(e) => initiateDeleteTask(e, task)}
                                                className="text-gray-300 hover:text-red-500 transition-colors hover:scale-110 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                                                title="Удалить задачу"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                       </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
             </div>
        )}
      </div>

      {showNewTaskForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-full max-w-lg shadow-2xl animate-fade-in border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
                <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
                    {isManager ? <Briefcase className="text-uzum-600 dark:text-uzum-400"/> : <Plus className="text-uzum-600 dark:text-uzum-400"/>}
                    {isManager ? 'Дать задачу сотруднику' : 'Создать задачу'}
                </h3>
                <form onSubmit={handleCreateTask} className="space-y-4">
                    {/* ... other fields ... */}
                    <div className="bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl p-3 text-sm text-gray-500 dark:text-gray-300 text-center font-medium">
                        Номер заявки будет присвоен автоматически
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Категория</label>
                            <select 
                                value={newTaskCategory} 
                                onChange={e => setNewTaskCategory(e.target.value as TaskCategory)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:border-uzum-500 outline-none bg-white dark:bg-gray-700 font-medium text-gray-900 dark:text-white"
                            >
                                <option value="photo">Фото</option>
                                <option value="retouch">Ретушь</option>
                                <option value="infographic">Инфографика</option>
                                <option value="project">Проект</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Объем (SKU)</label>
                            <input 
                                required 
                                type="number" 
                                min="1"
                                value={newTaskSku} 
                                onChange={e => setNewTaskSku(parseInt(e.target.value))} 
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:border-uzum-500 outline-none font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* 1P CHECKBOX - IMPROVED UI */}
                    <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 transition-colors">
                        <input 
                            type="checkbox" 
                            id="1p-check"
                            checked={newTaskIs1P}
                            onChange={e => setNewTaskIs1P(e.target.checked)}
                            className="w-6 h-6 accent-purple-600 cursor-pointer"
                        />
                        <label htmlFor="1p-check" className="cursor-pointer flex-1">
                            <span className="font-extrabold text-purple-800 dark:text-purple-300 block text-base flex items-center gap-2">
                                <ShoppingBag size={18}/> Товар 1P (First Party)
                            </span>
                            <span className="text-xs text-purple-600 dark:text-purple-400 leading-tight block mt-1">
                                Товар выкуплен маркетплейсом (Собственность Uzum).
                            </span>
                        </label>
                    </div>

                    {/* ... rest of the form ... */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">ID Товара (Необяз.)</label>
                            <input 
                                type="text" 
                                value={newTaskProductId} 
                                onChange={e => setNewTaskProductId(e.target.value)} 
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:border-uzum-500 outline-none font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400"
                                placeholder="123456"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Штрихкоды (Необяз.)</label>
                            <textarea
                                value={newTaskBarcodes}
                                onChange={e => setNewTaskBarcodes(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:border-uzum-500 outline-none resize-none font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 text-xs"
                                rows={3}
                                placeholder="Каждый ШК с новой строки"
                            />
                        </div>
                    </div>

                    {newTaskCategory === 'infographic' && (
                        <div className="animate-fade-in">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Тариф Инфографики</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['Lite', 'Standard', 'Premium'] as InfographicTariff[]).map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setNewTaskTariff(t)}
                                        className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                                            newTaskTariff === t 
                                            ? 'bg-uzum-600 text-white border-uzum-600' 
                                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-uzum-300'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {(newTaskCategory === 'photo' || newTaskCategory === 'infographic') && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                {newTaskCategory === 'photo' ? 'Ссылка на исходники (Необяз.)' : 'Ссылка на материалы (Необяз.)'}
                            </label>
                            <input 
                                type="text"
                                value={newTaskSourceLink}
                                onChange={e => setNewTaskSourceLink(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:border-uzum-500 outline-none font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400"
                                placeholder="https://..."
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Техническое Задание (ТЗ)</label>
                        <textarea value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:border-uzum-500 outline-none resize-none font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400" rows={4} placeholder="Опишите требования подробно..."/>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Референс (Пример)</label>
                        <div className="relative">
                            <input 
                                type="file" 
                                ref={refInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleRefUpload}
                            />
                            <div 
                                onClick={() => refInputRef.current?.click()}
                                className="w-full px-4 py-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-uzum-600 transition"
                            >
                                {newTaskReference ? (
                                    <>
                                        <img src={newTaskReference} className="h-8 w-8 object-cover rounded" />
                                        <span className="text-sm font-bold text-green-600">Референс загружен</span>
                                    </>
                                ) : (
                                    <>
                                        <ImageIcon size={20}/>
                                        <span className="text-sm font-medium">Прикрепить референс</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Дедлайн</label>
                        <div className="flex gap-2 mb-2">
                            <button type="button" onClick={() => setDeadlineShortcut(0)} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300">Сегодня</button>
                            <button type="button" onClick={() => setDeadlineShortcut(1)} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300">Завтра</button>
                            <button type="button" onClick={() => setDeadlineShortcut(2)} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300">+2 дня</button>
                        </div>
                        <input required type="date" value={newTaskDeadline} onChange={e => setNewTaskDeadline(e.target.value)} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:border-uzum-500 outline-none font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400"/>
                    </div>
                    
                    <div className="relative">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Исполнители</label>
                        <button 
                            type="button"
                            onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-left flex items-center justify-between font-medium text-gray-900 dark:text-white"
                        >
                            <span className="truncate">
                                {newTaskAssignees.length === 0 
                                    ? "Выберите исполнителей" 
                                    : newTaskAssignees.map(id => users.find(u => u.id === id)?.displayName).join(', ')}
                            </span>
                            <ChevronDown size={16} className="text-gray-500"/>
                        </button>
                        
                        {showAssigneeDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto p-2">
                                {users.map(u => (
                                    <div 
                                        key={u.id}
                                        onClick={() => toggleAssigneeSelection(u.id)}
                                        className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition"
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${newTaskAssignees.includes(u.id) ? 'bg-uzum-600 border-uzum-600' : 'border-gray-300 dark:border-gray-500'}`}>
                                            {newTaskAssignees.includes(u.id) && <Check size={14} className="text-white"/>}
                                        </div>
                                        <img src={u.avatar} className="w-8 h-8 rounded-full object-cover"/>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{u.displayName}</p>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400">{u.role}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setShowNewTaskForm(false)} className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-bold">Отмена</button>
                        <button type="submit" className="flex-1 py-3 rounded-xl bg-uzum-600 text-white hover:bg-uzum-700 font-bold shadow-lg shadow-uzum-200">
                            {isManager ? 'Назначить' : 'Создать'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {detailedTask && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-uzum-50 dark:bg-uzum-900/30 p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
                      <div>
                          <div className="flex items-center gap-2 mb-1">
                             <p className="text-xs font-bold text-uzum-600 dark:text-white uppercase flex items-center gap-1">
                                 {getCategoryIcon(detailedTask.category)}
                                 Детали задачи
                             </p>
                             <span className="text-[10px] bg-white dark:bg-gray-700 border border-uzum-200 dark:border-gray-600 text-uzum-700 dark:text-white px-2 rounded-full font-bold">
                                {detailedTask.completedSku} / {detailedTask.skuQuantity} SKU
                             </span>
                             {detailedTask.is1P && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 font-black">1P</span>
                             )}
                             {detailedTask.infographicTariff && (
                                <span className="text-[10px] bg-white dark:bg-gray-700 border border-blue-200 dark:border-gray-600 text-blue-700 dark:text-blue-300 px-2 rounded-full font-bold uppercase">{detailedTask.infographicTariff}</span>
                             )}
                          </div>
                          {isEditingTaskDetails ? (
                              <input 
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="text-2xl font-extrabold text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-uzum-500 outline-none w-full"
                              />
                          ) : (
                              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">{detailedTask.title}</h2>
                          )}
                          <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <span>Создана: {new Date(detailedTask.createdAt).toLocaleDateString()}</span>
                              {detailedTask.completedAt && (
                                  <span className="text-green-600 dark:text-green-400 font-bold">
                                      Завершена: {new Date(detailedTask.completedAt).toLocaleDateString()}
                                  </span>
                              )}
                          </div>
                      </div>
                      <div className="flex gap-2">
                          {(isManager || currentUser.id === detailedTask.creatorId) && !isEditingTaskDetails && (
                              <button onClick={startEditingTask} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition text-gray-500 dark:text-gray-400 hover:text-uzum-600">
                                  <Pencil size={20}/>
                              </button>
                          )}
                          <button onClick={() => setDetailedTask(null)} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">
                              <X size={24}/>
                          </button>
                      </div>
                  </div>

                  <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                          
                          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                              <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-2">
                                      <Cloud size={14}/> {detailedTask.category === 'infographic' ? 'Материалы (Ссылка)' : 'Исходники (Ссылка)'}
                                  </span>
                              </div>
                              {isEditingTaskDetails ? (
                                  <input 
                                    type="text"
                                    value={editSourceLink}
                                    onChange={(e) => setEditSourceLink(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded px-2 py-1 text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
                                    placeholder="https://disk.yandex.ru/..."
                                  />
                              ) : (
                                  detailedTask.sourceLink ? (
                                      <a 
                                        href={detailedTask.sourceLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 text-sm font-medium break-all"
                                      >
                                          {detailedTask.sourceLink} <ExternalLink size={12}/>
                                      </a>
                                  ) : (
                                      <span className="text-xs text-gray-400 italic">Ссылка не указана</span>
                                  )
                              )}
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                                  <div className="flex justify-between items-center mb-2">
                                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-2">
                                          <Tag size={14}/> ID Товара
                                      </span>
                                  </div>
                                  {isEditingTaskDetails ? (
                                      <input 
                                        type="text"
                                        value={editProductId}
                                        onChange={(e) => setEditProductId(e.target.value)}
                                        className="w-full bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
                                        placeholder="ID"
                                      />
                                  ) : (
                                      <span className="font-mono font-bold text-gray-800 dark:text-white">
                                          {detailedTask.productId || "ID отсутствует"}
                                      </span>
                                  )}
                              </div>
                              
                              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                                  <div className="flex justify-between items-center mb-2">
                                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-2">
                                          <Barcode size={14}/> {detailedTask.barcodes?.some(b => b.includes('Работа')) ? 'Список работ' : 'Штрихкоды'}
                                      </span>
                                      {!isEditingTaskDetails && detailedTask.barcodes && detailedTask.barcodes.length > 0 && (
                                          <div className="flex gap-2">
                                              <button 
                                                onClick={handleExportCsv} 
                                                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition"
                                                title="Скачать Excel (CSV)"
                                              >
                                                  <FileSpreadsheet size={16}/>
                                              </button>
                                              <button 
                                                onClick={handleCopyBarcodes} 
                                                className="text-uzum-600 hover:text-uzum-800 dark:text-uzum-400 dark:hover:text-uzum-300 transition"
                                                title="Копировать все"
                                              >
                                                  <Copy size={16}/>
                                              </button>
                                          </div>
                                      )}
                                  </div>
                                  {isEditingTaskDetails ? (
                                      <div className="space-y-2">
                                          <textarea 
                                            value={editBarcodes}
                                            onChange={(e) => setEditBarcodes(e.target.value)}
                                            className="w-full bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded px-2 py-1 text-xs font-mono text-gray-900 dark:text-white h-24"
                                            placeholder="Штрихкоды с новой строки"
                                          />
                                          <div className="flex justify-between items-center">
                                              <label className="text-xs font-bold text-gray-500 dark:text-gray-400">SKU Объем:</label>
                                              <input 
                                                type="number"
                                                value={editSku}
                                                onChange={(e) => setEditSku(parseInt(e.target.value))}
                                                className="w-20 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
                                              />
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
                                          {detailedTask.barcodes && detailedTask.barcodes.length > 0 ? (
                                              detailedTask.barcodes.map((bc, i) => {
                                                  const isBarcodeDone = detailedTask.completedBarcodes?.includes(bc);
                                                  return (
                                                  <div key={i} className={`group flex justify-between items-center px-2 py-1 bg-white dark:bg-gray-600 rounded border transition ${isBarcodeDone ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-500 hover:border-uzum-400 dark:hover:border-uzum-500'}`}>
                                                      <span className={`text-xs font-mono ${isBarcodeDone ? 'text-green-700 dark:text-green-400 font-bold line-through' : 'text-gray-700 dark:text-gray-200'}`}>{bc}</span>
                                                      <div className="flex gap-2">
                                                          {(currentUser.id === detailedTask.assigneeId || isManager) && (
                                                              <button
                                                                onClick={() => handleCompleteSpecificBarcode(bc)}
                                                                className={`transition p-1 rounded ${isBarcodeDone ? 'text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'text-gray-300 hover:text-green-500 dark:hover:text-green-400'}`}
                                                                title={isBarcodeDone ? "Отменить сдачу" : "Сдать"}
                                                              >
                                                                  <CheckSquare size={14}/>
                                                              </button>
                                                          )}
                                                          <button 
                                                            onClick={() => handleCopySingleBarcode(bc)}
                                                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-uzum-600 dark:hover:text-white transition"
                                                            title="Копировать"
                                                          >
                                                              <Copy size={12}/>
                                                          </button>
                                                      </div>
                                                  </div>
                                              )})
                                          ) : (
                                              <span className="text-xs text-gray-400 italic">ШК отсутствуют</span>
                                          )}
                                      </div>
                                  )}
                              </div>
                          </div>

                          <div>
                              <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Техническое задание (ТЗ)</label>
                              {isEditingTaskDetails ? (
                                  <textarea 
                                    value={editDesc}
                                    onChange={(e) => setEditDesc(e.target.value)}
                                    className="w-full h-32 bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-100 dark:border-gray-600 text-sm leading-relaxed text-gray-900 dark:text-white"
                                  />
                              ) : (
                                  <div className="text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-100 dark:border-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                                      {detailedTask.description ? renderTextWithLinks(detailedTask.description) : 'ТЗ отсутствует'}
                                  </div>
                              )}
                          </div>
                          
                          {detailedTask.referenceImage && (
                              <div>
                                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Референс (Пример)</label>
                                  <div className="relative group">
                                     <img src={detailedTask.referenceImage} className="w-full h-40 object-contain bg-gray-100 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                                     <a 
                                        href={detailedTask.referenceImage} 
                                        download="reference.png"
                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold transition rounded-xl"
                                     >
                                         <Download className="mr-2"/> Скачать
                                     </a>
                                  </div>
                              </div>
                          )}

                          <div className="space-y-3">
                              <label className="text-xs font-bold text-gray-400 uppercase block">Участники</label>
                              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition border border-transparent hover:border-gray-100 dark:hover:border-gray-600">
                                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                                     {getUser(detailedTask.creatorId)?.avatar ? (
                                         <img src={getUser(detailedTask.creatorId)?.avatar} className="w-full h-full object-cover"/>
                                     ) : <UserIcon size={20} className="text-gray-400"/>}
                                  </div>
                                  <div>
                                      <p className="font-bold text-sm text-gray-900 dark:text-white">{getUser(detailedTask.creatorId)?.displayName}</p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">Создатель</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition border border-transparent hover:border-gray-100 dark:hover:border-gray-600">
                                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                                     {getUser(detailedTask.assigneeId)?.avatar ? (
                                         <img src={getUser(detailedTask.assigneeId)?.avatar} className="w-full h-full object-cover"/>
                                     ) : <UserIcon size={20} className="text-gray-400"/>}
                                  </div>
                                  <div>
                                      <p className="text-xs text-gray-400 font-medium">Исполнитель</p>
                                      <p className="font-bold text-sm text-gray-900 dark:text-gray-200">{getUser(detailedTask.assigneeId)?.displayName || 'Неизвестно'}</p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {detailedTask.category !== 'photo' && (
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 flex flex-col h-full">
                              <h4 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                  <ImageIcon size={20} className="text-uzum-600 dark:text-uzum-400"/>
                                  Утвержденный дизайн
                              </h4>
                              {detailedTask.resultImage ? (
                                  <div className="flex-1 flex flex-col items-center justify-center relative group">
                                      <img src={detailedTask.resultImage} className="max-h-60 rounded-lg shadow-sm object-contain bg-white dark:bg-gray-800" alt="Result"/>
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3 rounded-lg">
                                          <a href={detailedTask.resultImage} download={`result_${detailedTask.id}.png`} className="p-3 bg-white rounded-full text-gray-800 hover:text-uzum-600 transition">
                                              <Download size={20}/>
                                          </a>
                                          {(currentUser.id === detailedTask.assigneeId || isManager) && (
                                              <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-white rounded-full text-gray-800 hover:text-uzum-600 transition">
                                                  <Upload size={20}/>
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              ) : (
                                  <div className="flex-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center text-gray-400 p-8 text-center hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer" onClick={() => (currentUser.id === detailedTask.assigneeId || isManager) && fileInputRef.current?.click()}>
                                      <FileImage size={48} className="mb-2 opacity-50"/>
                                      <p className="font-medium text-sm">Нет прикрепленных изображений</p>
                                      {(currentUser.id === detailedTask.assigneeId || isManager) && (
                                          <button className="mt-4 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 px-4 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-uzum-600 hover:border-uzum-300 transition shadow-sm">
                                              Загрузить результат
                                          </button>
                                      )}
                                  </div>
                              )}
                              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleResultImageUpload}/>
                          </div>
                      )}
                  </div>

                  <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-3">
                      {isEditingTaskDetails ? (
                          <button onClick={saveTaskDetails} className="bg-uzum-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-uzum-700 transition flex items-center gap-2 shadow-lg">
                              <Save size={18}/> Сохранить изменения
                          </button>
                      ) : (
                          <>
                            {(currentUser.id === detailedTask.assigneeId || isManager) && detailedTask.status !== 'done' && (
                                <>
                                    {detailedTask.status !== 'doing' && detailedTask.status !== 'partial' && (
                                        <button onClick={() => changeStatus(detailedTask, 'doing')} className="bg-uzum-100 hover:bg-uzum-200 text-uzum-700 dark:bg-uzum-900/30 dark:text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2">
                                            <Play size={18}/> Начать
                                        </button>
                                    )}
                                    <button onClick={() => setShowPartialModal(true)} className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-6 py-3 rounded-xl font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition flex items-center gap-2">
                                        <CheckSquare size={18}/> Сдать часть SKU
                                    </button>
                                    {(detailedTask.status === 'doing' || detailedTask.status === 'partial') && (
                                        <button onClick={() => handleQuickCompleteClick(detailedTask)} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition flex items-center gap-2">
                                            <Check size={18}/> Завершить задачу
                                        </button>
                                    )}
                                </>
                            )}
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}

      {completionTask && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700">
                  <div className="flex justify-center mb-4 text-green-500 dark:text-green-400">
                      <CheckCircle2 size={48} />
                  </div>
                  <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">Завершение задачи</h3>
                  <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
                      Подтвердите завершение задачи <strong>"{completionTask.title}"</strong>.<br/>
                      Укажите фактическую дату выполнения.
                  </p>

                  <div className="mb-6">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 text-center">Дата сдачи</label>
                      <input 
                          type="date" 
                          value={partialDateInput}
                          onChange={(e) => setPartialDateInput(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:border-uzum-500 outline-none text-center font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700"
                      />
                  </div>

                  <div className="flex gap-3">
                      <button 
                          onClick={() => setCompletionTask(null)}
                          className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                          Отмена
                      </button>
                      <button 
                          onClick={confirmCompletion}
                          className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition"
                      >
                          Подтвердить
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showDeleteModal && taskToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex justify-center mb-4 text-red-500 dark:text-red-400">
                    <Trash2 size={48} />
                </div>
                <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">Удаление задачи</h3>
                <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
                    Вы уверены, что хотите удалить задачу <strong>"{taskToDelete.title}"</strong>?
                </p>

                <div 
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl mb-6 cursor-pointer border border-gray-100 dark:border-gray-700 hover:border-uzum-200 dark:hover:border-uzum-500 transition"
                    onClick={() => setDeleteToArchive(!deleteToArchive)}
                >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all flex-shrink-0 ${deleteToArchive ? 'bg-uzum-600 border-uzum-600' : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'}`}>
                        {deleteToArchive && <Check size={14} className="text-white"/>}
                    </div>
                    <div className="text-left">
                        <span className="text-sm font-bold text-gray-800 dark:text-white block">Поместить в архив</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 block">Статус будет "Отказано"</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => {
                            setShowDeleteModal(false);
                            setTaskToDelete(null);
                        }}
                        className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                        Отмена
                    </button>
                    <button 
                        onClick={executeDeleteTask}
                        className={`flex-1 py-3 rounded-xl text-white font-bold transition shadow-lg ${deleteToArchive ? 'bg-uzum-600 hover:bg-uzum-700 shadow-uzum-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}
                    >
                        {deleteToArchive ? 'В архив' : 'Удалить'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {activeTask && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setActiveTask(null)}>
            <div className="w-full max-w-md bg-white dark:bg-gray-800 h-full shadow-2xl p-6 flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <MessageSquare className="text-uzum-600"/> Комментарии
                    </h3>
                    <button onClick={() => setActiveTask(null)}><X size={24} className="text-gray-400 hover:text-gray-600"/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                    {activeTask.comments.length === 0 ? (
                        <p className="text-center text-gray-400 my-10">Нет комментариев</p>
                    ) : (
                        activeTask.comments.map(c => (
                            <div key={c.id} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-baseline mb-1">
                                    <span className="font-bold text-sm text-gray-900 dark:text-white">{c.authorName}</span>
                                    <span className="text-[10px] text-gray-400">{new Date(c.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{c.text}</p>
                            </div>
                        ))
                    )}
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleAddComment(activeTask.id); }} className="relative">
                    <input 
                        type="text" 
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Написать комментарий..."
                        className="w-full pl-4 pr-12 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl outline-none text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-uzum-500"
                    />
                    <button 
                        type="submit" 
                        disabled={!newComment.trim()}
                        className="absolute right-2 top-2 p-1.5 bg-uzum-600 text-white rounded-lg hover:bg-uzum-700 disabled:opacity-50 disabled:hover:bg-uzum-600"
                    >
                        <Send size={16}/>
                    </button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
};

export default TaskBoard;
