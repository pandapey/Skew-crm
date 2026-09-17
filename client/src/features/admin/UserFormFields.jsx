import { useQuery } from '@tanstack/react-query'
import { FiCheckCircle, FiXCircle } from 'react-icons/fi'
import { Input, Select, MultiSelect } from '@/components/ui'
import { ProfileImageField } from '@/features/employees/ProfileImageField'
import { EMPLOYMENT_TYPES } from '@/features/employees/constants'
import { adminApi } from '@/api/adminApi'
import { hrApi, attendanceApi } from '@/api/services'
import { ALL_ROLES } from '@/constants'
import { USER_STATUSES } from '@/features/admin/constants'
import { PasswordField } from '@/features/admin/PasswordField'
import { PasswordStrength } from '@/features/admin/PasswordStrength'
import { GENDER_OPTIONS, roleFields } from './userForm'

export function UserFormFields({
  form, setField, errors = {}, mode = 'add', enabled = true, lockRole = false,
}) {
  const isClient = form.role === 'Client'
  const fields = roleFields(form.role)
  const passwordsMatch = form.password.length > 0 && form.password === form.confirmPassword

  const { data: deptData = [], isLoading: deptLoading } = useQuery({
    queryKey: ['hr-departments'],
    queryFn: () => hrApi.departments.all(),
    staleTime: 60_000,
    enabled,
  })
  const { data: desigData = [], isLoading: desigLoading } = useQuery({
    queryKey: ['hr-designations'],
    queryFn: () => hrApi.designations.all(),
    staleTime: 60_000,
    enabled,
  })
  const deptOptions = (Array.isArray(deptData) ? deptData : []).map((d) => ({
    value: d.name || d,
    label: d.name || String(d),
  }))
  const desigOptions = (Array.isArray(desigData) ? desigData : []).filter(
    (d) => !form.department || d.department === form.department
  ).map((d) => ({ value: d.title || d, label: d.title || String(d) }))

  const { data: shiftData = [], isLoading: shiftLoading } = useQuery({
    queryKey: ['attendance-shifts'],
    queryFn: () => attendanceApi.shifts.all(),
    staleTime: 60_000,
    enabled,
  })
  const shiftOptions = (Array.isArray(shiftData) ? shiftData : [])
    .filter((s) => s?.name)
    .map((s) => ({ value: s.name, label: s.start && s.end ? `${s.name} (${s.start}–${s.end})` : s.name }))

  const { data: clients = [] } = useQuery({
    queryKey: ['admin-clients', 'all'],
    queryFn: () => adminApi.clients.all(),
    enabled: enabled && isClient,
  })

  const { data: managerData, isLoading: managerLoading } = useQuery({
    queryKey: ['admin-users', 'reporting-manager'],
    queryFn: () => adminApi.users.query({ role: 'Manager', limit: 200 }),
    enabled: enabled && fields.reportingManager,
    staleTime: 60_000,
  })
  const managerOptions = (managerData?.data || []).map((u) => ({
    value: u.name,
    label: u.name,
    meta: [u.department, u.designation].filter(Boolean).join(' · '),
  }))

  return (
    <>
      {lockRole ? (
        <Input label="Role" value={form.role} readOnly disabled className="sm:col-span-2" />
      ) : (
        <Select label="Role" value={form.role} onChange={(e) => setField('role', e.target.value)}
          options={ALL_ROLES.map((r) => ({ value: r, label: r }))} className="sm:col-span-2" />
      )}

      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-sm font-medium text-muted">Profile Image</label>
        <ProfileImageField value={form.avatar} onChange={(v) => setField('avatar', v)} />
      </div>

      <Input label={fields.client ? 'Client Name' : 'Full Name'} placeholder=" " value={form.name} onChange={(e) => setField('name', e.target.value)} error={errors.name} />
      <Input label="Email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} error={errors.email} placeholder="jane@skew.com" />
      <Input label="Phone Number" value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+91 …" />

      {fields.hr && (
        <>
          <Input
            label="Employee ID"
            value={mode === 'add' ? 'Auto-generated (EMP001, EMP002, …)' : form.employeeId}
            readOnly
            disabled
          />
          {mode === 'edit' && (
            <p className="-mt-2 text-xs text-muted sm:col-span-2">
              The Employee ID is assigned when the account is created and is the key that links this person to their
              attendance, leave and payroll records, so it cannot be changed here.
            </p>
          )}
          <MultiSelect
            label="Department"
            singleSelect
            value={form.department ? [form.department] : []}
            onChange={(arr) => { setField('department', arr[0] || ''); setField('designation', '') }}
            options={deptOptions}
            loading={deptLoading}
            emptyText="No departments found"
            placeholder="Select department…"
            error={errors.department}
          />
          <MultiSelect
            label="Designation"
            singleSelect
            value={form.designation ? [form.designation] : []}
            onChange={(arr) => setField('designation', arr[0] || '')}
            options={desigOptions}
            loading={desigLoading}
            emptyText={form.department ? 'No designations for this department' : 'Select a department first'}
            placeholder="Select designation…"
            error={errors.designation}
          />
        </>
      )}

      {!fields.client && (
        <Select label="Status" value={form.status} onChange={(e) => setField('status', e.target.value)}
          options={USER_STATUSES.map((s) => ({ value: s, label: s }))} />
      )}

      {fields.gender && (
        <Select label="Gender" value={form.gender} onChange={(e) => setField('gender', e.target.value)}
          options={GENDER_OPTIONS.map((g) => ({ value: g, label: g }))}
          placeholder="Select gender" error={errors.gender} required aria-required="true" />
      )}

      {fields.hr && (
        <>
          <Select label="Employment Type" value={form.employmentType} onChange={(e) => setField('employmentType', e.target.value)}
            options={EMPLOYMENT_TYPES.map((t) => ({ value: t, label: t }))} />

          {fields.reportingManager && (
            <MultiSelect
              label="Reporting Manager"
              singleSelect
              value={form.reportingManager ? [form.reportingManager] : []}
              onChange={(arr) => setField('reportingManager', arr[0] || '')}
              options={managerOptions}
              loading={managerLoading}
              emptyText="No managers found"
              placeholder="Select reporting manager…"
            />
          )}

          <Select label="Shift" value={form.shift} onChange={(e) => setField('shift', e.target.value)}
            options={shiftOptions} loading={shiftLoading} emptyText="No shifts available"
            placeholder={shiftLoading ? 'Loading shifts…' : 'Select shift…'} />
          <Input label="Annual CTC (₹)" type="number" value={form.salaryCtc} onChange={(e) => setField('salaryCtc', e.target.value)} placeholder="e.g. 1200000" />
          <Input label="Joining Date" type="date" value={form.joiningDate} onChange={(e) => setField('joiningDate', e.target.value)} />
          <Input label="Experience" value={form.experienceYears} onChange={(e) => setField('experienceYears', e.target.value)} placeholder="e.g. 4 yrs" />
          <Input label="Emergency Contact" value={form.emergencyContact} onChange={(e) => setField('emergencyContact', e.target.value)} placeholder="+91 …" />
        </>
      )}

      {mode === 'add' && (
        <div className="grid grid-cols-1 items-start gap-4 sm:col-span-2 sm:grid-cols-2">
          <PasswordField label="Password" value={form.password} onChange={(e) => setField('password', e.target.value)} error={errors.password} />
          <div>
            <PasswordField label="Confirm Password" value={form.confirmPassword} onChange={(e) => setField('confirmPassword', e.target.value)} error={errors.confirmPassword} />
            {form.confirmPassword.length > 0 && !errors.confirmPassword && (
              <p className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {passwordsMatch ? <FiCheckCircle className="h-3.5 w-3.5 shrink-0" /> : <FiXCircle className="h-3.5 w-3.5 shrink-0" />}
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <PasswordStrength value={form.password} />
          </div>
        </div>
      )}

      {mode === 'edit' && (
        <p className="sm:col-span-2 rounded-xl bg-primary/5 px-3 py-2 text-xs text-muted">
          Passwords are managed via <b>Reset Password</b> — they cannot be edited here.
        </p>
      )}

      {fields.client && (
        <>
          <Select
            label="Assigned Client"
            value={form.clientId}
            onChange={(e) => setField('clientId', e.target.value)}
            error={errors.clientId}
            className="sm:col-span-2"
            options={[{ value: '', label: 'Select client…' }, ...clients.map((c) => ({ value: c.id || c.clientId, label: c.company || c.name }))]}
          />
          <p className="sm:col-span-2 rounded-xl bg-primary/5 px-3 py-2 text-xs text-muted">
            This links the portal login to an existing client. To add a client
            that is not listed, create it first in{' '}
            <b>Clients → Add Client</b> — that form owns company details,
            commercial terms, the Plan and (optionally) the portal login itself.
          </p>
        </>
      )}
    </>
  )
}
