import {
  Archive,
  BadgeCheck,
  Bell,
  BookMarked,
  BookOpen,
  CalendarClock,
  CircleDollarSign,
  ClipboardCheck,
  FileBarChart,
  FileText,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  Map,
  Megaphone,
  PackageOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Printer,
  QrCode,
  Settings,
  ShoppingCart,
  Tags,
  Users,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '../components/ui'
import { getAccessToken, getCurrentIdentity } from '../features/auth/auth-storage'
import { logout } from '../features/auth/auth-api'
// AttendanceFab removed
import { useMockAuth } from '../features/inventory/MockAuthContext'
import { ThemeToggle } from '../features/theme/ThemeToggle'

type Role = 'student' | 'faculty' | 'admin' | 'librarian' | 'staff'
type NavItem = { label: string; to: string; icon: LucideIcon; section?: string }

const userNav = (role: 'student' | 'faculty'): NavItem[] => {
  const prefix = role === 'faculty' ? '/faculty' : '/student'
  return [
    { label: 'Overview', to: `${prefix}/dashboard`, icon: LayoutDashboard, section: 'My library' },
    { label: 'Book catalog', to: `${prefix}/catalog`, icon: BookOpen },
    { label: 'Library floor plan', to: `${prefix}/floor-plan`, icon: Map },
    { label: 'Book cart', to: `${prefix}/cart`, icon: ShoppingCart },
    { label: 'Research & thesis', to: `${prefix}/research`, icon: FileText },
    { label: 'Borrowing history', to: `${prefix}/borrowing`, icon: CalendarClock, section: 'My activity' },
    { label: 'Reservations', to: `${prefix}/reservations`, icon: BookMarked },
    ...(role === 'student' ? [{ label: 'Printing service', to: '/student/printing', icon: Printer }] : []),
    { label: 'QR attendance', to: `${prefix}/attendance`, icon: QrCode },
    { label: 'Notifications', to: `${prefix}/notifications`, icon: Bell, section: 'My account' },
    { label: 'Fines', to: `${prefix}/fines`, icon: CircleDollarSign },
    { label: 'Invoices', to: `${prefix}/invoices`, icon: FileText },
    { label: 'Clearance status', to: `${prefix}/clearance`, icon: BadgeCheck },
    { label: 'My profile', to: `${prefix}/profile`, icon: UserRound },
  ]
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard, section: 'Accounts' },
  { label: 'Users', to: '/admin/users', icon: Users },
  { label: 'User archive', to: '/admin/user-archive', icon: Archive },
  { label: 'Clearance', to: '/admin/clearance', icon: ClipboardCheck },
  { label: 'Approvals', to: '/admin/approvals', icon: BadgeCheck },
  { label: 'Notifications', to: '/admin/notifications', icon: Bell },
]
const librarianNav: NavItem[] = [
  { label: 'Dashboard', to: '/librarian/dashboard', icon: LayoutDashboard, section: 'Operations' },
  { label: 'Books & research', to: '/librarian/catalog', icon: BookOpen },
  { label: 'Book archive', to: '/librarian/book-archive', icon: Archive },
  { label: 'Categories', to: '/librarian/categories', icon: Tags },
  { label: 'Borrow & return', to: '/librarian/circulation', icon: CalendarClock },
  { label: 'Reservations', to: '/librarian/reservations', icon: BookMarked },
  { label: 'Fines', to: '/librarian/fines', icon: CircleDollarSign },
  { label: 'Invoices', to: '/librarian/invoices', icon: FileText },
  { label: 'Inventory', to: '/librarian/inventory', icon: Archive, section: 'Resources' },
  { label: 'Reports', to: '/librarian/reports', icon: FileBarChart },
  { label: 'Floor plan', to: '/librarian/floor-plan', icon: Map },
  { label: 'Printing queue', to: '/librarian/printing', icon: Printer },
  { label: 'Print supplies', to: '/librarian/supplies', icon: PackageOpen },
  { label: 'Attendance', to: '/librarian/attendance', icon: QrCode, section: 'People & records' },
  { label: 'Clearance', to: '/librarian/clearance', icon: ClipboardCheck },
  { label: 'Announcements', to: '/librarian/announcements', icon: Megaphone },
  { label: 'My profile', to: '/librarian/profile', icon: UserRound },
]
const staffNav: NavItem[] = [
  { label: 'Dashboard', to: '/staff/dashboard', icon: LayoutDashboard, section: 'My tasks' },
  { label: 'Borrow & return', to: '/staff/circulation', icon: CalendarClock },
  { label: 'Reservations', to: '/staff/reservations', icon: BookMarked },
  { label: 'Printing queue', to: '/staff/printing', icon: Printer },
  { label: 'Attendance', to: '/staff/attendance', icon: QrCode },
  { label: 'Announcements', to: '/staff/announcements', icon: Megaphone },
  { label: 'My profile', to: '/staff/profile', icon: UserRound },
]
const navigation = (role: Role) => role === 'admin' ? adminNav : role === 'librarian' ? librarianNav : role === 'staff' ? staffNav : userNav(role)

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img src="/logo.png" alt="STI College Ormoc Logo" className="w-12 h-auto shrink-0 object-contain rounded-sm" />
      {!compact ? <div><p className="whitespace-nowrap font-display text-[13px] font-black leading-tight tracking-tight text-white">STI COLLEGE ORMOC</p><p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FFF200]">ONLINE LIBRARY</p></div> : null}
    </div>
  )
}

