import { Eye, EyeOff, IdCard, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../theme/ThemeToggle'
import { AuthenticationError, registerStudent, resendRegistrationCode, verifyRegistration, type StudentRegistrationInput } from './auth-api'
import { CAMPUS_PROGRAM_GROUPS } from './campus-programs'

const SCHOOL_ID = /^[A-Z0-9][A-Z0-9._-]{2,49}$/
const SCHOOL_EMAIL = /^[^\s@]+@ormoc\.sti\.edu\.ph$/i
const roles = ['Student', 'Faculty'] as const
const initialForm: StudentRegistrationInput = {
  role: 'Student', school_id: '', school_email: '', first_name: '', last_name: '', program_strand: '',
  year_grade_level: '', password: '', confirm_password: '',
}

const fieldClass = 'h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#0b5ea2] focus:ring-4 focus:ring-[#0b5ea2]/10 dark:border-white/15 dark:bg-[#22232e] dark:text-white dark:focus:border-[#FFF200] dark:focus:ring-[#FFF200]/10'

export function RegistrationPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [verification, setVerification] = useState(false)
  const [approvalPending, setApprovalPending] = useState(false)
  const [code, setCode] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [registrationUnavailable, setRegistrationUnavailable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)

  const schoolEmail = form.school_email?.trim().toLowerCase() ?? ''

  function update(field: keyof StudentRegistrationInput, value: string) {
    setForm((current) => {
      const next = { ...current, [field]: value }
      if (field === 'role' && value === 'Faculty') {
        next.program_strand = ''
        next.year_grade_level = ''
      }
      return next
    })
    setErrors((current) => {
      const next = { ...current }
      delete next[field]
      if (field === 'role') {
        delete next.program_strand
        delete next.year_grade_level
      }
      return next
    })
  }

  function validate() {
    const next: Record<string, string> = {}
    const schoolId = form.school_id.trim().toUpperCase()
    if (!schoolId) next.school_id = 'School ID is required.'
    else if (!SCHOOL_ID.test(schoolId)) next.school_id = 'Enter a valid STI School ID.'
    if (!form.first_name.trim()) next.first_name = 'First name is required.'
    if (!form.last_name.trim()) next.last_name = 'Last name is required.'
    if (!form.school_email?.trim()) next.school_email = 'School email is required.'
    else if (!SCHOOL_EMAIL.test(form.school_email.trim())) next.school_email = 'Use your @ormoc.sti.edu.ph email.'
    if (form.role === 'Student') {
      if (!form.program_strand) next.program_strand = 'Program or pathway is required.'
      if (!form.year_grade_level) next.year_grade_level = 'Year or grade level is required.'
    }
    if (!form.password) next.password = 'Password is required.'
    else if (form.password.length < 8) next.password = 'Password must contain at least 8 characters.'
    if (!form.confirm_password) next.confirm_password = 'Confirm your password.'
    else if (form.password !== form.confirm_password) next.confirm_password = 'Password confirmation does not match.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!validate()) { setMessage('Please correct the highlighted fields.'); return }
    setBusy(true); setMessage(''); setRegistrationUnavailable(false)
    const schoolId = form.school_id.trim().toUpperCase()
    try {
      await registerStudent({
        ...form, school_id: schoolId, first_name: form.first_name.trim(), last_name: form.last_name.trim(),
        school_email: schoolEmail,
        program_strand: form.role === 'Student' ? form.program_strand : undefined,
        year_grade_level: form.role === 'Student' ? form.year_grade_level : undefined,
      })
      setErrors({})
      setMessage(`Check your school Outlook inbox for ${schoolEmail}. Enter the six-digit code below. It expires in about 10 minutes.`)
      setVerification(true)
    } catch (error) {
      const authError = error instanceof AuthenticationError ? error : new AuthenticationError('Unable to create your account right now.')
      setErrors(authError.errors)
      if (authError.code === 'EMAIL_SENDER_NOT_CONFIGURED' || authError.code === 'EMAIL_DELIVERY_UNAVAILABLE') {
        setMessage('We could not send a verification email to your school Outlook inbox. Please try again later or contact the library.')
      } else {
        setMessage(authError.message)
      }
      setRegistrationUnavailable(authError.code === 'REGISTRATION_UNAVAILABLE')
    } finally { setBusy(false) }
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const result = await verifyRegistration(form.school_id.trim().toUpperCase(), code)
      if (result.status === 'PendingApproval') {
        setMessage('Your school email is verified. A librarian must approve your account before you can sign in.')
        setApprovalPending(true)
        setCode('')
        setForm(current => ({ ...current, password: '', confirm_password: '' }))
      } else {
        navigate('/login', { replace: true, state: { registrationSuccess: true, registrationSchoolId: form.school_id.trim().toUpperCase() } })
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to verify your code.') }
    finally { setBusy(false) }
  }

  async function resendCode() {
    setBusy(true); setMessage('')
    try {
      await resendRegistrationCode(form.school_id.trim().toUpperCase())
      setMessage(`A new code was sent to ${schoolEmail}. Check your school Outlook inbox (and spam).`)
    } catch (error) {
      const authError = error instanceof AuthenticationError ? error : null
      if (authError?.code === 'EMAIL_SENDER_NOT_CONFIGURED' || authError?.code === 'EMAIL_DELIVERY_UNAVAILABLE') {
        setMessage('We could not resend the verification email. Please try again later or contact the library.')
      } else {
        setMessage(error instanceof Error ? error.message : 'Unable to resend the code.')
      }
    } finally { setBusy(false) }
  }

  return (
    <main className="public-surface relative grid min-h-screen bg-zinc-50 transition-colors lg:grid-cols-[1.05fr_.95fr] dark:bg-[#121219]">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6"><ThemeToggle /></div>

      <section
        className="relative hidden overflow-hidden bg-cover bg-center bg-no-repeat lg:flex lg:flex-col lg:justify-between border-r border-zinc-200 dark:border-zinc-800"
        style={{ backgroundImage: "url('/library-hero.webp')" }}
      >
        <div className="absolute inset-0 bg-[#0b5ea2]/85 dark:bg-[#001133]/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b5ea2] via-transparent to-transparent opacity-80" />

        <div className="relative p-12 text-white flex flex-col justify-between h-full z-10">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="STI College Ormoc Logo" className="w-32 h-auto object-contain rounded-lg" />
            <div>
              <p className="font-display text-lg font-black">STI COLLEGE ORMOC</p>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-white/70">Online Library</p>
            </div>
          </div>

          <div className="max-w-xl">
            <span className="inline-flex rounded-full border border-[#FFF200]/40 bg-[#FFF200]/10 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[#FFF200] backdrop-blur-md">
              New campus account
            </span>
            <h1 className="mt-7 font-display text-5xl font-black leading-tight text-white">
              Create your library account.
            </h1>
            <ol className="mt-8 space-y-3 text-sm leading-6 text-white/85">
              <li><span className="font-black text-[#FFF200]">1.</span> Submit your Student or Faculty details.</li>
              <li><span className="font-black text-[#FFF200]">2.</span> Enter the code sent to your school Outlook email.</li>
              <li><span className="font-black text-[#FFF200]">3.</span> Wait for librarian approval before signing in.</li>
            </ol>
          </div>

          <div className="flex items-center gap-3 text-sm text-white/70">
            <ShieldCheck className="text-[#FFF200]" size={20} />
            <span>School email verification before account approval</span>
          </div>
        </div>
      </section>

      <section className="relative flex items-center justify-center p-5 sm:p-10 z-10">
        <div className="w-full max-w-xl">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/logo.png" alt="STI College Ormoc Logo" className="w-32 h-auto object-contain rounded-lg" />
            <div>
              <p className="font-display text-lg font-black text-zinc-900 dark:text-white">STI COLLEGE ORMOC</p>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-zinc-500 dark:text-zinc-400">Online Library</p>
            </div>
          </div>

          <p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500 dark:text-zinc-400">New account</p>
          <h2 className="mt-2 font-display text-4xl font-black tracking-tight text-zinc-900 dark:text-white">Register</h2>

          {message ? (
            <div role="alert" className="mt-6 rounded-xl border border-[#0b5ea2]/20 bg-[#FFF200] px-4 py-3 text-sm font-semibold text-[#0b5ea2] dark:border-[#FFF200]/30 dark:bg-[#FFF200]/10 dark:text-[#FFF200]">
              {message}
              {registrationUnavailable ? <Link to="/login" className="mt-2 block underline underline-offset-4">Go to Sign In</Link> : null}
            </div>
          ) : null}

          {approvalPending ? (
            <div className="mt-7 rounded-xl border border-zinc-200 p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
              <p className="font-bold text-zinc-900 dark:text-white">Registration received</p>
              <p className="mt-2 leading-6">
                Your school email is verified. A librarian will review your request. You can sign in after approval.
              </p>
              <Link to="/login" className="mt-4 inline-block font-bold text-[#0b5ea2] underline dark:text-[#FFF200]">Return to Login</Link>
            </div>
          ) : verification ? (
            <form className="mt-7 space-y-4" onSubmit={submitCode}>
              <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                We sent a six-digit code to <strong className="text-zinc-900 dark:text-white">{schoolEmail}</strong>. Open your school Outlook inbox, then enter the code here. Codes expire in about 10 minutes.
              </p>
              <Field label="Verification code">
                <input
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={code}
                  onChange={event => setCode(event.target.value.replace(/\D/g, ''))}
                  placeholder="Six-digit code"
                  className={fieldClass}
                />
              </Field>
              <button disabled={busy || code.length !== 6} className="flex h-12 w-full items-center justify-center rounded-xl bg-[#0b5ea2] text-sm font-black text-white disabled:opacity-50 dark:bg-[#FFF200] dark:text-[#0b5ea2]">
                Verify school email
              </button>
              <button type="button" disabled={busy} onClick={() => void resendCode()} className="text-sm font-bold text-[#0b5ea2] underline dark:text-[#FFF200]">
                Resend code
              </button>
            </form>
          ) : (
            <form className="mt-7 grid gap-4 sm:grid-cols-2" onSubmit={submit} noValidate>
              <Field label="Register as" error={errors.role}>
                <select value={form.role} onChange={event => update('role', event.target.value)} className={fieldClass} aria-describedby="register-role-help">
                  {roles.map(role => <option key={role}>{role}</option>)}
                </select>
              </Field>
              <p id="register-role-help" className="self-end text-xs leading-5 text-zinc-500 dark:text-zinc-400 sm:pb-3">
                Librarian and Staff accounts are created by the library, not this form.
              </p>
              <Field label="First Name" error={errors.first_name}>
                <span className="relative block">
                  <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={17} />
                  <input autoFocus autoComplete="given-name" value={form.first_name} onChange={(event) => update('first_name', event.target.value)} placeholder="First name" className={`${fieldClass} pl-11`} />
                </span>
              </Field>
              <Field label="Last Name" error={errors.last_name}>
                <input autoComplete="family-name" value={form.last_name} onChange={(event) => update('last_name', event.target.value)} placeholder="Last name" className={fieldClass} />
              </Field>
              <Field label="School Email" error={errors.school_email}>
                <span className="relative block">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={17} />
                  <input type="email" autoComplete="email" value={form.school_email} onChange={(event) => update('school_email', event.target.value)} placeholder="name@ormoc.sti.edu.ph" className={`${fieldClass} pl-11`} />
                </span>
              </Field>
              <Field label="School ID" error={errors.school_id}>
                <span className="relative block">
                  <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={17} />
                  <input autoComplete="username" value={form.school_id} onChange={(event) => update('school_id', event.target.value)} placeholder="STI-2026-XXXX" className={`${fieldClass} pl-11 uppercase placeholder:normal-case`} />
                </span>
              </Field>
              {form.role === 'Student' ? (
                <>
                  <Field label="Program / Strand" error={errors.program_strand}>
                    <select value={form.program_strand} onChange={(event) => update('program_strand', event.target.value)} className={fieldClass}>
                      <option value="">Select program or pathway</option>
                      {CAMPUS_PROGRAM_GROUPS.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.options.map((option) => <option key={option}>{option}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </Field>
                  <Field label="Year / Grade Level" error={errors.year_grade_level}>
                    <select value={form.year_grade_level} onChange={(event) => update('year_grade_level', event.target.value)} className={fieldClass}>
                      <option value="">Select year or grade level</option>
                      <option>Grade 11</option>
                      <option>Grade 12</option>
                      <option>1st Year</option>
                      <option>2nd Year</option>
                      <option>3rd Year</option>
                      <option>4th Year</option>
                    </select>
                  </Field>
                </>
              ) : null}
              <Field label="Password" error={errors.password}>
                <span className="relative block">
                  <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={17} />
                  <input type={showPasswords ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="At least 8 characters" className={`${fieldClass} pl-11 pr-11`} />
                  <button type="button" onClick={() => setShowPasswords((current) => !current)} aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    {showPasswords ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </Field>
              <Field label="Confirm Password" error={errors.confirm_password}>
                <input type={showPasswords ? 'text' : 'password'} autoComplete="new-password" value={form.confirm_password} onChange={(event) => update('confirm_password', event.target.value)} placeholder="Repeat your password" className={fieldClass} />
              </Field>
              <button disabled={busy} className="mt-2 flex h-12 items-center justify-center rounded-xl bg-[#0b5ea2] px-5 text-sm font-black text-white shadow-lg shadow-[#0b5ea2]/15 transition hover:bg-[#002266] active:scale-95 disabled:cursor-wait disabled:opacity-60 sm:col-span-2 dark:bg-[#FFF200] dark:text-[#0b5ea2] dark:hover:bg-yellow-400">
                {busy ? 'Creating account…' : 'Register'}
              </button>
            </form>
          )}

          <p className="mt-7 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Already registered?{' '}
            <Link to="/login" className="font-black text-[#0b5ea2] underline decoration-[#0b5ea2]/30 decoration-2 underline-offset-4 hover:decoration-[#0b5ea2] dark:text-[#FFF200] dark:decoration-[#FFF200]/30 dark:hover:decoration-[#FFF200] transition-colors">
              Sign In Here
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-zinc-700 dark:text-zinc-300">{label}</span>
      {children}
      {error ? <span className="mt-1.5 block text-xs font-bold text-red-500">{error}</span> : null}
    </label>
  )
}
