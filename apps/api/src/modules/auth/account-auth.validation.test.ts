import assert from 'node:assert/strict'
import test from 'node:test'
import { validateAccountRegistration, validateRoleLogin } from './account-auth.validation.ts'

test('registration validator trims identity fields and accepts the mobile form contract', () => {
  const result = validateAccountRegistration({
    school_id: ' sti-2026-1234 ', first_name: '  Juan  ', last_name: '  Dela   Cruz ',
    school_email: ' Juan.1234@ormoc.sti.edu.ph ', program_strand: ' Bachelor of Science in Information Technology ', year_grade_level: ' 2nd Year ',
    password: 'LibraryPass9', confirm_password: 'LibraryPass9',
  })
  assert.equal(result.isValid, true)
  assert.equal(result.schoolId, 'STI-2026-1234')
  assert.equal(result.firstName, 'Juan')
  assert.equal(result.lastName, 'Dela Cruz')
  assert.equal(result.role, 'Student')
  assert.equal(result.schoolEmail, 'juan.1234@ormoc.sti.edu.ph')
})

test('Faculty registration accepts optional academic fields but requires school email', () => {
  const result = validateAccountRegistration({
    role: 'Faculty', school_id: 'FAC-104', school_email: 'faculty.104@ormoc.sti.edu.ph',
    first_name: 'Campus', last_name: 'Faculty', password: 'LibraryPass9', confirm_password: 'LibraryPass9',
  })
  assert.equal(result.isValid, true)
  assert.equal(result.role, 'Faculty')
  assert.equal(validateAccountRegistration({ ...result, role: 'Staff' }).isValid, false)
  assert.equal(validateAccountRegistration({ ...result, role: 'Librarian' }).isValid, false)
  assert.equal(validateAccountRegistration({ ...result, role: 'Admin' }).isValid, false)
})

test('registration validator returns field errors for missing data and mismatched confirmation', () => {
  const result = validateAccountRegistration({
    school_id: ' ', first_name: '', last_name: '',
    program_strand: '', year_grade_level: '', password: 'Password9', confirm_password: 'Different9',
  })
  assert.equal(result.isValid, false)
  assert.equal(result.errors.school_id, 'School ID is required.')
  assert.equal(result.errors.first_name, 'First name is required.')
  assert.equal(result.errors.last_name, 'Last name is required.')
  assert.equal(result.errors.confirm_password, 'Password confirmation does not match.')
})

test('login validator requires school ID and password', () => {
  const invalid = validateRoleLogin({ school_id: '', password: '' })
  assert.equal(invalid.isValid, false)
  assert.ok(invalid.errors.school_id)
  assert.ok(invalid.errors.password)
})
