
import React, { useState, useEffect, useMemo } from 'react';
import { User, Task, TaskCategory } from '../types';
import { StorageService } from '../services/storage';
import { X, PieChart, CheckCircle2, Layers, ChevronDown, ChevronUp, Download, Calendar } from 'lucide-react';

interface StatisticsModalProps {
  targetUser: User;
  isOpen: boolean;
  onClose: () => void;
}

type DateRange = 'today' | 'week' | 'month' | 'custom';
type Tab = 'overview' | 'history';

interface DayStats {
    date: string; // ISO date YYYY-MM-DD
    totalSku: number;
    tasks: {
        category: TaskCategory;
        tariff?: string;
        sku: number;
        timeSpent: number;
    }[];
}

const StatisticsModal: React.FC<StatisticsModalProps> = ({ targetUser, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [activeRange, setActiveRange] = useState<DateRange>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Accordion state for history
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const isNatalya = targetUser.login === 'Natalya Pak';

  useEffect(() => {
      if (isOpen) {
          const loadData = async () => {
              setTasks(await StorageService.getTasks());
              setUsers(await StorageService.getUsers());
          };
          loadData();
          // Set default custom range to current month
          const now = new Date();
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
          setCustomStart(firstDay.toISOString().split('T')[0]);
          setCustomEnd(new Date().toISOString().split('T')[0]);
      }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Filter Logic
  const getDateRange = () => {
      const now = new Date();
      let start = 0;
      let end = now.getTime();

      switch (activeRange) {
          case 'today': {
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);
              start = todayStart.getTime();
              const todayEnd = new Date();
              todayEnd.setHours(23, 59, 59, 999);
              end = todayEnd.getTime();
              break;
          }
          case 'week': {
              const startOfWeek = new Date(now);
              const day = startOfWeek.getDay() || 7; // Mon=1, Sun=7
              if (day !== 1) {
                  startOfWeek.setDate(now.getDate() - (day - 1));
              }
              startOfWeek.setHours(0, 0, 0, 0);
              start = startOfWeek.getTime();
              break;
          }
          case 'month': {
              const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              startOfMonth.setHours(0, 0, 0, 0);
              start = startOfMonth.getTime();
              break;
          }
          case 'custom': {
              if (customStart) {
                  const s = new Date(customStart);
                  s.setHours(0, 0, 0, 0);
                  start = s.getTime();
              }
              if (customEnd) {
                  const e = new Date(customEnd);
                  e.setHours(23, 59, 59, 999);
                  end = e.getTime();
              }
              break;
          }
      }
      return { start, end };
  };

  const { start, end } = getDateRange();

  // Helper to get local YYYY-MM-DD from timestamp
  const getLocalDateString = (timestamp: number) => {
      const d = new Date(timestamp);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  // 2. Aggregate Data
  const aggregatedHistory = useMemo<DayStats[]>(() => {
      const historyMap: Record<string, DayStats> = {};

      tasks.forEach(task => {
          if (!task.skuHistory) return;

          task.skuHistory.forEach(log => {
              if (log.userId !== targetUser.id) return;
              if (log.timestamp < start || log.timestamp > end) return;

              // Use local date string instead of ISO UTC to prevent timezone shift issues
              const dateKey = getLocalDateString(log.timestamp);
              
              if (!historyMap[dateKey]) {
                  historyMap[dateKey] = { date: dateKey, totalSku: 0, tasks: [] };
              }

              historyMap[dateKey].totalSku += log.count;

              const existingCatEntry = historyMap[dateKey].tasks.find(t => t.category === task.category && t.tariff === task.infographicTariff);
              
              const timePerSku = task.timeSpentSeconds / (task.skuQuantity || 1);
              const logTime = Math.round(timePerSku * log.count);

              if (existingCatEntry) {
                  existingCatEntry.sku += log.count;
                  existingCatEntry.timeSpent += logTime;
              } else {
                  historyMap[dateKey].tasks.push({
                      category: task.category,
                      tariff: task.infographicTariff,
                      sku: log.count,
                      timeSpent: logTime
                  });
              }
          });
      });

      return Object.values(historyMap).sort((a, b) => b.date.localeCompare(a.date));
  }, [tasks, targetUser, start, end]);

  // Total stats for the period
  const totalSkuPeriod = aggregatedHistory.reduce((acc, day) => acc + day.totalSku, 0);
  const totalTimePeriod = aggregatedHistory.reduce((acc, day) => acc + day.tasks.reduce((t, task) => t + task.timeSpent, 0), 0);
  const totalTasksClosed = tasks.filter(t => t.status === 'done' && t.assigneeId === targetUser.id && t.completedAt && t.completedAt >= start && t.completedAt <= end).length;

  const categoryStats = useMemo(() => {
      const stats: Record<string, number> = {};
      aggregatedHistory.forEach(day => {
          day.tasks.forEach(t => {
              const key = t.category;
              stats[key] = (stats[key] || 0) + t.sku;
          });
      });
      return stats;
  }, [aggregatedHistory]);

  const formatTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      if (h > 0) return `${h}ч ${m}м`;
      return `${m}м`;
  };

  const getCategoryLabel = (cat: string, tariff?: string) => {
      let label = '';
      switch(cat) {
          case 'photo': label = 'Фото'; break;
          case 'retouch': label = 'Ретушь'; break;
          case 'infographic': label = 'Инфографика'; break;
          case 'project': label = 'Проект'; break;
          default: label = cat;
      }
      if (tariff) label += ` (${tariff})`;
      return label;
  };

  // Safe label for PDF (English/Translit)
  const getSafeCategoryLabel = (cat: string, tariff?: string) => {
      let label = '';
      switch(cat) {
          case 'photo': label = 'Photo'; break;
          case 'retouch': label = 'Retouch'; break;
          case 'infographic': label = 'Infographic'; break;
          case 'project': label = 'Project'; break;
          default: label = cat;
      }
      if (tariff) label += ` (${tariff})`;
      return label;
  };

  const toggleDate = (date: string) => {
      const newSet = new Set(expandedDates);
      if (newSet.has(date)) newSet.delete(date);
      else newSet.add(date);
      setExpandedDates(newSet);
  };

  const generatePDF = () => {
      // Fix for accessing jspdf from window
      const jsPDF = (window as any).jspdf?.jsPDF;
      if (!jsPDF) {
          alert('Ошибка библиотеки PDF. Попробуйте обновить страницу.');
          return;
      }
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text(`Report: ${targetUser.login}`, 14, 20);
      
      doc.setFontSize(12);
      doc.text(`Period: ${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`, 14, 30);
      doc.text(`Total SKU: ${totalSkuPeriod}`, 14, 38);

      const tableBody = aggregatedHistory.map(day => [
          day.date,
          day.totalSku,
          day.tasks.map(t => `${getSafeCategoryLabel(t.category, t.tariff)}: ${t.sku}`).join('\n')
      ]);

      (doc as any).autoTable({
          startY: 45,
          head: [['Date', 'Total SKU', 'Details']],
          body: tableBody,
      });

      doc.save(`Report_${targetUser.id}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in font-travels">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gray-50 dark:bg-gray-700/50 p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
                <img src={targetUser.avatar} className="w-14 h-14 rounded-full border-2 border-white dark:border-gray-600 shadow-md object-cover" alt=""/>
                <div>
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">{targetUser.displayName}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        {targetUser.role} • Статистика
                    </p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition text-gray-400 hover:text-gray-800 dark:hover:text-white">
                <X size={24}/>
            </button>
        </div>

        {/* Tab & Filter Controls */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col gap-4 shrink-0">
             <div className="flex justify-between items-center">
                 <div className="flex gap-2">
                     <button 
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-uzum-100 text-uzum-700 dark:bg-uzum-900 dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                     >
                         <PieChart size={16} className="inline mr-2"/> Обзор
                     </button>
                     <button 
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-uzum-100 text-uzum-700 dark:bg-uzum-900 dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                     >
                         <Calendar size={16} className="inline mr-2"/> История по дням
                     </button>
                 </div>
                 
                 <button 
                    onClick={generatePDF} 
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-bold text-gray-700 dark:text-white transition"
                 >
                     <Download size={16}/> Скачать PDF
                 </button>
             </div>

             <div className="flex flex-wrap items-center gap-2">
                 <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                     {(['week', 'month', 'custom'] as DateRange[]).map(range => (
                         <button
                            key={range}
                            onClick={() => setActiveRange(range)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeRange === range 
                                ? 'bg-white dark:bg-gray-600 text-uzum-600 dark:text-white shadow-sm' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                         >
                             {range === 'week' && 'Неделя'}
                             {range === 'month' && 'Месяц'}
                             {range === 'custom' && 'Период'}
                         </button>
                     ))}
                 </div>

                 {activeRange === 'custom' && (
                     <div className="flex items-center gap-2 animate-fade-in">
                         <input 
                            type="date" 
                            value={customStart} 
                            onChange={e => setCustomStart(e.target.value)} 
                            className="px-2 py-1.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-xs font-medium outline-none focus:border-uzum-500 text-gray-900 dark:text-white"
                         />
                         <span className="text-gray-400">-</span>
                         <input 
                            type="date" 
                            value={customEnd} 
                            onChange={e => setCustomEnd(e.target.value)} 
                            className="px-2 py-1.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-xs font-medium outline-none focus:border-uzum-500 text-gray-900 dark:text-white"
                         />
                     </div>
                 )}
             </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col">
            {activeTab === 'overview' ? (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg"><Layers size={20}/></div>
                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Всего SKU</span>
                            </div>
                            <p className="text-4xl font-black text-gray-900 dark:text-white">{totalSkuPeriod}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg"><CheckCircle2 size={20}/></div>
                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Закрыто задач</span>
                            </div>
                            <p className="text-4xl font-black text-gray-900 dark:text-white">{totalTasksClosed}</p>
                        </div>
                    </div>

                    {/* Bars */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">По категориям</h3>
                        <div className="space-y-4">
                            {Object.entries(categoryStats).map(([cat, count]) => (
                                <div key={cat}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">{getCategoryLabel(cat)}</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{count} SKU</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                                        <div className="bg-uzum-600 h-2.5 rounded-full" style={{ width: `${totalSkuPeriod > 0 ? Math.min(100, (Number(count) / totalSkuPeriod) * 100) : 0}%` }}></div>
                                    </div>
                                </div>
                            ))}
                            {Object.keys(categoryStats).length === 0 && <p className="text-gray-400 text-sm">Нет данных за этот период.</p>}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-3 flex-1">
                    {aggregatedHistory.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            <Calendar size={48} className="mx-auto mb-2 opacity-50"/>
                            <p>За выбранный период активности не найдено</p>
                        </div>
                    ) : (
                        aggregatedHistory.map((day, idx) => {
                            const isExpanded = expandedDates.has(day.date);
                            const totalTime = day.tasks.reduce((a, b) => a + b.timeSpent, 0);

                            return (
                                <div key={day.date} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                    <div 
                                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                                        onClick={() => toggleDate(day.date)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-gray-400 uppercase">{new Date(day.date).toLocaleString('ru', { month: 'short' })}</p>
                                                <p className="text-xl font-black text-gray-900 dark:text-white">{new Date(day.date).getDate()}</p>
                                            </div>
                                            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 dark:text-white">{targetUser.displayName}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Сделано: <span className="font-bold text-uzum-600 dark:text-uzum-400">{day.totalSku} SKU</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-xs text-gray-400">Время</p>
                                                <p className="text-sm font-mono font-bold text-gray-700 dark:text-gray-300">{formatTime(totalTime)}</p>
                                            </div>
                                            {isExpanded ? <ChevronUp size={20} className="text-gray-400"/> : <ChevronDown size={20} className="text-gray-400"/>}
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700 p-4 animate-fade-in">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
                                                        <th className="pb-2 pl-2">Категория</th>
                                                        <th className="pb-2">SKU</th>
                                                        <th className="pb-2 text-right pr-2">Время</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                    {day.tasks.map((t, i) => (
                                                        <tr key={i}>
                                                            <td className="py-2 pl-2 font-medium text-gray-700 dark:text-gray-200">
                                                                {getCategoryLabel(t.category, t.tariff)}
                                                            </td>
                                                            <td className="py-2 font-bold text-uzum-600 dark:text-uzum-400">{t.sku}</td>
                                                            <td className="py-2 text-right pr-2 font-mono text-gray-500">{formatTime(t.timeSpent)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                    
                    {/* Monthly Summary Footer */}
                    {aggregatedHistory.length > 0 && (
                        <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg mt-4 flex justify-between items-center animate-slide-in-right">
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Итого за период:</span>
                            <div className="text-right">
                                <span className="block text-2xl font-black text-uzum-600 dark:text-uzum-400">{totalSkuPeriod} SKU</span>
                                <span className="block text-xs font-mono text-gray-400">{formatTime(totalTimePeriod)}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default StatisticsModal;
