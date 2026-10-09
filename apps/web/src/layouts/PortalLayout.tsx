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
  LogOut,
  Menu,
  Map,
  Megaphone,
  Moon,
  PackageOpen,
  PanelLeftClose,
  Printer,
  QrCode,
  ShoppingCart,
  Sun,
  Tags,
  Users,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '../components/ui'
import { getAccessToken, getCurrentIdentity, setSessionIdentity } from '../features/auth/auth-storage'
import { postLogoutPath } from '../features/auth/auth-redirects'
import { logout } from '../features/auth/auth-api'
import { useMockAuth } from '../features/inventory/MockAuthContext'
import { useTheme } from '../features/theme/ThemeProvider'
import { NotificationBell } from '../features/notifications/NotificationBell'
import { usersApi } from '../features/users/users-api'

type Role = 'student' | 'faculty' | 'librarian' | 'staff'
type NavItem = { label: string; to: string; icon: LucideIcon; section?: string }

const profilePath = (role: Role) =>
  role === 'faculty' ? '/faculty/profile'
    : role === 'librarian' ? '/librarian/profile'
      : role === 'staff' ? '/staff/profile'
        : '/student/profile'

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
    { label: 'Fines', to: `${prefix}/fines`, icon: CircleDollarSign, section: 'My account' },
    { label: 'Invoices', to: `${prefix}/invoices`, icon: FileText },
    { label: 'Clearance status', to: `${prefix}/clearance`, icon: BadgeCheck },
  ]
}

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
  { label: 'Users', to: '/librarian/users', icon: Users, section: 'Accounts' },
  { label: 'User archive', to: '/librarian/user-archive', icon: Archive },
  { label: 'Approvals', to: '/librarian/approvals', icon: BadgeCheck },
  { label: 'Account alerts', to: '/librarian/notifications', icon: Bell },
  { label: 'Attendance', to: '/librarian/attendance', icon: QrCode, section: 'People & records' },
  { label: 'Clearance', to: '/librarian/clearance', icon: ClipboardCheck },
  { label: 'Announcements', to: '/librarian/announcements', icon: Megaphone },
]
const staffNav: NavItem[] = [
  { label: 'Dashboard', to: '/staff/dashboard', icon: LayoutDashboard, section: 'My tasks' },
  { label: 'Borrow & return', to: '/staff/circulation', icon: CalendarClock },
  { label: 'Reservations', to: '/staff/reservations', icon: BookMarked },
  { label: 'Printing queue', to: '/staff/printing', icon: Printer },
  { label: 'Attendance', to: '/staff/attendance', icon: QrCode },
  { label: 'Announcements', to: '/staff/announcements', icon: Megaphone },
]
const navigation = (role: Role) => role === 'librarian' ? librarianNav : role === 'staff' ? staffNav : userNav(role)

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
      </aside>
    </>
  )
}

function accountInitials(name: string | null | undefined, roleLabel: string) {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase()
    if (parts[0]?.[0]) return parts[0][0].toUpperCase()
  }
  return roleLabel.slice(0, 2).toUpperCase()
}

function resolveProfileName(profile: {
  first_name?: string | null
  last_name?: string | null
  full_name?: string | null
  school_id?: string | null
}) {
  const fromParts = [profile.first_name, profile.last_name].map((part) => part?.trim()).filter(Boolean).join(' ')
  if (fromParts) return fromParts
  const fullName = profile.full_name?.trim()
  if (fullName && fullName !== profile.school_id) return fullName
  return fullName || null
}

