import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Users
export const getUsers = () => api.get('/users');
export const createUser = (name: string, color: string) =>
  api.post('/users', { name, color });

// Presence (Timetable)
export const getPresence = (userId?: number, date?: string) => {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId.toString());
  if (date) params.append('date', date);
  return api.get(`/presence?${params.toString()}`);
};
export const addPresence = (
  userId: number,
  date: string,
  status: string,
  activity: 'woodworking' | 'soldering' | 'woodworking,soldering' | null = null,
  note: string | null = null
) => api.post('/presence', { userId, date, status, activity, note });
export const deletePresence = (id: number) => api.delete(`/presence/${id}`);

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
