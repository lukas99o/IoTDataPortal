import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

interface AppNavbarProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  userEmail?: string;
  onLogout: () => void;
  children?: ReactNode;
}

export function AppNavbar({
  title,
  subtitle,
  backTo,
  backLabel = 'Back',
  userEmail,
  onLogout,
  children,
}: AppNavbarProps) {
  return (
    <header className="bg-white dark:bg-gray-900 shadow border-b border-transparent dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div className="flex items-start justify-between gap-3 min-w-0 sm:items-center sm:justify-start sm:gap-4">
            {backTo && (
              <Link to={backTo} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 shrink-0">
                ← {backLabel}
              </Link>
            )}
            <div className={`min-w-0 ${backTo ? 'text-right sm:text-left' : ''}`}>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{title}</h1>
              {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 w-full sm:w-auto sm:justify-end sm:flex-wrap">
            {userEmail && (
              <span className="text-sm text-gray-600 dark:text-gray-300 max-w-full truncate sm:max-w-55">{userEmail}</span>
            )}
            <div className="flex items-center gap-2 shrink-0">
              <ThemeToggle />
              {children}
              <button
                onClick={onLogout}
                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}