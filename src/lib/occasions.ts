import { addDays, differenceInCalendarDays, format, isLeapYear, parseISO } from "date-fns";
import i18n from "../i18n";
import { dayMonth } from "./format";
import type { AppNotification, Employee, Occasion, ReminderRule, SpecialDate } from "./types";

export const toISO = (d: Date) => format(d, "yyyy-MM-dd");
export const daysUntil = (date: string, today: string) => differenceInCalendarDays(parseISO(date), parseISO(today));

// Ngày (month/day) xuất hiện lần tới tính từ `from`, kể cả chính ngày `from`.
// Người sinh 29/2 được tính vào 28/2 ở năm không nhuận.
export function nextOccurrence(month: number, day: number, from: string): string {
  const start = parseISO(from);
  for (const year of [start.getFullYear(), start.getFullYear() + 1]) {
    const d = month === 2 && day === 29 && !isLeapYear(new Date(year, 0, 1)) ? 28 : day;
    const candidate = new Date(year, month - 1, d);
    if (differenceInCalendarDays(candidate, start) >= 0) return toISO(candidate);
  }
  throw new Error("unreachable");
}

const md = (iso: string) => {
  const d = parseISO(iso);
  return [d.getMonth() + 1, d.getDate()] as const;
};

export function upcomingOccasions(
  employees: Employee[],
  specialDates: SpecialDate[],
  today: string,
  withinDays: number,
): Occasion[] {
  const result: Occasion[] = [];
  const active = employees.filter((e) => e.status === "active");

  for (const e of active) {
    const birthday = nextOccurrence(...md(e.birthDate), today);
    result.push({
      key: `birthday:${e.id}:${birthday}`,
      type: "birthday",
      date: birthday,
      title: i18n.t("occasion.birthdayTitle", { name: e.fullName }),
      personName: e.fullName,
      employeeId: e.id,
      department: e.department,
    });

    const anniversary = nextOccurrence(...md(e.joinDate), today);
    const years = parseISO(anniversary).getFullYear() - parseISO(e.joinDate).getFullYear();
    if (years > 0) {
      result.push({
        key: `anniversary:${e.id}:${anniversary}`,
        type: "anniversary",
        date: anniversary,
        title: i18n.t("occasion.anniversaryTitle", { name: e.fullName, years }),
        personName: e.fullName,
        employeeId: e.id,
        department: e.department,
        years,
      });
    }
  }

  for (const s of specialDates) {
    const date = nextOccurrence(s.month, s.day, today);
    result.push({
      key: `special:${s.id}:${date}`,
      type: "special",
      date,
      title: s.name,
      specialDateId: s.id,
      audienceCount: active.filter((e) => s.audience === "all" || e.gender === s.audience).length,
    });
  }

  return result
    .filter((o) => daysUntil(o.date, today) <= withinDays)
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

// Tạo thông báo cho các sự kiện nằm trong ngưỡng của từng rule, bỏ qua sự kiện rule đó đã nhắc.
// Nội dung được viết theo ngôn ngữ đang chọn lúc tạo và lưu nguyên văn.
export function evaluateReminders(
  rules: ReminderRule[],
  occasions: Occasion[],
  existing: AppNotification[],
  today: string,
): AppNotification[] {
  const created: AppNotification[] = [];
  const now = new Date().toISOString();

  for (const rule of rules.filter((r) => r.active)) {
    const notified = new Set(existing.filter((n) => n.ruleId === rule.id).flatMap((n) => n.occasionKeys));
    const due = occasions.filter(
      (o) =>
        o.type === rule.occasionType &&
        !notified.has(o.key) &&
        daysUntil(o.date, today) >= 0 &&
        daysUntil(o.date, today) <= rule.daysBefore,
    );
    if (!due.length) continue;

    const describe = (o: Occasion) => {
      const left = daysUntil(o.date, today);
      return `• ${o.title} – ${dayMonth(o.date)} (${left === 0 ? i18n.t("reminder.today") : i18n.t("reminder.daysLeft", { count: left })})`;
    };

    const groups = rule.groupBy === "batch" ? [due] : due.map((o) => [o]);
    for (const group of groups) {
      created.push({
        id: crypto.randomUUID(),
        ruleId: rule.id,
        createdAt: now,
        title:
          group.length === 1
            ? i18n.t("reminder.upcoming", { title: group[0].title })
            : i18n.t("reminder.batchTitle", {
                count: group.length,
                type: i18n.t(`reminder.type.${rule.occasionType}`),
                days: rule.daysBefore,
              }),
        body: group.map(describe).join("\n"),
        occasionKeys: group.map((o) => o.key),
        channels: rule.channels,
        read: false,
      });
    }
  }
  return created;
}

export function shiftISO(iso: string, days: number) {
  return toISO(addDays(parseISO(iso), days));
}
