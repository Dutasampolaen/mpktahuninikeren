import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import {
  LayoutDashboard,
  FileText,
  Users,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  Award,
  UserCog,
  Calendar,
  Bell
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, signOut, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  async function loadNotifications() {
    if (!user) return;
    try {
      const notifications = await api.notifications.list();
      const unread = notifications.filter((n: any) => !n.is_read && n.user_id === user.id);
      setUnreadCount(unread.length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'dashboard', roles: ['admin', 'grader', 'member'] },
    { name: 'My Scoring', icon: ClipboardList, page: 'my-scoring', roles: ['grader', 'admin'] },
    { name: 'Programs', icon: FileText, page: 'programs', roles: ['admin'] },
    { name: 'Panitia Assignment', icon: UserCog, page: 'panitia', roles: ['admin'] },
    { name: 'Bulk Assignment', icon: Users, page: 'bulk-panitia', roles: ['admin'] },
    { name: 'Assignment History', icon: Calendar, page: 'assignments', roles: ['admin'] },
    { name: 'Workload', icon: Award, page: 'workload', roles: ['admin'] },
    { name: 'Members', icon: Users, page: 'members', roles: ['admin'] },
    { name: 'Settings', icon: Settings, page: 'settings', roles: ['admin'] },
  ];

  const filteredNavigation = navigation.filter(item =>
    item.roles.some(role => user?.roles?.includes(role))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 transform ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 transition-transform duration-200 ease-in-out z-50 w-64 bg-white border-r border-gray-200`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
              <h1 className="text-xl font-bold text-gray-900">MPK System</h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.page;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      onNavigate(item.page);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-700 font-semibold text-sm">
                    {user?.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.nis}</p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="w-full flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-screen">
          <header className="lg:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="ml-4 text-lg font-semibold text-gray-900">MPK System</h1>
            </div>
            <button className="relative text-gray-600 hover:text-gray-900">
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
