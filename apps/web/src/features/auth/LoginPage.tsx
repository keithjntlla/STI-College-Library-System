import { Eye, EyeOff, IdCard, LockKeyhole } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../theme/ThemeToggle'
import { login, AuthenticationError } from './auth-api'
import { clearAccessToken, dashboardForRole, getCurrentClaims, saveAccessToken } from './auth-storage'

const SCHOOL_ID = /^[A-Z0-9][A-Z0-9._-]{2,49}$/

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [schoolId, setSchoolId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function safeReturnPath(value: unknown) {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null
    return value
  }

  useEffect(() => {
    const claims = getCurrentClaims()
    const state = location.state as { deniedPath?: string; registrationSuccess?: boolean; registrationSchoolId?: string; returnTo?: string } | null
    const returnTo = safeReturnPath(state?.returnTo)
    if (claims) navigate(returnTo ?? dashboardForRole(claims.role), { replace: true })
    else if (state?.registrationSuccess || new URLSearchParams(location.search).has('registered')) {
      if (state?.registrationSchoolId) setSchoolId(state.registrationSchoolId)
      setMessage('Your school email is verified. Sign in using your School ID and password.')
    } else if (state?.deniedPath) {
      setMessage('Your account cannot open that page. Please sign in with an authorized account.')
    }
  }, [location.search, location.state, navigate])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const normalizedSchoolId = schoolId.trim().toUpperCase()
    const nextErrors: Record<string, string> = {}
    if (!normalizedSchoolId) nextErrors.school_id = 'School ID is required.'
    else if (!SCHOOL_ID.test(normalizedSchoolId)) nextErrors.school_id = 'Enter a valid STI school ID.'
    if (!password) nextErrors.password = 'Password is required.'
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); setMessage(''); return }

    setBusy(true); setErrors({}); setMessage('')
    try {
      const result = await login(normalizedSchoolId, 'Student', password)
      if (result.user.role === 'Librarian' || result.user.role === 'Admin' || result.user.role === 'Staff') {
        clearAccessToken()
        throw new AuthenticationError('The School ID or password is incorrect.', 'INVALID_CREDENTIALS')
      }
      saveAccessToken(result.token)
      const state = location.state as { returnTo?: string } | null
      navigate(safeReturnPath(state?.returnTo) ?? dashboardForRole(result.user.role), { replace: true })
    } catch (error) {
      const authError = error instanceof AuthenticationError ? error : new AuthenticationError('Unable to sign in right now.')
      setErrors(authError.errors)
      setMessage(authError.message)
    } finally { setBusy(false) }
  }

  return (
    <main className="public-surface relative grid min-h-screen bg-zinc-50 transition-colors lg:grid-cols-[1.05fr_.95fr] dark:bg-[#121219]">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6"><ThemeToggle /></div>
      
      {/* High-Tech Blueprint Left Panel */}
      <section className="relative hidden overflow-hidden bg-cover bg-center bg-no-repeat lg:flex lg:flex-col lg:justify-between border-r border-zinc-200 dark:border-zinc-800"
        style={{ backgroundImage: "url('/library-hero.webp')" }}
      >
        {/* Overlays to match PublicCatalog */}
        <div className="absolute inset-0 bg-[#0b5ea2]/85 dark:bg-[#001133]/90"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b5ea2] via-transparent to-transparent opacity-80"></div>

        <div className="relative z-10 h-full p-12 text-white">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="STI College Ormoc Logo" className="w-32 h-auto object-contain rounded-lg" />
            <div>
              <p className="font-display text-lg font-black">STI COLLEGE ORMOC</p>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-white/70">Online Library</p>
            </div>
          </div>

          <div className="absolute inset-0 flex items-center px-12">
            <h1 className="max-w-xl text-left font-display text-5xl font-black leading-tight text-white">
              STI College Ormoc Online Library
            </h1>
          </div>
        </div>
      </section>

      {/* Right Login Panel */}
      <section className="relative flex items-center justify-center p-5 sm:p-10 z-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/logo.png" alt="STI College Ormoc Logo" className="w-32 h-auto object-contain rounded-lg" />
            <div>
              <p className="font-display text-lg font-black text-zinc-900 dark:text-white">STI COLLEGE ORMOC</p>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-zinc-500 dark:text-zinc-400">Online Library</p>
            </div>
          </div>
          
          <p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500 dark:text-zinc-400">Welcome back</p>
          <h2 className="mt-2 font-display text-4xl font-black tracking-tight text-zinc-900 dark:text-white">Login</h2>
          
          {message ? (
            <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              {message}
            </div>
          ) : null}
          
          <form className="mt-7 space-y-5" onSubmit={submit} noValidate>
            <label className="block">
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">School ID</span>
              <span className="relative mt-2 block">
                <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#0b5ea2]" size={18} />
                <input 
                  autoComplete="username" 
                  autoFocus 
                  value={schoolId} 
                  onChange={(event) => setSchoolId(event.target.value)} 
                  placeholder="Enter your Student or Faculty ID" 
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
              {busy ? 'Verifying account…' : 'Log In'}
            </button>
          </form>
          
          <p className="mt-7 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-black text-[#0b5ea2] underline decoration-[#0b5ea2]/30 decoration-2 underline-offset-4 hover:decoration-[#0b5ea2] dark:text-[#FFF200] dark:decoration-[#FFF200]/30 dark:hover:decoration-[#FFF200] transition-colors">
              Register an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
