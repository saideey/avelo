import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, Search, Calendar, User, LayoutDashboard, BarChart3, Settings,
  Users, Wrench, CreditCard, Star, MessageSquare, Shield, Cog, UserCog,
  FileText, ShieldCheck, Package, Heart, DollarSign, Truck,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useAppSelector } from '@/app/hooks';

type UserRole = 'customer' | 'partner' | 'admin';

interface NavTab {
  to: string;
  icon: React.ReactNode;
  label: string;
  adminRoles?: string[];
}

const customerTabs: NavTab[] = [
  { to: '/', icon: <Home className="h-5 w-5" />, label: 'Bosh sahifa' },
  { to: '/search', icon: <Search className="h-5 w-5" />, label: 'Qidiruv' },
  { to: '/favorites', icon: <Heart className="h-5 w-5" />, label: 'Sevimlilar' },
  { to: '/bookings', icon: <Calendar className="h-5 w-5" />, label: 'Buyurtmalar' },
  { to: '/profile', icon: <User className="h-5 w-5" />, label: 'Profil' },
];

const partnerTabs: NavTab[] = [
  { to: '/partner', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard' },
  { to: '/partner/bookings', icon: <Calendar className="h-5 w-5" />, label: 'Buyurtmalar' },
  { to: '/partner/reviews', icon: <Star className="h-5 w-5" />, label: 'Sharhlar' },
  { to: '/partner/finance', icon: <DollarSign className="h-5 w-5" />, label: 'Moliya' },
  { to: '/partner/customers', icon: <Users className="h-5 w-5" />, label: 'Mijozlar' },
  { to: '/partner/parts', icon: <Package className="h-5 w-5" />, label: 'Qismlar' },
  { to: '/partner/warranty', icon: <Shield className="h-5 w-5" />, label: 'Kafolatlar' },
  { to: '/partner/analytics', icon: <BarChart3 className="h-5 w-5" />, label: 'Analitika' },
  { to: '/partner/settings', icon: <Settings className="h-5 w-5" />, label: 'Sozlamalar' },
];

const adminTabs: NavTab[] = [
  { to: '/admin', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard', adminRoles: ['admin', 'super_admin', 'regional_admin'] },
  { to: '/admin/users', icon: <Users className="h-5 w-5" />, label: 'Foydalanuvchilar', adminRoles: ['admin', 'super_admin'] },
  { to: '/admin/workshops', icon: <Wrench className="h-5 w-5" />, label: 'Ustaxonalar', adminRoles: ['admin', 'super_admin', 'regional_admin'] },
  { to: '/admin/payments', icon: <CreditCard className="h-5 w-5" />, label: "To'lovlar", adminRoles: ['admin', 'super_admin'] },
  { to: '/admin/reviews', icon: <Star className="h-5 w-5" />, label: 'Sharhlar', adminRoles: ['admin', 'super_admin', 'moderator'] },
  { to: '/admin/complaints', icon: <MessageSquare className="h-5 w-5" />, label: 'Shikoyatlar', adminRoles: ['admin', 'super_admin', 'regional_admin', 'moderator'] },
  { to: '/admin/warranty-claims', icon: <ShieldCheck className="h-5 w-5" />, label: 'Kafolatlar', adminRoles: ['admin', 'super_admin', 'regional_admin', 'moderator'] },
  { to: '/admin/parts', icon: <Package className="h-5 w-5" />, label: 'Ehtiyot qismlar', adminRoles: ['admin', 'super_admin'] },
  { to: '/admin/part-orders', icon: <Truck className="h-5 w-5" />, label: 'Qism buyurtmalari', adminRoles: ['admin', 'super_admin', 'regional_admin', 'moderator'] },
  { to: '/admin/analytics', icon: <BarChart3 className="h-5 w-5" />, label: 'Analitika', adminRoles: ['admin', 'super_admin', 'regional_admin'] },
  { to: '/admin/settings', icon: <Cog className="h-5 w-5" />, label: 'Sozlamalar', adminRoles: ['admin', 'super_admin'] },
  { to: '/admin/admins', icon: <UserCog className="h-5 w-5" />, label: 'Adminlar', adminRoles: ['admin', 'super_admin'] },
  { to: '/admin/audit-logs', icon: <FileText className="h-5 w-5" />, label: 'Audit Log', adminRoles: ['admin', 'super_admin'] },
];

const tabsByRole: Record<UserRole, NavTab[]> = {
  customer: customerTabs,
  partner: partnerTabs,
  admin: adminTabs,
};

export interface NavbarProps {
  role?: UserRole;
  className?: string;
}

const Navbar: React.FC<NavbarProps> = ({ role = 'customer', className }) => {
  const location = useLocation();
  const { user } = useAppSelector((s) => s.auth);
  const allTabs = tabsByRole[role];

  const tabs = role === 'admin'
    ? allTabs.filter((tab) => {
        if (!tab.adminRoles) return true;
        return tab.adminRoles.includes(user?.role ?? 'admin');
      })
    : allTabs;

  // Mobile: customer shows all 5, partner/admin shows first 5
  const mobileTabs = role === 'customer' ? tabs : tabs.slice(0, 5);

  return (
    <>
      {/* Desktop/Tablet top header — hidden on mobile for customer */}
      <header className={cn(
        role === 'customer' ? 'hidden md:flex' : 'hidden md:flex',
        'fixed top-0 left-0 right-0 z-40 h-14 items-center border-b border-gray-100 bg-white/90 backdrop-blur-md px-4',
        className
      )}>
        <NavLink to={role === 'customer' ? '/' : role === 'partner' ? '/partner' : '/admin'} className="flex items-center gap-1 shrink-0 mr-4">
          <img src="/avelo-logo.svg" alt="AVELO" className="h-7" />
        </NavLink>
        <nav className="flex items-center gap-0.5 overflow-x-auto flex-1 scrollbar-hide">
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to}
              end={tab.to === '/' || tab.to === '/partner' || tab.to === '/admin'}
              className={({ isActive }) => cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap',
                isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              )}
            >
              {React.cloneElement(tab.icon as React.ReactElement, { className: 'h-4 w-4' })}
              <span className="hidden lg:inline">{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className={cn(
        'md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-100 bg-white/95 backdrop-blur-md',
        'flex items-stretch justify-around',
        'pb-[env(safe-area-inset-bottom)]',
        className
      )}>
        {mobileTabs.map((tab) => {
          const isActive = tab.to === '/' || tab.to === '/partner' || tab.to === '/admin'
            ? location.pathname === tab.to
            : location.pathname.startsWith(tab.to);

          return (
            <NavLink key={tab.to} to={tab.to}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-w-0"
            >
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg transition-all',
                isActive ? 'bg-blue-50 text-blue-600 scale-110' : 'text-gray-400'
              )}>
                {React.cloneElement(tab.icon as React.ReactElement, { className: 'h-[18px] w-[18px]' })}
              </div>
              <span className={cn(
                'text-[9px] font-semibold leading-tight truncate max-w-full px-0.5',
                isActive ? 'text-blue-600' : 'text-gray-400'
              )}>
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};

Navbar.displayName = 'Navbar';
export { Navbar };
export type { UserRole };