function Sidebar({ role, open, onClose, collapsed, onToggleCollapse }: { role: Role; open: boolean; onClose: () => void; collapsed: boolean; onToggleCollapse: () => void }) {
  const nav = navigation(role)
  const preview = useMockAuth()
  const claims = preview.identity ?? getCurrentIdentity()
  return (
    <>
      {open ? <button aria-label="Close navigation" onClick={onClose} className="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-sm lg:hidden" /> : null}
      <aside className={cn('portal-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 transition-transform duration-300', open ? 'translate-x-0' : '-translate-x-full', collapsed ? 'lg:-translate-x-full' : 'lg:translate-x-0')}>
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <Brand />
          <div className="flex items-center gap-1">
            <button onClick={onToggleCollapse} aria-label="Minimize sidebar" className="hidden rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white lg:block"><PanelLeftClose size={18} /></button>
            <button onClick={onClose} className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"><X size={18} /></button>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.to}>
                {item.section ? <p className="mb-2 mt-4 px-3 text-xs font-bold uppercase tracking-[0.2em] text-white/55 first:mt-0">{item.section}</p> : null}
                <NavLink onClick={onClose} to={item.to} className={({ isActive }) => cn('mb-1 mx-3 flex items-center gap-3 rounded-xl border-l-[3px] px-3 py-2.5 text-sm font-medium transition', isActive ? 'border-[#FFF200] bg-white/10 text-white' : 'border-transparent text-white/85 hover:bg-white/10 hover:text-white')}>
                  <Icon size={17} /><span>{item.label}</span>
                </NavLink>
              </div>
            )
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="mt-2 rounded-xl bg-white/8 p-3 ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF200] text-xs font-black text-[#0b5ea2]">{claims?.role.slice(0, 2).toUpperCase() ?? 'ST'}</span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-white">{claims?.schoolId ?? 'STI account'}</p>
                <p className="mt-0.5 text-xs text-white/70">{claims?.role ?? role}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export function PortalLayout({ role }: { role: Role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const nav = navigation(role)
  const current = nav.find((item) => location.pathname.startsWith(item.to))
  const [hasAdminAlerts, setHasAdminAlerts] = useState(false)
  useEffect(() => {
    let active = true
    const loadAlerts = async () => {
      const token = getAccessToken()
      if (!token) return
      try {
        const requestHeaders = { Accept: 'application/json', Authorization: `Bearer ${token}` }
        if (role === 'admin') {
          const response = await fetch('/api/v1/admin/notifications', { headers: requestHeaders, credentials: 'include' })
          const payload = await response.json() as { data?: { pendingCount?: number } }
          if (active && response.ok) setHasAdminAlerts(Number(payload.data?.pendingCount ?? 0) > 0)
          return
        }
        const response = await fetch('/api/v1/notifications?status=unread&limit=1', { headers: requestHeaders, credentials: 'include' })
        const payload = await response.json() as { success?: boolean; data?: unknown[] | { unreadCount?: number } }
        const hasAlerts = Array.isArray(payload.data) ? Boolean(payload.data.length) : Number(payload.data?.unreadCount ?? 0) > 0
        if (active && response.ok && payload.success) setHasAdminAlerts(hasAlerts)
      } catch { /* The page-level operational modules surface connectivity errors. */ }
    }
    void loadAlerts(); const timer = window.setInterval(() => void loadAlerts(), 15000)
    return () => { active = false; window.clearInterval(timer) }
  }, [role])
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const signOut = async () => { await logout(); navigate('/', { replace: true }) }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 transition-colors dark:bg-[#14151b] dark:text-zinc-100 relative">
      {/* Global Dot-Matrix Background */}
      <div 
        className="absolute inset-0 opacity-[0.15] dark:opacity-20 pointer-events-none z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, #0b5ea2 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
        }}
      />

      <Sidebar role={role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={desktopCollapsed} onToggleCollapse={() => setDesktopCollapsed(!desktopCollapsed)} />
      
      <div className={cn("relative z-10 transition-all duration-300", desktopCollapsed ? "lg:pl-0" : "lg:pl-64")} style={{ "--sidebar-offset": desktopCollapsed ? "0px" : "256px" } as React.CSSProperties}>
        <header className="sticky top-0 z-30 flex h-20 items-center border-b border-zinc-200 bg-white/80 px-4 backdrop-blur-xl transition-colors sm:px-6 lg:px-8 dark:border-white/10 dark:bg-[#14151b]">
          <button onClick={() => { setSidebarOpen(true); setDesktopCollapsed(false); }} className={cn("mr-3 rounded-xl border border-zinc-200 p-2.5 text-zinc-500 dark:border-white/15 dark:text-[#f4f6f8]/80 hover:bg-zinc-50 dark:hover:bg-white/10 transition-colors", desktopCollapsed ? "block" : "lg:hidden")}><Menu size={19} /></button>
          <div className="hidden sm:block">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">{role === 'admin' ? 'Admin workspace' : role === 'librarian' ? 'Librarian workspace' : role === 'staff' ? 'Staff workspace' : role === 'faculty' ? 'Faculty portal' : 'Student portal'}</p>
            <p className="mt-0.5 font-display text-sm font-bold text-zinc-900 dark:text-white">{current?.label ?? 'Smart Library'}</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <button onClick={() => navigate(role === 'admin' ? '/admin/notifications' : role === 'librarian' ? '/librarian/announcements' : role === 'staff' ? '/staff/announcements' : role === 'faculty' ? '/faculty/notifications' : '/student/notifications')} aria-label="Notifications" className="relative rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-500 transition hover:bg-zinc-50 dark:border-white/15 dark:bg-white/10 dark:text-[#f4f6f8]/80 dark:hover:bg-white/15"><Bell size={18} />{hasAdminAlerts ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#FFF200] ring-2 ring-white dark:ring-[#14151b]" /> : null}</button>
            <button onClick={() => setShowLogoutConfirm(true)} aria-label="Sign out" title="Sign out" className="rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-500 transition hover:bg-zinc-50 dark:border-white/15 dark:bg-white/10 dark:text-[#f4f6f8]/80 dark:hover:bg-white/15"><LogOut size={18} /></button>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8"><Outlet /></main>
        {/* AttendanceFab removed */}
      </div>

      {showLogoutConfirm ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-sm dark:bg-black/60">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-white">Sign Out</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Are you sure you want to sign out of your account?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="h-10 rounded-xl px-4 text-sm font-bold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors">Cancel</button>
              <button onClick={signOut} className="h-10 rounded-xl bg-[#0b5ea2] px-4 text-sm font-bold text-white hover:bg-[#004488] transition-colors">Sign out</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

