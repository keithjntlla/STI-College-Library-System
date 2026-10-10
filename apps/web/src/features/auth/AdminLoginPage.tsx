import { Eye, EyeOff, IdCard, LockKeyhole, ShieldCheck } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../theme/ThemeToggle'
import { AuthenticationError, login } from './auth-api'
import { clearAccessToken, dashboardForRole, getCurrentClaims, saveAccessToken, type AuthRole } from './auth-storage'

const SCHOOL_ID = /^[A-Z0-9][A-Z0-9._-]{2,49}$/
const STAFF_ROLES = new Set<AuthRole>(['Librarian', 'Admin', 'Staff'])

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [schoolId, setSchoolId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const claims = getCurrentClaims()
    if (claims && STAFF_ROLES.has(claims.role)) {
      navigate(dashboardForRole(claims.role), { replace: true })
    }
  }, [navigate])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const normalizedSchoolId = schoolId.trim().toUpperCase()
    const nextErrors: Record<string, string> = {}
    if (!normalizedSchoolId) nextErrors.school_id = 'Staff School ID is required.'
    else if (!SCHOOL_ID.test(normalizedSchoolId)) nextErrors.school_id = 'Enter a valid STI school ID.'
    if (!password) nextErrors.password = 'Password is required.'
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); setMessage(''); return }

    setBusy(true); setErrors({}); setMessage('')
    try {
      const result = await login(normalizedSchoolId, 'Librarian', password)
      if (!STAFF_ROLES.has(result.user.role)) {
        clearAccessToken()
        throw new AuthenticationError('This portal is for Librarian and Staff accounts. Students and Faculty should use the main login.', 'STAFF_ROLE_REQUIRED')
      }
      saveAccessToken(result.token)
      navigate(dashboardForRole(result.user.role), { replace: true })
    } catch (error) {
      const authError = error instanceof AuthenticationError ? error : new AuthenticationError('Unable to open the staff portal right now.')
      setErrors(authError.errors)
      setMessage(authError.message)
    } finally { setBusy(false) }
  }

  return (
    <main className="public-surface relative grid min-h-screen bg-zinc-50 transition-colors lg:grid-cols-[.95fr_1.05fr] dark:bg-[#121219]">
      <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6"><ThemeToggle /></div>

      {/* Form on the left */}
      <section className="relative order-1 flex items-center justify-center p-5 sm:p-10 z-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/logo.png" alt="STI College Ormoc Logo" className="w-32 h-auto object-contain rounded-lg" />
            <div>
              <p className="font-display text-lg font-black text-zinc-900 dark:text-white">STI COLLEGE ORMOC</p>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-zinc-500 dark:text-zinc-400">Staff portal</p>
            </div>
          </div>

          <p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500 dark:text-zinc-400">Authorized personnel</p>
          <h2 className="mt-2 font-display text-4xl font-black tracking-tight text-zinc-900 dark:text-white">Staff login</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Sign in with your Librarian or Staff School ID to open the library workspace.
          </p>

          {message ? (
            <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              {message}
            </div>
          ) : null}

          <form className="mt-7 space-y-5" onSubmit={submit} noValidate>
            <label className="block">
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">School ID</span>
              <span className="relative mt-2 block">
                <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  autoComplete="username"
                  autoFocus
                  value={schoolId}
                  onChange={(event) => setSchoolId(event.target.value)}
                  placeholder="Enter Librarian or Staff ID"
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-11 pr-4 text-sm uppercase text-zinc-900 outline-none transition placeholder:normal-case placeholder:text-zinc-400 focus:border-[#0b5ea2] focus:ring-4 focus:ring-[#0b5ea2]/10 dark:border-white/15 dark:bg-[#22232e] dark:text-white dark:focus:border-[#FFF200] dark:focus:ring-[#FFF200]/10"
                />
              </span>
              {errors.school_id ? <span className="mt-2 block text-xs font-bold text-red-500">{errors.school_id}</span> : null}
            </label>

            <label className="block">
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Password</span>
              <span className="relative mt-2 block">
                <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-11 pr-12 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#0b5ea2] focus:ring-4 focus:ring-[#0b5ea2]/10 dark:border-white/15 dark:bg-[#22232e] dark:text-white dark:focus:border-[#FFF200] dark:focus:ring-[#FFF200]/10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
              {errors.password ? <span className="mt-2 block text-xs font-bold text-red-500">{errors.password}</span> : null}
            </label>

            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm font-bold text-[#0b5ea2] hover:underline dark:text-[#FFF200]">
                Forgot Password?
              </Link>
            </div>

            <button
              disabled={busy}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#0b5ea2] px-5 text-sm font-black text-white shadow-lg shadow-[#0b5ea2]/15 transition hover:bg-[#002266] active:scale-95 disabled:cursor-wait disabled:opacity-60 disabled:active:scale-100 dark:bg-[#FFF200] dark:text-[#0b5ea2] dark:hover:bg-yellow-400"
            >
              {busy ? 'Verifying staff account…' : 'Open staff portal'}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Student or Faculty?{' '}
            <Link to="/login" className="font-black text-[#0b5ea2] underline decoration-[#0b5ea2]/30 decoration-2 underline-offset-4 hover:decoration-[#0b5ea2] dark:text-[#FFF200] dark:decoration-[#FFF200]/30 dark:hover:decoration-[#FFF200] transition-colors">
              Use the main login
            </Link>
          </p>
        </div>
      </section>

      {/* Hero on the right */}
      <section
        className="relative order-2 hidden overflow-hidden bg-cover bg-center bg-no-repeat lg:flex lg:flex-col lg:justify-between border-l border-zinc-200 dark:border-zinc-800"
        style={{ backgroundImage: "url('/library-hero.webp')" }}
      >
        <div className="absolute inset-0 bg-[#0b5ea2]/85 dark:bg-[#001133]/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b5ea2] via-transparent to-transparent opacity-80" />

        <div className="relative p-12 text-white flex flex-col justify-between h-full z-10">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="STI College Ormoc Logo" className="w-32 h-auto object-contain rounded-lg" />
            <div>
              <p className="font-display text-lg font-black">STI COLLEGE ORMOC</p>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-white/70">Library staff portal</p>
            </div>
          </div>

          <div className="max-w-xl">
            <span className="inline-flex rounded-full border border-[#FFF200]/40 bg-[#FFF200]/10 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[#FFF200] backdrop-blur-md">
              Librarian &amp; Staff access
            </span>
            <h1 className="mt-7 font-display text-5xl font-black leading-tight text-white">
              Manage the campus library desk.
            </h1>
          </div>

          <div className="flex items-center gap-3 text-sm text-white/70">
            <ShieldCheck className="text-[#FFF200]" size={20} />
            <span>Operations, accounts, and desk tools in one workspace</span>
          </div>
        </div>
      </section>
    </main>
  )
}
