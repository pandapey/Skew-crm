import { validatePassword } from '@/features/admin/password'

export const EMPTY_USER_FORM = {
  name: '', email: '', phone: '', department: '', designation: '', employeeId: '',
  role: 'Employee', status: 'Active',
  gender: '',
  password: '', confirmPassword: '',
  employmentType: 'Full-time', joiningDate: '',
  reportingManager: '', shift: '',
  experienceYears: '', emergencyContact: '', salaryCtc: '',
  clientId: '',
  avatar: '',
  dob: '', address: '', bloodGroup: '', maritalStatus: 'Single',
}

export const EMPTY_EDUCATION_ROW = {
  qualification: '', institution: '', fieldOfStudy: '', startYear: '', endYear: '', grade: '',
}

export const EMPTY_EMERGENCY_ROW = { name: '', relation: '', phone: '' }

export const EMPTY_BANK = { name: '', account: '', ifsc: '' }
export function blankUserForm(overrides = {}) {
  return {
    ...EMPTY_USER_FORM,
    education: [{ ...EMPTY_EDUCATION_ROW }],
    bank: { ...EMPTY_BANK },
    emergencyContacts: [{ ...EMPTY_EMERGENCY_ROW }],
    ...overrides,
  }
}

export const MARITAL_STATUS_OPTIONS = ['Single', 'Married', 'Other']
export const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export const EDUCATION_YEAR_OPTIONS = (() => {
  const current = new Date().getFullYear()
  const years = []
  for (let y = current; y >= 1980; y -= 1) years.push(String(y))
  return years
})()

export const STAFF_FORM_ROLES = ['Employee', 'Manager']
export const GENDER_OPTIONS = ['Male', 'Female']

export const ROLE_FIELDS = {
  Admin: { hr: false, client: false, gender: true, reportingManager: false },
  Manager: { hr: true, client: false, gender: true, reportingManager: false },
  Employee: { hr: true, client: false, gender: true, reportingManager: true },
  Client: { hr: false, client: true, gender: false, reportingManager: false },
}

export const roleFields = (role) => ROLE_FIELDS[role] || ROLE_FIELDS.Employee

export function validateUserForm(form, mode = 'add') {
  const e = {}
  const isClient = form.role === 'Client'

  if (!form.name || form.name.trim().length < 2) e.name = 'Full name is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'

  if (mode === 'add') {
    const { valid } = validatePassword(form.password)
    if (!valid) e.password = 'Password must be 8–64 chars with upper, lower, number & special'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
  }

  if (!isClient && mode === 'add' && !form.gender) e.gender = 'Gender is required'

  if (!isClient && mode === 'add' && STAFF_FORM_ROLES.includes(form.role)) {
    const educations = Array.isArray(form.education) ? form.education : []
    const filledEducations = educations.filter((r) => r && (r.qualification || r.institution || r.fieldOfStudy || r.startYear || r.endYear || r.grade))
    if (filledEducations.length > 4) {
      e.education = 'At most 4 education entries are allowed'
    } else if (filledEducations.some((r) => !String(r.qualification || '').trim() || !String(r.institution || '').trim())) {
      e.education = 'Every education row needs a qualification and an institution'
    }

    const bank = form.bank || {}
    const hasBank = Boolean(bank.name?.trim() || bank.account?.trim() || bank.ifsc?.trim())
    if (hasBank) {
      if (!String(bank.name || '').trim()) {
        e.bank = 'Bank name is required when account details are given'
      } else if (String(bank.account || '').trim() && String(bank.account).trim().length < 6) {
        e.bank = 'Account number looks too short'
      } else if (String(bank.ifsc || '').trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(String(bank.ifsc).trim())) {
        e.bank = 'IFSC must look like SBIN0001234'
      }
    }

    const contacts = Array.isArray(form.emergencyContacts) ? form.emergencyContacts : []
    const filledContacts = contacts.filter((r) => r && (r.name || r.relation || r.phone))
    if (filledContacts.length > 3) {
      e.emergencyContacts = 'At most 3 emergency contacts are allowed'
    } else if (filledContacts.some((r) => !String(r.name || '').trim())) {
      e.emergencyContacts = 'Every emergency contact needs a name'
    }
  }

  if (isClient && mode === 'add' && !form.clientId) {
    e.clientId = 'Select the client profile this login belongs to'
  }

  return e
}

