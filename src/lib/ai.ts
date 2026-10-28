import { mockRecommendation, type PlanContext, type PlanResult } from "../../shared/recommendation";
import i18n from "../i18n";
import type { Activity, Employee, Expense, Feedback, Participant, Vendor } from "./types";

export async function requestPlan(ctx: PlanContext): Promise<PlanResult> {
  try {
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(ctx),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as PlanResult;
  } catch (err) {
    // Mất mạng hoặc chưa có /api: vẫn trả đề xuất mẫu để demo không đứng hình.
    return {
      options: mockRecommendation(ctx),
      source: "mock",
      note:
        i18n.t("plan.serverError", { error: err instanceof Error ? err.message : String(err) }) +
        (ctx.notes.trim() ? ` ${i18n.t("plan.mockIgnoresNotes")}` : ""),
    };
  }
}

export function pastActivitySummary(
  activities: Activity[],
  participants: Participant[],
  expenses: Expense[],
  feedbacks: Feedback[],
) {
  return activities
    .filter((a) => a.status === "done")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .map((a) => {
      const attendees = participants.filter((p) => p.activityId === a.id && p.status === "attended").length;
      const spent = expenses.filter((e) => e.activityId === a.id).reduce((s, e) => s + e.amount, 0);
      const ratings = feedbacks.filter((f) => f.activityId === a.id).map((f) => f.rating);
      return {
        title: a.title,
        format: a.format,
        attendees,
        costPerHead: attendees ? Math.round(spent / attendees) : 0,
        rating: ratings.length ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : null,
      };
    });
}

export function vendorSummary(vendors: Vendor[]) {
  return vendors.map((v) => ({
    id: v.id,
    name: v.name,
    category: v.category,
    canIssueVat: v.canIssueVat,
    menuSample: v.menu
      .slice(0, 4)
      .map((m) => `${m.name} ${m.price}đ`)
      .join("; "),
  }));
}

export function departmentCounts(employees: Employee[]) {
  const counts: Record<string, number> = {};
  for (const e of employees.filter((e) => e.status === "active")) counts[e.department] = (counts[e.department] ?? 0) + 1;
  return counts;
}
