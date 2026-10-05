import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { RegistrationPage } from './RegistrationPage'
import { AdminLoginPage } from './AdminLoginPage'
import { ThemeProvider } from '../theme/ThemeProvider'

describe('authentication pages', () => {
  it('shows the school-ID login contract with a registration link', () => {
    render(<MemoryRouter><ThemeProvider><LoginPage /></ThemeProvider></MemoryRouter>)
    expect(screen.getByLabelText('School ID')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Register an account' }).getAttribute('href')).toBe('/register')
  })

  it('shows Student/Faculty account registration and school email', () => {
    render(<MemoryRouter><ThemeProvider><RegistrationPage /></ThemeProvider></MemoryRouter>)
    for (const label of ['Register as', 'First Name', 'Last Name', 'School Email', 'School ID', 'Program / Strand', 'Year / Grade Level', 'Password', 'Confirm Password']) {
      expect(screen.getByLabelText(label)).toBeTruthy()
    }
    expect(screen.getByLabelText('Register as').textContent).toContain('Student')
    expect(screen.getByLabelText('Register as').textContent).toContain('Faculty')
    expect(screen.getByLabelText('Register as').textContent).not.toContain('Librarian')
    expect(screen.getByLabelText('Register as').textContent).not.toContain('Staff')
    expect(screen.queryByLabelText('Contact Number')).toBeNull()
    expect(screen.getByRole('button', { name: 'Register' })).toBeTruthy()
  })

  it('hides academic fields when Faculty is selected', () => {
    render(<MemoryRouter><ThemeProvider><RegistrationPage /></ThemeProvider></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Register as'), { target: { value: 'Faculty' } })
    expect(screen.queryByLabelText('Program / Strand')).toBeNull()
    expect(screen.queryByLabelText('Year / Grade Level')).toBeNull()
  })

  it('directs an existing registrant to sign in without claiming the new password was saved', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      headers: { get: () => 'application/json' },
      json: async () => ({ code: 'REGISTRATION_UNAVAILABLE', message: 'These details may already be in the library system. The password entered here was not saved.' }),
    }))
    render(<MemoryRouter><ThemeProvider><RegistrationPage /></ThemeProvider></MemoryRouter>)
    for (const [label, value] of [
      ['First Name', 'Example'], ['Last Name', 'Student'], ['School Email', 'example@ormoc.sti.edu.ph'],
      ['School ID', 'STUDENT-123'], ['Password', 'ExamplePass123'], ['Confirm Password', 'ExamplePass123'],
      ['Program / Strand', 'Bachelor of Science in Information Technology'], ['Year / Grade Level', '4th Year'],
    ]) fireEvent.change(screen.getByLabelText(label), { target: { value } })
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))
    expect((await screen.findByRole('alert')).textContent).toContain('password entered here was not saved')
    expect(screen.getByRole('link', { name: 'Go to Sign In' }).getAttribute('href')).toBe('/login')
  })

  it('shows an approval wait after a Student verifies the school email', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (input: string) => ({
      ok: true, headers: { get: () => 'application/json' },
      json: async () => ({ data: String(input).endsWith('/verify') ? { status: 'PendingApproval', role: 'Student' } : { requestId: 5, status: 'PendingEmail' } }),
    })))
    render(<MemoryRouter><ThemeProvider><RegistrationPage /></ThemeProvider></MemoryRouter>)
    for (const [label, value] of [
      ['First Name', 'Example'], ['Last Name', 'Student'], ['School Email', 'example@ormoc.sti.edu.ph'],
      ['School ID', 'STUDENT-123'], ['Password', 'ExamplePass123'], ['Confirm Password', 'ExamplePass123'],
      ['Program / Strand', 'Bachelor of Science in Information Technology'], ['Year / Grade Level', '4th Year'],
    ]) fireEvent.change(screen.getByLabelText(label), { target: { value } })
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))
    fireEvent.change(await screen.findByLabelText('Verification code'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify school email' }))
    expect((await screen.findByRole('alert')).textContent).toContain('approve your account')
    expect(screen.queryByRole('button', { name: 'Resend code' })).toBeNull()
    expect(screen.getByText(/librarian will review your request/i)).toBeTruthy()
  })

  it('provides a staff portal login for Librarian and Staff', () => {
    render(<MemoryRouter><ThemeProvider><AdminLoginPage /></ThemeProvider></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Staff login' })).toBeTruthy()
    expect(screen.getByLabelText('School ID')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Open staff portal' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Use the main login' }).getAttribute('href')).toBe('/login')
  })
})

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
