import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

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
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {backTo && (
              <Link to={backTo} className="text-gray-500 hover:text-gray-700 shrink-0">
                ← {backLabel}
              </Link>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{title}</h1>
              {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {userEmail && <span className="text-sm text-gray-600 hidden sm:inline">{userEmail}</span>}
            {children}
            <button
              onClick={onLogout}
              className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors cursor-pointer"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}