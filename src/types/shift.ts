// Shift Management Types

export type ShiftTemplate = {
  id: string;
  name: string;
  startTime: string;
  durationHours: string;
  departmentCounts: Record<string, number>;
  departmentAssignments?: Record<string, Array<{
    userId: string;
    firstName: string;
    lastName: string;
    startTime: string;
    durationHours: string;
    hasTableAssignments: boolean;
  }>>;
};

export type Schedule = {
  id: string;
  date: string;
  shiftTemplateId: string | null;
  isDayOff: boolean;
  template: {
    id: string;
    name: string;
    startTime: string;
    durationHours: string;
  } | null;
};

export type Department = {
  id: string;
  name: string;
};

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  departmentId: string | null;
};

export type StaffAssignment = {
  userId: string;
  departmentId: string | null;
  startTime: string;
  durationHours: number;
};

export type Table = {
  id: string;
  number: string;
  capacity: number;
  description: string | null;
};

export type WaiterStaffAssignment = {
  id: string;
  userId: string;
  userName: string;
  startTime: string;
  durationHours: number;
};

export type TableAssignment = {
  id?: string;
  tableId: string;
  staffAssignmentId: string;
  startTime: string;
  durationHours: number;
};

export type TemplateFormData = {
  name: string;
  startTime: string;
  durationHours: string;
  departmentCounts: Record<string, number>;
};
