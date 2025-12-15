
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { StorageService } from '../services/storage';
import { LogIn, UserPlus, Briefcase, ArrowRight, Sun, Moon, Loader2 } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
  onToggleTheme: () => void;
  isDarkMode: boolean;
}

const MANAGER_SECRET = "998959472583";
const DEVELOPER_SECRET = "22012";

const Auth: React.FC<AuthProps> = ({ onLogin, onToggleTheme, isDarkMode }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.PHOTOGRAPHER);
  const [error, setError] = useState('');

  const [showBossInput, setShowBossInput] = useState(false);
  const [bossCode, setBossCode] = useState('');

  const logoColor = isDarkMode ? '#ffffff' : '#7000ff';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        const users = await StorageService.getUsers();

        if (isRegistering) {
          if (users.find(u => u.login === login)) {
            setError('Пользователь с таким логином уже существует');
            setLoading(false);
            return;
          }

          const newUser: User = {
            id: crypto.randomUUID(), // Native UUID
            login,
            displayName: name,
            password, 
            role,
            isAdmin: false,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            profileComments: []
          };

          await StorageService.saveUser(newUser);
          StorageService.setCurrentUser(newUser);
          onLogin(newUser);
        } else {
          const user = users.find(u => u.login === login && u.password === password);
          if (user) {
            StorageService.setCurrentUser(user);
            onLogin(user);
          } else {
            setError('Неверный логин или пароль');
          }
        }
    } catch (err) {
        setError('Ошибка соединения с базой данных');
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const handleBossLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      
      try {
          if (bossCode === DEVELOPER_SECRET) {
              const users = await StorageService.getUsers();
              let dev = users.find(u => u.id === 'solar_bridge');
              
              if (!dev) {
                  dev = {
                      id: 'solar_bridge',
                      login: 'solar_bridge',
                      displayName: 'Solar Bridge',
                      role: UserRole.DEVELOPER,
                      isAdmin: true,
                      password: 'dev', 
                      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=solarbridge',
                      bio: 'System Creator. God Mode.',
                      profileComments: []
                  };
                  await StorageService.saveUser(dev);
              } else {
                  dev.role = UserRole.DEVELOPER; // Force role restore
                  await StorageService.saveUser(dev);
              }
              
              StorageService.setCurrentUser(dev);
              onLogin(dev);
              return;
          }

          if (bossCode === MANAGER_SECRET) {
              const users = await StorageService.getUsers();
              let boss = users.find(u => u.login === 'Natalya Pak');
              
              if (!boss) {
                  boss = {
                      id: 'natalya_pak',
                      login: 'Natalya Pak',
                      displayName: 'Natalya Pak',
                      role: UserRole.MANAGER,
                      isAdmin: true,
                      password: 'насальника22',
                      avatar: 'https://ui-avatars.com/api/?name=Natalya+Pak&background=7024C4&color=fff',
                      bio: 'BIG BOSS',
                      profileComments: []
                  };
                  await StorageService.saveUser(boss);
              }
              
              StorageService.setCurrentUser(boss);
              onLogin(boss);
              return;
          }

          setError('Неверный секретный код!');
      } catch (err) {
          setError("Ошибка базы данных");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 font-travels">
      <div className="absolute top-4 right-4">
          <button 
            onClick={onToggleTheme}
            className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-md text-gray-600 dark:text-gray-300 hover:text-uzum-600 transition"
          >
              {isDarkMode ? <Sun size={24}/> : <Moon size={24}/>}
          </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-100 dark:border-gray-700 relative">
        <div className="p-8 pb-4 text-center bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex justify-center items-center">
            <div className="w-40 h-40">
                <svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1080 1080">
                  <defs><style>{`.st0 { fill: ${logoColor}; }`}</style></defs>
                  <path className="st0" d="M353.57,575.95c.06,22.56-6.58,44.62-19.07,63.41-12.49,18.78-30.28,33.44-51.1,42.11-20.82,8.67-43.75,10.97-65.88,6.6-22.13-4.37-42.47-15.2-58.44-31.13-15.97-15.93-26.86-36.24-31.28-58.36-4.42-22.12-2.18-45.05,6.44-65.9,8.62-20.85,23.23-38.67,41.98-51.2,18.75-12.54,40.8-19.23,63.36-19.23,14.95-.03,29.77,2.89,43.59,8.6,13.82,5.7,26.39,14.07,36.98,24.63,10.59,10.56,18.99,23.1,24.72,36.91,5.74,13.81,8.69,28.61,8.7,43.57h0ZM252.67,501.73c-4.26-.4-8.65-.56-13.09-.56s-8.75.16-13.03.56v60.64h26.14l-.02-60.64ZM312.98,537.07c-9.53-3.12-19.26-5.57-29.13-7.32v50.88c0,36.65-15.58,55.93-44.23,55.93s-44.23-19.28-44.23-55.93v-50.88c-9.87,1.76-19.6,4.2-29.13,7.32v43.87c.63,19.04,8.64,37.09,22.33,50.34,13.69,13.25,32,20.65,51.05,20.65s37.36-7.41,51.05-20.65c13.69-13.25,21.7-31.3,22.33-50.34l-.04-43.87Z"/>
                  <path className="st0" d="M722.03,579.77c0,14.78-8.34,21.61-20.78,21.61s-20.47-6.7-20.47-21.61v-48.79h-26.8v49.73c0,32.4,27.11,45.1,47.48,45.1s47.51-12.7,47.51-45.1v-49.73h-26.8l-.13,48.79Z"/>
                  <path className="st0" d="M631.29,553.63v-22.65h-87.12v22.65h51.57l-53.65,47.82v22.65h92.45v-22.65h-56.8l53.54-47.82Z"/>
                  <path className="st0" d="M883.17,529.21c-16.99,0-29.79,6.9-36.12,17.42-6.47-10.52-20.51-17.42-35.08-17.42-28.65,0-43.56,18.26-43.56,40.81v54.08h26.81v-50.26c0-10.79,5.66-20.27,18.66-20.27,2.65-.16,5.3.25,7.78,1.2,2.48.95,4.73,2.41,6.6,4.29,1.87,1.88,3.32,4.14,4.26,6.63.93,2.49,1.33,5.14,1.16,7.79v50.66h26.81v-50.7c0-10.82,6.37-19.9,19.23-19.9s19.07,9.48,19.07,20.27v50.26h26.8v-53.98c0-22.55-13.84-40.81-42.65-40.81l.23-.07Z"/>
                  <path className="st0" d="M497.62,579.77c0,14.78-8.34,21.61-20.67,21.61s-20.57-6.7-20.57-21.61v-48.79h-26.81v49.73c0,32.4,27.01,45.1,47.48,45.1s47.41-12.7,47.41-45.1v-49.73h-26.81l-.03,48.79Z"/>
                </svg>
            </div>
        </div>

        <div className="p-8 bg-gray-50 dark:bg-gray-800">
          {!showBossInput ? (
             <>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 text-center">
                    {isRegistering ? 'Регистрация сотрудника' : 'Авторизация'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegistering && (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 ml-1">Имя и Фамилия</label>
                        <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-uzum-600 focus:ring-4 focus:ring-uzum-100 dark:focus:ring-uzum-900 outline-none transition-all font-medium shadow-sm"
                        placeholder="Иван Иванов"
                        />
                    </div>
                    )}

                    <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 ml-1">Логин</label>
                    <input
                        type="text"
                        required
                        value={login}
                        onChange={(e) => setLogin(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-uzum-600 focus:ring-4 focus:ring-uzum-100 dark:focus:ring-uzum-900 outline-none transition-all font-medium shadow-sm"
                        placeholder={isRegistering ? "Придумайте логин" : "Ваш логин"}
                    />
                    </div>

                    <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 ml-1">Пароль</label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-uzum-600 focus:ring-4 focus:ring-uzum-100 dark:focus:ring-uzum-900 outline-none transition-all font-medium shadow-sm"
                        placeholder="••••••••"
                    />
                    </div>

                    {isRegistering && (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 ml-1">Роль</label>
                        <div className="relative">
                            <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as UserRole)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-uzum-600 focus:ring-4 focus:ring-uzum-100 dark:focus:ring-uzum-900 outline-none transition-all appearance-none cursor-pointer font-medium shadow-sm"
                            >
                            {Object.values(UserRole).filter(r => r !== UserRole.DEVELOPER).map((r) => (
                                <option key={r} value={r} className="text-gray-900 dark:text-gray-900 py-2">{r}</option>
                            ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>
                    )}

                    {error && <div className="text-red-600 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-900/20 py-3 rounded-xl border border-red-100 dark:border-red-900 font-medium animate-pulse">{error}</div>}

                    <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-uzum-600 hover:bg-uzum-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-uzum-200 dark:shadow-none hover:-translate-y-0.5 disabled:opacity-50"
                    >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (isRegistering ? <UserPlus size={20} /> : <LogIn size={20} />)}
                    {isRegistering ? 'Создать аккаунт' : 'Войти'}
                    </button>
                </form>

                {!isRegistering && (
                    <button 
                        type="button"
                        onClick={() => {
                            setShowBossInput(true);
                            setError('');
                        }}
                        className="w-full mt-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-yellow-200 dark:shadow-none hover:-translate-y-0.5"
                    >
                        <Briefcase size={20} /> Руководитель
                    </button>
                )}

                <div className="mt-8 text-center">
                    <button
                    onClick={() => {
                        setIsRegistering(!isRegistering);
                        setError('');
                    }}
                    className="text-gray-500 dark:text-gray-400 hover:text-uzum-600 dark:hover:text-uzum-400 text-sm font-semibold transition-colors hover:underline"
                    >
                    {isRegistering ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
                    </button>
                </div>
             </>
          ) : (
             <div className="animate-fade-in">
                 <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 text-center flex items-center justify-center gap-2">
                     <Briefcase className="text-yellow-500"/> Вход для руководства
                 </h2>
                 <form onSubmit={handleBossLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 ml-1">Введите секретный код</label>
                        <input
                            type="password"
                            required
                            autoFocus
                            value={bossCode}
                            onChange={(e) => setBossCode(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 dark:focus:ring-yellow-900 outline-none transition-all font-medium shadow-sm text-center tracking-[0.5em] text-lg"
                            placeholder="••••••"
                        />
                    </div>
                    
                    {error && <div className="text-red-600 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-900/20 py-3 rounded-xl border border-red-100 dark:border-red-900 font-medium animate-pulse">{error}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-4 shadow-lg hover:shadow-yellow-200 dark:shadow-none hover:-translate-y-0.5 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                        Войти
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowBossInput(false)}
                        className="w-full text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 font-medium py-3 rounded-xl transition-colors"
                    >
                        Отмена
                    </button>
                 </form>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
