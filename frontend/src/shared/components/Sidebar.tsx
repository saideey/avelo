import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Wrench,
  LayoutDashboard,
  Calendar,
  BarChart3,
  Settings,
  Users,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/shared/lib/utils';
import { Avatar } from './Avatar';

type SidebarRole = 'partner' | 'admin';

interface SidebarLink {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const partnerLinks: SidebarLink[] = [
  { to: '/partner', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard' },
  { to: '/partner/bookings', icon: <Calendar className="h-5 w-5" />, label: 'Buyurtmalar' },
  { to: '/partner/analytics', icon: <BarChart3 className="h-5 w-5" />, label: 'Analitika' },
  { to: '/partner/settings', icon: <Settings className="h-5 w-5" />, label: 'Sozlamalar' },
];

const adminLinks: SidebarLink[] = [
  { to: '/admin', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard' },
  { to: '/admin/users', icon: <Users className="h-5 w-5" />, label: 'Foydalanuvchilar' },
  { to: '/admin/workshops', icon: <Wrench className="h-5 w-5" />, label: 'Ustaxonalar' },
  { to: '/admin/payments', icon: <CreditCard className="h-5 w-5" />, label: "To'lovlar" },
  { to: '/admin/settings', icon: <Settings className="h-5 w-5" />, label: 'Sozlamalar' },
];

const linksByRole: Record<SidebarRole, SidebarLink[]> = {
  partner: partnerLinks,
  admin: adminLinks,
};

export interface SidebarProps {
  role?: SidebarRole;
  userName?: string;
  userAvatar?: string | null;
  onLogout?: () => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  role = 'partner',
  userName = '',
  userAvatar,
  onLogout,
  className,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const links = linksByRole[role];

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        'fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-gray-200 bg-white',
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600">
          <Wrench className="h-5 w-5 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap text-lg font-bold text-gray-900"
            >
              AVELO
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/partner' || link.to === '/admin'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                collapsed && 'justify-center px-0'
              )
            }
          >
            <span className="shrink-0">{link.icon}</span>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {link.label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mx-3 mb-2 flex items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* User info */}
      <div className="border-t border-gray-100 p-3">
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50',
            collapsed && 'justify-center'
          )}
        >
          <Avatar src={userAvatar} name={userName} size="sm" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex flex-1 items-center justify-between overflow-hidden"
              >
                <span className="truncate text-sm font-medium text-gray-700">
                  {userName}
                </span>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:text-red-500"
                    title="Chiqish"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
};

Sidebar.displayName = 'Sidebar';

export { Sidebar };
