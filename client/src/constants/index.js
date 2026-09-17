export const APP_NAME = 'EMS'
export const COMPANY_NAME = 'Skew Infotech Pvt. Ltd.'

export const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
  CLIENT: 'Client',
}

export const ALL_ROLES = Object.values(ROLES)

export const STAFF_ROLES = ALL_ROLES.filter((r) => r !== ROLES.CLIENT)

export const STORAGE_KEYS = {
  TOKEN: 'seh_token',
  REFRESH: 'seh_refresh',
  THEME: 'seh_theme',
}

export const LEAVE_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
}

export const PRIORITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
}

export const TASK_STATUS = {
  TODO: 'Todo',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  DONE: 'Done',
}