export function buildUserPayload(form, mode = 'add') {
  const isClient = form.role === 'Client'
  const isStaff = STAFF_FORM_ROLES.includes(form.role)
  const fields = roleFields(form.role)

  const payload = {
    name: form.name.trim(), email: form.email.trim(), phone: form.phone,
    role: form.role, status: form.status, avatar: form.avatar || undefined,
  }

  if (fields.hr) {
    payload.department = form.department
    payload.designation = form.designation
  }
  if (!isClient) payload.gender = form.gender || null

  if (isStaff) {
    payload.employmentType = form.employmentType
    payload.joiningDate = form.joiningDate || undefined
    payload.reportingManager = form.reportingManager
    payload.shift = form.shift
    payload.experienceYears = form.experienceYears
    payload.emergencyContact = form.emergencyContact
    payload.salaryCtc = form.salaryCtc === '' ? 0 : Number(form.salaryCtc)
    if (mode === 'add') {
      payload.dob = form.dob || undefined
      payload.address = form.address
      payload.bloodGroup = form.bloodGroup
      payload.maritalStatus = form.maritalStatus
      const educations = (Array.isArray(form.education) ? form.education : []).filter(
        (r) => r && (r.qualification || r.institution || r.fieldOfStudy || r.startYear || r.endYear || r.grade)
      )
      if (educations.length) payload.education = educations
      if (form.bank && (form.bank.name?.trim() || form.bank.account?.trim() || form.bank.ifsc?.trim())) {
        payload.bank = form.bank
      }
      const contacts = (Array.isArray(form.emergencyContacts) ? form.emergencyContacts : []).filter(
        (r) => r && (r.name || r.relation || r.phone)
      )
      if (contacts.length) payload.emergencyContacts = contacts
    }
  }

  if (mode === 'add') {
    payload.password = form.password
    if (isClient) payload.clientId = form.clientId
  }

  return payload
}

export function toUserFormValues(row) {
  return {
    ...blankUserForm(),
    name: row.name, email: row.email, phone: row.phone || '', department: row.department || '',
    designation: row.designation || '',
    employeeId: row.empCode || '',
    role: row.role,
    status: row.status || 'Active',
    gender: row.gender || '',
    password: '', confirmPassword: '', avatar: row.avatar || '',
    employmentType: row.employmentType || 'Full-time',
    reportingManager: row.reportingManager || '', shift: row.shift || '',
    joiningDate: row.joiningDate ? String(row.joiningDate).slice(0, 10) : '',
    experienceYears: row.experienceYears || '', emergencyContact: row.emergencyContact || '',
    salaryCtc: row.salaryCtc || '',
    dob: row.dob ? String(row.dob).slice(0, 10) : '',
    address: row.address || '',
    bloodGroup: row.bloodGroup || '',
    maritalStatus: row.maritalStatus || 'Single',
    education: Array.isArray(row.education) && row.education.length
      ? row.education.map((r) => ({ ...EMPTY_EDUCATION_ROW, ...r }))
      : [{ ...EMPTY_EDUCATION_ROW }],
    bank: { ...EMPTY_BANK, ...(row.bank || {}) },
    emergencyContacts: Array.isArray(row.emergencyContacts) && row.emergencyContacts.length
      ? row.emergencyContacts.map((r) => ({ ...EMPTY_EMERGENCY_ROW, ...r }))
      : [{ ...EMPTY_EMERGENCY_ROW }],
    clientId: row.clientId || '',
  }
}
