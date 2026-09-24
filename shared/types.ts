// Shared types for frontend and backend

export interface User {
  id: number;
  name: string;
  color: string;
}

export interface Presence {
  id: number;
  userId: number;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent';
  activity: 'woodworking' | 'soldering' | 'woodworking,soldering' | null;
  note: string | null;
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
