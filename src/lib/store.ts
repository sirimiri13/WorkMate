// Toàn bộ dữ liệu lưu trong localStorage cho MVP. Muốn đồng bộ nhiều máy thì thay lớp này bằng Supabase.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { evaluateReminders, toISO, upcomingOccasions } from "./occasions";
import { seedData } from "./seed";
import type {
  Activity,
  AppNotification,
  Employee,
  Expense,
  Feedback,
  OrderItem,
  Participant,
  ReminderRule,
  Role,
  Settings,
  SpecialDate,
  Vendor,
} from "./types";

interface Data {
  employees: Employee[];
  vendors: Vendor[];
  specialDates: SpecialDate[];
  reminderRules: ReminderRule[];
  notifications: AppNotification[];
  activities: Activity[];
  participants: Participant[];
  orders: OrderItem[];
  expenses: Expense[];
  feedbacks: Feedback[];
  settings: Settings;
  role: Role;
  currentEmployeeId: string;
}

interface Actions {
  setRole: (role: Role) => void;
  setCurrentEmployee: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  importEmployees: (rows: Omit<Employee, "id">[]) => { added: number; updated: number };
  addEmployee: (e: Employee) => void;
  upsertRule: (rule: ReminderRule) => void;
  removeRule: (id: string) => void;
  addSpecialDate: (s: SpecialDate) => void;
  removeSpecialDate: (id: string) => void;
  runReminders: () => AppNotification[];
  markAllRead: () => void;
  addActivity: (a: Activity) => void;
  updateActivity: (id: string, patch: Partial<Activity>) => void;
  toggleChecklist: (activityId: string, itemId: string) => void;
  setParticipant: (activityId: string, employeeId: string, status: Participant["status"] | null) => void;
  saveOrder: (activityId: string, employeeId: string, items: Omit<OrderItem, "id" | "activityId" | "employeeId">[]) => void;
  addExpense: (e: Expense) => void;
  removeExpense: (id: string) => void;
  addVendor: (v: Vendor) => void;
  updateVendor: (id: string, patch: Partial<Vendor>) => void;
  saveFeedback: (f: Feedback) => void;
  resetDemo: () => void;
}

const initialData = (): Data => {
  const seed = seedData(toISO(new Date()));
  return {
    ...seed,
    settings: { orgName: "Công đoàn DevSamurai", quarterBudget: 30_000_000, simulatedToday: null },
    role: "admin",
    currentEmployeeId: seed.employees[0].id,
  };
};

export const useStore = create<Data & Actions>()(
  persist(
    (set, get) => ({
      ...initialData(),

      setRole: (role) => set({ role }),
      setCurrentEmployee: (currentEmployeeId) => set({ currentEmployeeId }),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      // Upsert theo mã NV (hoặc email nếu không có mã).
      importEmployees: (rows) => {
        let added = 0;
        let updated = 0;
        const employees = [...get().employees];
        for (const row of rows) {
          const idx = employees.findIndex(
            (e) => (row.code && e.code === row.code) || (row.email && e.email.toLowerCase() === row.email.toLowerCase()),
          );
          if (idx >= 0) {
            employees[idx] = { ...employees[idx], ...row };
            updated++;
          } else {
            employees.push({ ...row, id: crypto.randomUUID() });
            added++;
          }
        }
        set({ employees });
        return { added, updated };
      },
      addEmployee: (e) => set((s) => ({ employees: [...s.employees, e] })),

      upsertRule: (rule) =>
        set((s) => ({
          reminderRules: s.reminderRules.some((r) => r.id === rule.id)
            ? s.reminderRules.map((r) => (r.id === rule.id ? rule : r))
            : [...s.reminderRules, rule],
        })),
      removeRule: (id) => set((s) => ({ reminderRules: s.reminderRules.filter((r) => r.id !== id) })),
      addSpecialDate: (d) => set((s) => ({ specialDates: [...s.specialDates, d] })),
      removeSpecialDate: (id) => set((s) => ({ specialDates: s.specialDates.filter((d) => d.id !== id) })),

      runReminders: () => {
        const s = get();
        const today = getToday(s.settings);
        const maxDays = Math.max(0, ...s.reminderRules.map((r) => r.daysBefore));
        const occasions = upcomingOccasions(s.employees, s.specialDates, today, maxDays);
        const created = evaluateReminders(s.reminderRules, occasions, s.notifications, today);
        if (created.length) set({ notifications: [...created, ...s.notifications] });
        return created;
      },
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

      addActivity: (a) => set((s) => ({ activities: [a, ...s.activities] })),
      updateActivity: (id, patch) =>
        set((s) => ({ activities: s.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      toggleChecklist: (activityId, itemId) =>
        set((s) => ({
          activities: s.activities.map((a) =>
            a.id === activityId
              ? { ...a, checklist: a.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) }
              : a,
          ),
        })),

      setParticipant: (activityId, employeeId, status) =>
        set((s) => {
          const rest = s.participants.filter((p) => !(p.activityId === activityId && p.employeeId === employeeId));
          const orders =
            status === "declined" || status === null
              ? s.orders.filter((o) => !(o.activityId === activityId && o.employeeId === employeeId))
              : s.orders;
          return {
            orders,
            participants: status
              ? [...rest, { activityId, employeeId, status, updatedAt: new Date().toISOString() }]
              : rest,
          };
        }),

      saveOrder: (activityId, employeeId, items) =>
        set((s) => ({
          orders: [
            ...s.orders.filter((o) => !(o.activityId === activityId && o.employeeId === employeeId)),
            ...items
              .filter((i) => i.qty > 0)
              .map((i) => ({ ...i, id: crypto.randomUUID(), activityId, employeeId })),
          ],
        })),

      addExpense: (e) => set((s) => ({ expenses: [...s.expenses, e] })),
      removeExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
      addVendor: (v) => set((s) => ({ vendors: [...s.vendors, v] })),
      updateVendor: (id, patch) =>
        set((s) => ({ vendors: s.vendors.map((v) => (v.id === id ? { ...v, ...patch } : v)) })),

      saveFeedback: (f) =>
        set((s) => ({
          feedbacks: [
            ...s.feedbacks.filter((x) => !(x.activityId === f.activityId && x.employeeId === f.employeeId)),
            f,
          ],
        })),

      resetDemo: () => set(initialData()),
    }),
    { name: "ai-cong-doan-v1" },
  ),
);

export const getToday = (settings: Settings) => settings.simulatedToday ?? toISO(new Date());
export const useToday = () => useStore((s) => getToday(s.settings));

// Ngân sách quý hiện tại: tổng chi của các khoản trong cùng quý với "hôm nay".
export function quarterSpent(expenses: Expense[], today: string) {
  const q = (iso: string) => `${iso.slice(0, 4)}-${Math.floor((Number(iso.slice(5, 7)) - 1) / 3)}`;
  return expenses.filter((e) => q(e.date) === q(today)).reduce((sum, e) => sum + e.amount, 0);
}
