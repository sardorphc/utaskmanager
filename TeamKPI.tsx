
import React, { useState, useEffect, useMemo } from 'react';
import { User, Task } from '../types';
import { StorageService } from '../services/storage';
import { BarChart2, CheckCircle2, AlertCircle, Calendar, ArrowLeft, Filter, FileSpreadsheet, Download } from 'lucide-react';
import StatisticsModal from './StatisticsModal';
import * as XLSX from 'xlsx';

interface TeamKPIProps {
  onClose: () => void;
}

type ViewMode = 'status' | 'history' | 'report';

const TeamKPI: React.FC<TeamKPIProps> = ({ onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedUserStats, setSelectedUserStats] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('status');
  
  const getLocalDate = (d = new Date()) => {
      try {
          if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
          const offset = d.getTimezoneOffset() * 60000;
          return new Date(d.getTime() - offset).toISOString().split('T')[0];
      } catch (e) {
          return new Date().toISOString().split('T')[0];
      }
  };

  const [rangeStart, setRangeStart] = useState<string>(getLocalDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))); 
  const [rangeEnd, setRangeEnd] = useState<string>(getLocalDate()); 
  
  const [selectedUserId, setSelectedUserId] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
        setUsers(await StorageService.getUsers());
        setTasks(await StorageService.getTasks());
    };
    fetchData();
    
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatsForUserRange = (userId: string, startStr: string, endStr: string) => {
      const dateStart = new Date(startStr).setHours(0,0,0,0);
      const dateEnd = new Date(endStr).setHours(23,59,59,999);
      
      let totalSku = 0;
      
      tasks.forEach(task => {
          if (!task.skuHistory) return;
          task.skuHistory.forEach(log => {
              if (log.userId === userId && log.timestamp >= dateStart && log.timestamp <= dateEnd) {
                  totalSku += log.count;
              }
          });
      });
      return { sku: totalSku };
  };

  const getStatusText = (user: User) => {
      const now = Date.now();
      const lastActive = user.lastActive || 0;
      const diff = now - lastActive;
      const isOnline = diff < 5 * 60 * 1000; 

      if (isOnline) {
          if (user.onlineSince) {
              const onlineSinceDate = new Date(user.onlineSince);
              return { 
                  text: `Онлайн с ${onlineSinceDate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`,
                  color: 'text-green-600 dark:text-green-400',
                  bg: 'bg-green-50 dark:bg-green-900/20'
              };
          }
          return { text: 'Онлайн', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' };
      } else {
          if (lastActive === 0) return { text: 'Не был в сети', color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' };
          const minsAgo = Math.floor(diff / 60000);
          if (minsAgo < 60) return { text: `Был(а) ${minsAgo} мин. назад`, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' };
          const hoursAgo = Math.floor(minsAgo / 60);
          if (hoursAgo < 24) return { text: `Был(а) ${hoursAgo} ч. назад`, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' };
          return { text: `Был(а) ${new Date(lastActive).toLocaleDateString()}`, color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' };
      }
  };

  const getDaysInRange = (start: string, end: string) => {
      try {
          const s = new Date(start);
          const e = new Date(end);
          if (isNaN(s.getTime()) || isNaN(e.getTime())) return [];
          const days = [];
          for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
              days.push(new Date(d));
          }
          return days;
      } catch (e) {
          return [];
      }
  };

  const getRangeBreakdown = (user: User) => {
      const days = getDaysInRange(rangeStart, rangeEnd);
      
      const dailyBreakdown = days.map(dateObj => {
          const dateStr = getLocalDate(dateObj);
          const stats = getStatsForUserRange(user.id, dateStr, dateStr); 
          return {
              day: dateObj.getDate(),
              date: dateObj,
              sku: stats.sku,
              isWeekend: dateObj.getDay() === 0 || dateObj.getDay() === 6
          };
      });

      const totalSku = dailyBreakdown.reduce((acc, curr) => acc + curr.sku, 0);
      return { totalSku, dailyBreakdown };
  };

  const getDetailedReportData = () => {
      const dateStart = new Date(rangeStart).setHours(0,0,0,0);
      const dateEnd = new Date(rangeEnd).setHours(23,59,59,999);
      
      const reportRows: any[] = [];

      tasks.forEach(task => {
          if (!task.skuHistory) return;
          task.skuHistory.forEach(log => {
              if (log.timestamp >= dateStart && log.timestamp <= dateEnd) {
                  // Filter by user if selected
                  if (selectedUserId !== 'all' && log.userId !== selectedUserId) return;

                  const user = users.find(u => u.id === log.userId);
                  const timeSpent = task.timeSpentSeconds > 0 
                      ? Math.round(task.timeSpentSeconds / (task.skuQuantity || 1) * log.count) 
                      : 0;

                  reportRows.push({
                      date: new Date(log.timestamp).toLocaleDateString(),
                      userName: user?.displayName || 'Unknown',
                      taskTitle: task.title,
                      category: task.category,
                      tariff: task.infographicTariff || '-',
                      is1P: task.is1P ? 'Да' : 'Нет',
                      skuCount: log.count,
                      timeSeconds: timeSpent
                  });
              }
          });
      });

      return reportRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const formatTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      if (h > 0) return `${h}ч ${m}м`;
      return `${m}м`;
  };

  const exportToExcel = () => {
      const data = getDetailedReportData();
      const excelRows = data.map(r => ({
          'Дата': r.date,
          'Сотрудник': r.userName,
          'Задача': r.taskTitle,
          'Категория': r.category,
          'Тариф': r.tariff,
          '1P (First Party)': r.is1P,
          'SKU': r.skuCount,
          'Время': formatTime(r.timeSeconds)
      }));

      const ws = XLSX.utils.json_to_sheet(excelRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Отчет");
      XLSX.writeFile(wb, `Uzum_Report_${rangeStart}_${rangeEnd}.xlsx`);
  };

  const setPresetRange = (type: 'month' | 'today') => {
      if (type === 'today') {
          const today = getLocalDate();
          setRangeStart(today);
          setRangeEnd(today);
      } else {
          const now = new Date();
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
          const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          setRangeStart(getLocalDate(firstDay));
          setRangeEnd(getLocalDate(lastDay));
      }
  };

  const calculateBusinessDaysInRange = () => {
      const days = getDaysInRange(rangeStart, rangeEnd);
      return days.filter(d => d.getDay() !== 0 && d.getDay() !== 6).length;
  };
  const rangeTarget = calculateBusinessDaysInRange() * 50; 

  const filteredUsers = selectedUserId === 'all' 
      ? users.filter(u => u.login !== 'Natalya Pak') 
      : users.filter(u => u.id === selectedUserId);

  const reportData = viewMode === 'report' ? getDetailedReportData() : [];

  return (
    <>
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 animate-fade-in font-travels">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center shadow-sm shrink-0">
            <h2 className="text-xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition text-gray-500">
                    <ArrowLeft size={24}/>
                </button>
                <span className="flex items-center gap-2">
                    <BarChart2 className="text-uzum-600 dark:text-uzum-400"/>
                    KPI Команды
                </span>
            </h2>
            
            {/* Always visible button to download Report */}
            <button 
                onClick={exportToExcel}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition shadow-lg animate-pulse"
                title="Скачать отчет в Excel за выбранный период"
            >
                <Download size={18}/> Скачать Excel
            </button>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shrink-0">
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl overflow-x-auto">
                <button 
                    onClick={() => setViewMode('status')} 
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                        viewMode === 'status' 
                        ? 'bg-white dark:bg-gray-600 text-uzum-600 dark:text-white shadow-sm' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    <CheckCircle2 className="inline mr-2" size={16}/> Статус
                </button>
                <button 
                    onClick={() => setViewMode('history')} 
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                        viewMode === 'history' 
                        ? 'bg-white dark:bg-gray-600 text-uzum-600 dark:text-white shadow-sm' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    <Calendar className="inline mr-2" size={16}/> Детализация
                </button>
                <button 
                    onClick={() => setViewMode('report')} 
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                        viewMode === 'report' 
                        ? 'bg-white dark:bg-gray-600 text-uzum-600 dark:text-white shadow-sm' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    <FileSpreadsheet className="inline mr-2" size={16}/> Реестр (Excel)
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase hidden sm:inline">Период:</span>
                    <input 
                        type="date" 
                        value={rangeStart}
                        onChange={(e) => setRangeStart(e.target.value)}
                        className="bg-transparent text-sm font-bold text-gray-900 dark:text-white outline-none w-28 [color-scheme:light] dark:[color-scheme:dark]"
                    />
                    <span className="text-gray-400">-</span>
                    <input 
                        type="date" 
                        value={rangeEnd}
                        onChange={(e) => setRangeEnd(e.target.value)}
                        className="bg-transparent text-sm font-bold text-gray-900 dark:text-white outline-none w-28 [color-scheme:light] dark:[color-scheme:dark]"
                    />
                    <button 
                        onClick={() => setPresetRange('month')} 
                        className="ml-2 px-3 py-1 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-500 hover:text-uzum-600 hover:border-uzum-300 transition-all"
                        title="Весь месяц"
                    >
                        Месяц
                    </button>
                    <button 
                        onClick={() => setPresetRange('today')} 
                        className="px-3 py-1 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-500 hover:text-uzum-600 hover:border-uzum-300 transition-all"
                        title="Сегодня"
                    >
                        Сегодня
                    </button>
                </div>

                <div className="relative">
                    <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-uzum-500 focus:border-uzum-500 block p-2.5 pr-8 appearance-none outline-none font-bold min-w-[180px]"
                    >
                        <option value="all">Все сотрудники</option>
                        {users.filter(u => u.login !== 'Natalya Pak').map(u => (
                            <option key={u.id} value={u.id}>{u.displayName}</option>
                        ))}
                    </select>
                    <Filter className="absolute right-2 top-3 text-gray-400 pointer-events-none" size={16}/>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                        <span className="text-uzum-600 dark:text-uzum-400">Отчетность</span> 
                        <span className="text-gray-400 text-lg font-medium normal-case">
                            ({new Date(rangeStart).toLocaleDateString()} — {new Date(rangeEnd).toLocaleDateString()})
                        </span>
                    </h3>
                    <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase font-bold">Раб. дней в периоде</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{calculateBusinessDaysInRange()}</p>
                    </div>
                </div>

                {viewMode === 'status' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                    <tr>
                                        <th className="px-6 py-4">Сотрудник</th>
                                        <th className="px-6 py-4 text-center">Текущий Статус</th>
                                        <th className="px-6 py-4 text-center">Итого SKU (За период)</th>
                                        <th className="px-6 py-4">Прогресс (К цели периода)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(user => {
                                        const stats = getStatsForUserRange(user.id, rangeStart, rangeEnd);
                                        const status = getStatusText(user);
                                        const progress = rangeTarget > 0 ? Math.min(100, (stats.sku / rangeTarget) * 100) : 0;

                                        return (
                                            <tr 
                                                key={user.id} 
                                                className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer"
                                                onClick={() => setSelectedUserStats(user)}
                                            >
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                                                    <div className="relative">
                                                        <img src={user.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600" />
                                                        {status.color.includes('green') ? (
                                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                                                        ) : (
                                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold">{user.displayName}</div>
                                                        <div className="text-xs text-gray-400">{user.role}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${status.color} ${status.bg} border border-transparent`}>
                                                        {status.text}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className={`text-2xl font-black ${stats.sku > 0 ? 'text-uzum-600 dark:text-uzum-400' : 'text-gray-300 dark:text-gray-600'}`}>
                                                        {stats.sku > 0 ? stats.sku : '0'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-1">
                                                        <div className="bg-uzum-600 dark:bg-uzum-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 text-right">{stats.sku} / {rangeTarget} (Цель)</div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {viewMode === 'history' && (
                    <div className="space-y-4">
                        {filteredUsers.map(user => {
                            const { totalSku, dailyBreakdown } = getRangeBreakdown(user);
                            const percent = rangeTarget > 0 ? Math.round((totalSku / rangeTarget) * 100) : 0;
                            
                            return (
                                <div key={user.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                        <div className="flex items-center gap-4">
                                            <img src={user.avatar} className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-gray-600" />
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{user.displayName}</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{user.role}</p>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded-xl flex flex-col items-end">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">
                                                Итог за период
                                            </span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-2xl font-black text-uzum-600 dark:text-white">{totalSku} SKU</span>
                                                <span className={`text-xs font-bold ${percent >= 100 ? 'text-green-500' : 'text-gray-400'}`}>
                                                    ({percent}%)
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <div className="overflow-x-auto pb-2 scrollbar-hide">
                                            <div className="flex gap-2 min-w-max">
                                                {dailyBreakdown.map((d) => (
                                                    <div 
                                                        key={d.date.toISOString()} 
                                                        className={`flex flex-col items-center p-2 rounded-lg border min-w-[50px] transition-all hover:scale-105 ${
                                                            d.isWeekend 
                                                            ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' 
                                                            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-600'
                                                        }`}
                                                    >
                                                        <span className={`text-[10px] font-bold uppercase mb-1 ${d.isWeekend ? 'text-red-400' : 'text-gray-400'}`}>
                                                            {d.date.toLocaleString('ru', { weekday: 'short' })}
                                                        </span>
                                                        <span className="text-xs font-bold text-gray-900 dark:text-white mb-2">{d.day}</span>
                                                        
                                                        {d.sku > 0 ? (
                                                            <div className="bg-white dark:bg-gray-600 px-1.5 py-0.5 rounded text-[10px] font-bold text-uzum-600 dark:text-white shadow-sm">
                                                                {d.sku}
                                                            </div>
                                                        ) : (
                                                            <div className="h-4 w-4 rounded-full bg-gray-200 dark:bg-gray-600 opacity-30"></div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {viewMode === 'report' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3">Дата</th>
                                        <th className="px-4 py-3">Сотрудник</th>
                                        <th className="px-4 py-3">Задача</th>
                                        <th className="px-4 py-3">Кат.</th>
                                        <th className="px-4 py-3 text-center">1P</th>
                                        <th className="px-4 py-3 text-center">SKU</th>
                                        <th className="px-4 py-3 text-right">Время</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.map((row, idx) => (
                                        <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                            <td className="px-4 py-3">{row.date}</td>
                                            <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{row.userName}</td>
                                            <td className="px-4 py-3 max-w-xs truncate" title={row.taskTitle}>{row.taskTitle}</td>
                                            <td className="px-4 py-3 capitalize">{row.category} {row.tariff !== '-' ? `(${row.tariff})` : ''}</td>
                                            <td className="px-4 py-3 text-center">
                                                {row.is1P === 'Да' ? <span className="text-purple-600 font-bold">1P</span> : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-uzum-600 dark:text-white">{row.skuCount}</td>
                                            <td className="px-4 py-3 text-right font-mono">{formatTime(row.timeSeconds)}</td>
                                        </tr>
                                    ))}
                                    {reportData.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-gray-400">Нет данных за выбранный период</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex items-start gap-3 mt-4">
                    <AlertCircle className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" size={20}/>
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-bold mb-1">Как работает статистика?</p>
                        <ul className="list-disc pl-4 space-y-1 opacity-80">
                            <li>SKU засчитываются в день фактической сдачи.</li>
                            <li>Выходные (Сб, Вс) подсвечены красным.</li>
                            <li>Цель рассчитывается: 50 SKU * (Рабочие дни в периоде).</li>
                            <li>В режиме "Реестр (Excel)" можно скачать полный отчет для бухгалтерии.</li>
                        </ul>
                    </div>
                </div>

            </div>
        </div>
    </div>
    
    {selectedUserStats && (
        <StatisticsModal 
            targetUser={selectedUserStats}
            isOpen={!!selectedUserStats}
            onClose={() => setSelectedUserStats(null)}
        />
    )}
    </>
  );
};

export default TeamKPI;
