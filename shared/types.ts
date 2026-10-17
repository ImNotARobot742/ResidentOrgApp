// Shared types for frontend and backend

export interface User {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'artisan' | 'institut';
  profilePicture: string | null;
  color: string;
}

export type PlanningPeriod = 'morning' | 'afternoon';
export type PlanningSpace = 'wood' | 'metal';

export interface PlanningSlotSelection {
  period: PlanningPeriod;
  space: PlanningSpace;
}

export interface PlanningRegistration {
  id: number;
  userId: number;
  userName: string;
  color: string;
  note: string | null;
  peopleCount: number;
}

export interface PlanningSlot {
  wood: PlanningRegistration[];
  metal: PlanningRegistration[];
}

export interface PlanningDay {
  date: string;
  morning: PlanningSlot;
  afternoon: PlanningSlot;
}

export interface Attendance {
  id: number;
  userId: number;
  date: string; // YYYY-MM-DD
  present: boolean;
}

export interface Tool {
  id: number;
  name: string;
  available: boolean;
}

export interface ToolBorrow {
  id: number;
  toolId: number;
  userId: number;
  borrowDate: string; // ISO timestamp
  returnDate: string | null; // ISO timestamp or null if still borrowed
}

export interface AttendanceExport {
  name: string;
  daysPresentCount: number;
  presentDates: string[];
}

export interface ArtisanAttendanceSummary {
  userId: number;
  firstName: string;
  lastName: string;
  fullDaysSpent: number;
}
