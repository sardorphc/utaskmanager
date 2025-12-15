
import React from 'react';
import { X, CheckCircle2, Bug, Zap, Info } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  isUpdateMessage?: boolean;
}

export const APP_VERSION = "1.3.1";

const CHANGELOG = [
  {
    version: "1.3.1",
    date: "Текущая",
    changes: [
      { type: 'fix', text: "Исправлена видимость календаря в светлой теме." },
      { type: 'feature', text: "Единый выбор диапазона дат для всех вкладок KPI." },
      { type: 'feature', text: "Возможность отключить всплывающее окно обновлений (Для разработчиков)." },
      { type: 'fix', text: "Улучшен расчет целей в зависимости от выбранного периода." }
    ]
  },
  {
    version: "1.3.0",
    date: "Ранее",
    changes: [
      { type: 'feature', text: "KPI Команды теперь встроен в основной интерфейс (боковая панель остается)." },
      { type: 'feature', text: "Выбор произвольного периода дат для статистики (с... по...)." },
      { type: 'feature', text: "Окно 'О приложении' и история обновлений." },
      { type: 'fix', text: "Исправлено сохранение настроек логотипа и интерфейса." }
    ]
  },
  {
    version: "1.2.0",
    date: "Ранее",
    changes: [
      { type: 'feature', text: "Поиск теперь встроен в верхнюю панель и растягивается." },
      { type: 'feature', text: "Добавлена месячная статистика в профиле." },
      { type: 'fix', text: "Оптимизация работы на мобильных устройствах." }
    ]
  }
];

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, isUpdateMessage }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-travels">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-gray-100 dark:border-gray-700">
        
        <div className="bg-uzum-600 p-6 text-white flex justify-between items-start shrink-0">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                        <Info size={24} />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">
                        {isUpdateMessage ? 'Что нового?' : 'О приложении'}
                    </h2>
                </div>
                <p className="text-white/80 text-sm font-medium">Uzum Studio Task Manager v{APP_VERSION}</p>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition text-white">
                <X size={24} />
            </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-8">
            
            {!isUpdateMessage && (
                <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-2">Назначение системы</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            Это комплексная система управления задачами для фотостудии Uzum Market. 
                            Приложение позволяет распределять поток товаров (SKU) между фотографами, 
                            ретушерами и дизайнерами, отслеживать KPI в реальном времени и вести коммуникацию.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                            <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-1">Для Руководителя</h4>
                            <ul className="text-xs text-blue-700 dark:text-blue-200 space-y-1 list-disc pl-4">
                                <li>Контроль KPI и статистики</li>
                                <li>Управление доступами</li>
                                <li>"Будильник" для сотрудников</li>
                            </ul>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
                            <h4 className="font-bold text-purple-800 dark:text-purple-300 mb-1">Для Команды</h4>
                            <ul className="text-xs text-purple-700 dark:text-purple-200 space-y-1 list-disc pl-4">
                                <li>Четкая очередь задач</li>
                                <li>Встроенный чат и профили</li>
                                <li>Учет личной выработки (SKU)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Zap className="text-yellow-500 fill-yellow-500" size={20}/>
                    История обновлений
                </h3>
                <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-0 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700">
                    {CHANGELOG.map((log, idx) => (
                        <div key={idx} className="relative pl-10">
                            <div className={`absolute left-0 w-10 h-10 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center font-bold text-[10px] shadow-sm z-10 ${idx === 0 ? 'bg-uzum-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                                v{log.version.split('.')[1] + '.' + log.version.split('.')[2]}
                            </div>
                            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 shadow-sm">
                                <div className="flex justify-between items-baseline mb-3">
                                    <span className="font-bold text-gray-900 dark:text-white text-lg">Версия {log.version}</span>
                                    <span className="text-xs text-gray-400 font-medium">{log.date}</span>
                                </div>
                                <ul className="space-y-2">
                                    {log.changes.map((change, cIdx) => (
                                        <li key={cIdx} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                                            {change.type === 'feature' && <CheckCircle2 className="text-green-500 mt-0.5 shrink-0" size={16}/>}
                                            {change.type === 'fix' && <Bug className="text-red-500 mt-0.5 shrink-0" size={16}/>}
                                            <span>{change.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 text-center">
            <button 
                onClick={onClose}
                className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-3 px-8 rounded-xl hover:scale-105 transition transform shadow-lg"
            >
                {isUpdateMessage ? 'Круто, спасибо!' : 'Закрыть'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
