import axios from 'axios';
import { ArtisanAttendanceSummary, PlanningDay, PlanningPeriod, PlanningSlotSelection, PlanningSpace, User } from '../../shared/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Accounts
export const getCurrentUser = () => api.get<User>('/auth/me');
export const login = (email: string, password: string) =>
  api.post<User>('/auth/login', { email, password });
export const logout = () => api.post('/auth/logout');
export const updateProfilePicture = (profilePicture: string | null) =>
  api.patch<User>('/auth/profile', { profilePicture });
export const setPassword = (token: string, password: string, confirmPassword: string) =>
  api.post('/auth/set-password', { token, password, confirmPassword });
export const getAdminUsers = () => api.get<User[]>('/admin/users');
export const createAdminUser = (account: {
  firstName: string;
  lastName: string;
  email: string;
  role: User['role'];
  color: string;
}) => api.post<{ success: boolean; emailSent: boolean }>('/admin/users', account);
export const updateAdminUser = (id: number, account: Omit<User, 'id'>) =>
  api.patch<User>(`/admin/users/${id}`, account);
export const deleteAdminUser = (id: number) => api.delete(`/admin/users/${id}`);
export const regenerateAdminPassword = (id: number) =>
  api.post<{ success: boolean; emailSent: boolean }>(`/admin/users/${id}/regenerate-password`);

// Daily planning
export const getPlanning = (month: string) =>
  api.get<PlanningDay[]>('/planning', { params: { month } });
export const addPlanningRegistration = (
  date: string,
  period: PlanningPeriod,
  space: PlanningSpace,
  note: string,
  peopleCount: number
) => api.post('/planning/registrations', { date, period, space, note, peopleCount });
export const addPlanningRegistrations = (
  date: string,
  slots: PlanningSlotSelection[],
  note: string,
  peopleCount: number
) => api.post('/planning/registrations/batch', { date, slots, note, peopleCount });
export const updatePlanningNote = (id: number, note: string) =>
  api.put(`/planning/registrations/${id}`, { note });
export const deletePlanningRegistration = (id: number) =>
  api.delete(`/planning/registrations/${id}`);

// Attendance (Clocking)
export const getAttendance = (userId?: number, month?: string) => {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId.toString());
  if (month) params.append('month', month);
  return api.get(`/attendance?${params.toString()}`);
};
export const addAttendance = (userId: number, date: string, present: boolean) =>
  api.post('/attendance', { userId, date, present });
export const exportAttendance = (month: string) =>
  api.get(`/attendance/export/${month}`, { responseType: 'blob' });
export const getArtisanAttendance = (month: string) =>
  api.get<ArtisanAttendanceSummary[]>('/admin/attendance', { params: { month } });
export const exportArtisanAttendance = (month: string) =>
  api.get(`/admin/attendance/export/${month}`, { responseType: 'blob' });

// Tools
export const getTools = () => api.get('/tools');
export const createTool = (name: string) => api.post('/tools', { name });
export const deleteTool = (id: number) => api.delete(`/tools/${id}`);

// Tool Borrows
export const getToolBorrows = () => api.get('/tool-borrows');
export const borrowTool = (toolId: number, userId: number) =>
  api.post('/tool-borrows', { toolId, userId });
export const returnTool = (id: number) => api.put(`/tool-borrows/${id}/return`, {});

export default api;
