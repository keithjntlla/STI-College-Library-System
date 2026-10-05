import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ProfileAvatarPage } from './ProfileAvatarPage'

const api = vi.hoisted(() => ({ myProfile: vi.fn(), saveMyProfile: vi.fn() }))
vi.mock('./users-api', () => ({ usersApi: api }))
vi.mock('../auth/auth-storage', () => ({ getAccessToken: () => 'test-token' }))

beforeEach(() => {
  api.myProfile.mockResolvedValue({
    id: 9,
    role: 'Student',
    school_id: 'STI-9',
    email: 'student@ormoc.sti.edu.ph',
    first_name: 'Test',
    last_name: 'Student',
    program_strand: 'BSIT',
    year_grade_level: '2nd Year',
  })
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ data: { currentUrl: null, pending: null } }) })))
})
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals() })

it('shows identity fields as read-only and does not offer profile save', async () => {
  render(<ProfileAvatarPage />)
  expect((await screen.findByDisplayValue('student@ormoc.sti.edu.ph') as HTMLInputElement).readOnly).toBe(true)
  expect((screen.getByDisplayValue('STI-9') as HTMLInputElement).readOnly).toBe(true)
  expect((screen.getByRole('textbox', { name: 'First name' }) as HTMLInputElement).readOnly).toBe(true)
  expect((screen.getByRole('textbox', { name: 'Last name' }) as HTMLInputElement).readOnly).toBe(true)
  expect((screen.getByRole('textbox', { name: 'Program / strand' }) as HTMLInputElement).readOnly).toBe(true)
  expect((screen.getByRole('textbox', { name: 'Year / grade level' }) as HTMLInputElement).readOnly).toBe(true)
  expect(screen.queryByRole('button', { name: 'Save my profile' })).toBeNull()
  expect(api.saveMyProfile).not.toHaveBeenCalled()
  expect((screen.getByRole('button', { name: 'Submit for approval' }) as HTMLButtonElement).disabled).toBe(true)
})
