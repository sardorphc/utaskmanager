import { User, UserRole } from './types';

// This acts as the "Separate file where I can enter login/password/admin role"
export const HARDCODED_ADMINS = [
  {
    login: 'Natalya Pak',
    password: 'насальника22',
    displayName: 'Natalya Pak',
    role: UserRole.MANAGER,
    isAdmin: true
  }
];

export const INITIAL_TASKS_SEED = [
  {
    title: 'Ретушь съемки "Одежда Весна 2024"',
    description: 'Обработать 50 фото с модельной съемки.',
    status: 'in-progress',
    deadline: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days
  },
  {
    title: 'Баннеры для главной страницы',
    description: 'Подготовить 3 баннера для акции "Ликвидация".',
    status: 'todo',
    deadline: new Date(Date.now() + 86400000 * 1).toISOString(),
  }
];

export const AVATAR_PLACEHOLDER = "https://picsum.photos/200/200";