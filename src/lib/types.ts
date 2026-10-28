export type Role = "admin" | "employee";

export interface Employee {
  id: string;
  code: string;
  fullName: string;
  email: string;
  department: string;
  position: string;
  birthDate: string; // yyyy-MM-dd
  joinDate: string; // yyyy-MM-dd
  gender: "male" | "female" | "other";
  status: "active" | "inactive";
}

export type OccasionType = "birthday" | "anniversary" | "special";

export interface SpecialDate {
  id: string;
  name: string;
  month: number;
  day: number;
  audience: "all" | "female" | "male";
}

// Sinh ra từ dữ liệu nhân viên + ngày đặc biệt, không lưu trực tiếp.
export interface Occasion {
  key: string; // `${type}:${refId}:${date}`, ổn định để chống trùng
  type: OccasionType;
  date: string;
  title: string;
  employeeId?: string;
  personName?: string;
  specialDateId?: string;
  department?: string;
  years?: number;
  audienceCount?: number;
}

export interface ReminderRule {
  id: string;
  occasionType: OccasionType;
  daysBefore: number;
  groupBy: "none" | "batch";
  channels: ("in_app" | "email" | "slack")[];
  active: boolean;
}

export interface AppNotification {
  id: string;
  ruleId: string;
  createdAt: string;
  title: string;
  body: string;
  occasionKeys: string[];
  channels: ReminderRule["channels"];
  read: boolean;
}

export type ActivityStatus = "open" | "closed" | "done" | "cancelled";

export interface ChecklistItem {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
}

export interface Activity {
  id: string;
  title: string;
  format: string;
  description: string;
  status: ActivityStatus;
  date: string;
  time: string;
  location: string;
  budget: number;
  occasionKeys: string[];
  vendorIds: string[];
  menuVendorId?: string;
  checklist: ChecklistItem[];
  announcement: string;
  checkinToken: string;
  aiSource?: "ai" | "mock";
  createdAt: string;
}

export interface Participant {
  activityId: string;
  employeeId: string;
  status: "registered" | "declined" | "attended";
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  activityId: string;
  employeeId: string;
  menuItemId: string;
  qty: number;
  note: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
}

export interface Vendor {
  id: string;
  name: string;
  category: "food" | "drink" | "cake" | "gift";
  phone: string;
  address: string;
  taxCode: string;
  canIssueVat: boolean;
  menu: MenuItem[];
}

export interface Expense {
  id: string;
  activityId: string;
  vendorId?: string;
  description: string;
  amount: number;
  fundSource: "cong_doan" | "cong_ty";
  invoiceNo: string;
  date: string;
}

export interface Feedback {
  activityId: string;
  employeeId: string;
  rating: number;
  comment: string;
}

export interface Settings {
  orgName: string;
  quarterBudget: number;
  simulatedToday: string | null;
}
