import apiClient from '@/api/client'
import { ROLES } from '@/constants'

export const clientService = {

  getProfile: async () => apiClient.get('/client/profile'),

  getProjects: async () => apiClient.get('/client/projects'),

  getProject: async (user, projectId) => apiClient.get(`/client/projects/${projectId}`),

  getTeam: async (user, projectId) =>
    apiClient.get('/client/team', { params: projectId ? { projectId } : {} }),

  getActivity: async (user, projectId) =>
    apiClient.get('/client/activity', { params: projectId ? { projectId } : {} }),

  uploadProjectDocument: async (projectId, formData) =>
    apiClient.post(`/client/projects/${projectId}/documents`, formData),

  deleteProjectDocument: async (projectId, docId) =>
    apiClient.delete(`/client/projects/${projectId}/documents/${docId}`),

  downloadProjectDocumentUrl: (projectId, docId) => `/client/projects/${projectId}/documents/${docId}/download`,

  getProjectTaskHistory: async (projectId) => apiClient.get(`/client/projects/${projectId}/task-history`),

  getProjectProgress: async (projectId) => apiClient.get(`/client/projects/${projectId}/progress`),

  getProjectComments: async (projectId) => apiClient.get(`/client/projects/${projectId}/comments`),

  addProjectComment: async (projectId, body) =>
    apiClient.post(`/client/projects/${projectId}/comments`, { body }),

  updateProjectComment: async (projectId, commentId, body) =>
    apiClient.patch(`/client/projects/${projectId}/comments/${commentId}`, { body }),

  deleteProjectComment: async (projectId, commentId) =>
    apiClient.delete(`/client/projects/${projectId}/comments/${commentId}`),

  uploadCommentAttachment: async (projectId, formData) =>
    apiClient.post(`/client/projects/${projectId}/attachments`, formData),

  getPayments: async () => {
    const data = await apiClient.get('/client/payments')
    return {
      rows: data?.rows || [],
      advancePayment: data?.advancePayment || 0,
      monthlyDue: data?.monthlyDue || 0,
      totalAmount: data?.totalAmount || 0,
      totalBilled: data?.totalBilled || 0,
      projectBudgetTotal: data?.projectBudgetTotal || 0,
      accountBudget: data?.accountBudget || 0,
      summary: data?.summary || null,
    }
  },

  getMeetings: async () => apiClient.get('/client/meetings'),

  getHolidays: async () => apiClient.get('/client/holidays'),

  requestMeeting: async (payload) => apiClient.post('/client/meetings', payload),

  respondToMeeting: async (id, status) => apiClient.patch(`/client/meetings/${id}/status`, { status }),

  rescheduleMeeting: async (id, start) => apiClient.patch(`/client/meetings/${id}/reschedule`, { start }),

  getNotifications: async () => apiClient.get('/client/notifications'),
  markNotificationRead: async (id) => apiClient.patch(`/client/notifications/${id}/read`),
  markAllNotificationsRead: async () => apiClient.post('/client/notifications/read-all'),

  listClients: async () => apiClient.get('/admin/clients'),

  getClient: async (clientId) => apiClient.get(`/admin/clients/${clientId}`),

  listProjects: async () => apiClient.get('/admin/projects'),

  createClient: async (payload) => apiClient.post('/admin/clients', payload),

  updateClient: async (clientId, patch) => apiClient.put(`/admin/clients/${clientId}`, patch),

  removeClient: async (clientId) => apiClient.delete(`/admin/clients/${clientId}`),

  assignProject: async (clientId, projectId) =>
    apiClient.post(`/admin/clients/${clientId}/projects`, { projectId }),

  assignProjectManager: async (projectId, manager) =>
    apiClient.put(`/admin/projects/${projectId}/manager`, { manager }),

  assignTeam: async (projectId, members) =>
    apiClient.put(`/admin/projects/${projectId}/team`, { members }),

  generateInvoice: async (projectId, invoice) =>
    apiClient.post(`/admin/projects/${projectId}/invoices`, invoice),

  updatePayment: async (projectId, paymentId, patch) =>
    apiClient.put(`/admin/projects/${projectId}/payments/${paymentId}`, patch),

  publishAnnouncement: async (payload) => apiClient.post('/admin/announcements', payload),

  uploadDocument: async (projectId, doc) =>
    apiClient.post(`/admin/projects/${projectId}/documents`, doc),

  updateProgress: async (projectId, progress) =>
    apiClient.put(`/admin/projects/${projectId}/progress`, { progress }),
}

export { ROLES as _ROLES }