function AccountMenu({ role, onRequestSignOut }: { role: Role; onRequestSignOut: () => void }) {
  const [open, setOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [profileSchoolId, setProfileSchoolId] = useState<string | null>(null)
  const [profileRole, setProfileRole] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const navigate = useNavigate()
  const preview = useMockAuth()
  const claims = preview.identity ?? getCurrentIdentity()
  const { isDark, toggleTheme } = useTheme()
  const fallbackRole = claims?.role ?? (role === 'librarian' ? 'Librarian' : role === 'staff' ? 'Staff' : role === 'faculty' ? 'Faculty' : 'Student')
  const schoolId = profileSchoolId ?? claims?.schoolId ?? 'STI account'
  const displayRole = profileRole ?? fallbackRole
  const displayName = profileName ?? claims?.fullName ?? null
  const initials = accountInitials(displayName, String(displayRole))

  useEffect(() => {
    let active = true
    const token = getAccessToken()
    if (!token && !preview.enabled) return

    void usersApi.myProfile()
      .then((profile) => {
        if (!active) return
        const name = resolveProfileName(profile)
        setProfileName(name)
        setProfileSchoolId(profile.school_id)
        setProfileRole(profile.role)
        if (claims && name) {
          setSessionIdentity({
            userId: claims.userId,
            schoolId: profile.school_id || claims.schoolId,
            fullName: name,
            role: claims.role,
            source: claims.source,
          })
        }
      })
      .catch(() => { /* claims remain until the live profile loads */ })

    void fetch('/api/v1/profile/avatar/me', {
      headers: { Authorization: `Bearer ${token ?? ''}`, Accept: 'application/json' },
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) return
        const payload = await response.json() as { data?: { currentUrl?: string | null } }
        if (active) setAvatarUrl(payload.data?.currentUrl ?? null)
      })
      .catch(() => { /* initials remain when the picture cannot load */ })

    return () => { active = false }
  }, [role, claims?.schoolId, claims?.userId, claims?.role, claims?.source, preview.enabled])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const menuItemClass =
    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/10'

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${displayName ?? schoolId}`}
        onClick={() => setOpen((value) => !value)}
        className="rounded-full ring-2 ring-[#FFF200]/80 transition hover:ring-[#FFF200] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5ea2]"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF200] text-xs font-black text-[#0b5ea2]">{initials}</span>
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account options"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-60 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-white/15 dark:bg-[#1a1b22]"
        >
          <div className="border-b border-zinc-100 px-3 py-2.5 dark:border-white/10">
            <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">{displayName ?? 'Loading profile…'}</p>
            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{schoolId}</p>
            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{displayRole}</p>
          </div>
          <div className="pt-1">
            <button
              type="button"
              role="menuitem"
              className={menuItemClass}
              onClick={() => toggleTheme()}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
              <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className={menuItemClass}
              onClick={() => {
                setOpen(false)
                navigate(profilePath(role))
              }}
            >
              <UserRound size={17} />
              <span>My profile</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className={menuItemClass}
              onClick={() => {
                setOpen(false)
                onRequestSignOut()
              }}
            >
              <LogOut size={17} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function PortalLayout({ role }: { role: Role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const nav = navigation(role)
  const current = nav.find((item) => location.pathname.startsWith(item.to))
    ?? (location.pathname.startsWith(profilePath(role)) ? { label: 'My profile' } : undefined)
    ?? ((role === 'student' || role === 'faculty') && location.pathname.includes('/notifications') ? { label: 'Notifications' } : undefined)
  const [hasAdminAlerts, setHasAdminAlerts] = useState(false)
  const [alertPollStopped, setAlertPollStopped] = useState(false)
  useEffect(() => {
    if (role === 'student' || role === 'faculty' || alertPollStopped) return
    let active = true
    const loadAlerts = async () => {
      const token = getAccessToken()
      if (!token) {
        if (active) {
          setHasAdminAlerts(false)
          setAlertPollStopped(true)
        }
        return
      }
      try {
        const requestHeaders = { Accept: 'application/json', Authorization: `Bearer ${token}` }
        if (role === 'librarian') {
          const response = await fetch('/api/v1/admin/notifications', { headers: requestHeaders, credentials: 'include' })
          const payload = await response.json() as { data?: { pendingCount?: number }; code?: string }
          if (response.status === 401 || payload.code === 'JWT_REQUIRED' || payload.code === 'JWT_INVALID') {
            if (active) {
              setHasAdminAlerts(false)
              setAlertPollStopped(true)
            }
            return
          }
          if (active && response.ok) setHasAdminAlerts(Number(payload.data?.pendingCount ?? 0) > 0)
          return
        }
        /* Staff: no unread notification poll; bell opens announcements. */
        if (active) setHasAdminAlerts(false)
      } catch { /* Quiet background poll: page modules surface real connectivity errors. */ }
    }
    void loadAlerts()
    const timer = window.setInterval(() => void loadAlerts(), 60_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [role, alertPollStopped])
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const signOut = async () => { await logout(); navigate(postLogoutPath(role), { replace: true }) }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 transition-colors dark:bg-[#14151b] dark:text-zinc-100 relative">
      <Sidebar role={role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={desktopCollapsed} onToggleCollapse={() => setDesktopCollapsed(!desktopCollapsed)} />

      <div className={cn("relative z-10 transition-all duration-300", desktopCollapsed ? "lg:pl-0" : "lg:pl-64")} style={{ "--sidebar-offset": desktopCollapsed ? "0px" : "256px" } as CSSProperties}>
        <header className="sticky top-0 z-30 flex h-20 items-center border-b border-zinc-200 bg-white/80 px-4 backdrop-blur-xl transition-colors sm:px-6 lg:px-8 dark:border-white/10 dark:bg-[#14151b]">
          <button onClick={() => { setSidebarOpen(true); setDesktopCollapsed(false); }} className={cn("mr-3 rounded-xl border border-zinc-200 p-2.5 text-zinc-500 dark:border-white/15 dark:text-[#f4f6f8]/80 hover:bg-zinc-50 dark:hover:bg-white/10 transition-colors", desktopCollapsed ? "block" : "lg:hidden")}><Menu size={19} /></button>
          <div className="hidden sm:block">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">{role === 'librarian' ? 'Librarian workspace' : role === 'staff' ? 'Staff workspace' : role === 'faculty' ? 'Faculty portal' : 'Student portal'}</p>
            <p className="mt-0.5 font-display text-sm font-bold text-zinc-900 dark:text-white">{current?.label ?? 'Smart Library'}</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {role === 'student' || role === 'faculty' ? (
              <NotificationBell role={role} />
            ) : (
              <button
                type="button"
                onClick={() => navigate(role === 'librarian' ? '/librarian/notifications' : '/staff/announcements')}
                aria-label="Notifications"
                className="relative rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-500 transition hover:bg-zinc-50 dark:border-white/15 dark:bg-white/10 dark:text-[#f4f6f8]/80 dark:hover:bg-white/15"
              >
                <Bell size={18} />
                {hasAdminAlerts ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#FFF200] ring-2 ring-white dark:ring-[#14151b]" /> : null}
              </button>
            )}
            <AccountMenu role={role} onRequestSignOut={() => setShowLogoutConfirm(true)} />
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8"><Outlet /></main>
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
