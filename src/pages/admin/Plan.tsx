import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { currentLang } from "../../i18n";
import type { PlanOption, PlanResult } from "../../../shared/recommendation";
import { departmentCounts, pastActivitySummary, requestPlan, vendorSummary } from "../../lib/ai";
import { dayMonth, money, OCCASION_ICON } from "../../lib/format";
import { shiftISO, upcomingOccasions } from "../../lib/occasions";
import { quarterSpent, useStore, useToday } from "../../lib/store";
import type { Activity } from "../../lib/types";
import { Badge, Button, Card, Empty, Field, inputCls, PageHeader } from "../../components/ui";

export default function Plan() {
  const { t, i18n } = useTranslation();
  const s = useStore();
  const today = useToday();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const keys = useMemo(() => (params.get("o") ?? "").split(",").filter(Boolean), [params]);

  const occasions = useMemo(
    () => upcomingOccasions(s.employees, s.specialDates, today, 366).filter((o) => keys.includes(o.key)),
    [s.employees, s.specialDates, today, keys, i18n.language],
  );
  const activeCount = s.employees.filter((e) => e.status === "active").length;
  const budgetLeft = s.settings.quarterBudget - quarterSpent(s.expenses, today);

  const [eventDate, setEventDate] = useState(occasions[0]?.date ?? shiftISO(today, 5));
  // Nếu chỉ có dịp đặc biệt dành cho một nhóm (VD 20/10 cho nữ) thì mặc định theo số người của nhóm đó.
  const defaultHeadcount =
    occasions.length && occasions.every((o) => o.type === "special")
      ? Math.max(...occasions.map((o) => o.audienceCount ?? activeCount))
      : activeCount;
  const [headcount, setHeadcount] = useState(defaultHeadcount);
  const [budget, setBudget] = useState(Math.max(0, Math.min(budgetLeft, defaultHeadcount * 100_000)));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlanResult | null>(null);

  const generate = async () => {
    setLoading(true);
    setResult(null);
    const res = await requestPlan({
      lang: currentLang(),
      occasions: occasions.map((o) => ({
        type: o.type,
        title: o.title,
        personName: o.personName,
        date: o.date,
        department: o.department,
        years: o.years,
      })),
      eventDate,
      headcount,
      departments: departmentCounts(s.employees),
      budgetPerEvent: budget,
      budgetRemaining: budgetLeft,
      pastActivities: pastActivitySummary(s.activities, s.participants, s.expenses, s.feedbacks),
      vendors: vendorSummary(s.vendors),
      notes,
    });
    setResult(res);
    setLoading(false);
  };

  const choose = (option: PlanOption) => {
    const id = crypto.randomUUID();
    const menuVendor = option.vendorIds
      .map((vid) => s.vendors.find((v) => v.id === vid))
      .find((v) => v && (v.category === "drink" || v.category === "food"));
    const activity: Activity = {
      id,
      title: option.title,
      format: option.format,
      description: `${option.description}\n\n${t("plan.reason", { reason: option.reasoning })}`,
      status: "open",
      date: eventDate,
      time: option.timeSuggestion,
      location: t("plan.defaultLocation"),
      budget: option.estimatedTotal,
      occasionKeys: keys,
      vendorIds: option.vendorIds,
      menuVendorId: menuVendor?.id,
      checklist: option.checklist.map((c) => ({
        id: crypto.randomUUID(),
        title: c.title,
        dueDate: shiftISO(eventDate, -c.dueOffsetDays),
        done: false,
      })),
      announcement: option.announcement,
      checkinToken: crypto.randomUUID().slice(0, 8),
      aiSource: result?.source,
      createdAt: new Date().toISOString(),
    };
    s.addActivity(activity);
    navigate(`/activities/${id}`);
  };

  return (
    <>
      <PageHeader title={t("plan.title")} subtitle={t("plan.subtitle")} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit space-y-4">
          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">{t("plan.occasions", { count: occasions.length })}</div>
            {occasions.length ? (
              <ul className="space-y-1 text-sm">
                {occasions.map((o) => (
                  <li key={o.key} className="flex justify-between gap-2">
                    <span className="truncate">
                      {OCCASION_ICON[o.type]} {o.title}
                    </span>
                    <span className="shrink-0 text-slate-500">{dayMonth(o.date)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">{t("plan.noOccasion")}</p>
            )}
          </div>
          <Field label={t("plan.eventDate")}>
            <input type="date" className={inputCls} value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </Field>
          <Field label={t("plan.headcount")}>
            <input
              type="number"
              min={1}
              className={inputCls}
              value={headcount}
              onChange={(e) => setHeadcount(Math.max(1, Number(e.target.value)))}
            />
          </Field>
          <Field label={t("plan.budget", { amount: money(budgetLeft) })}>
            <input
              type="number"
              step={100000}
              className={inputCls}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </Field>
          <Field label={t("plan.notes")}>
            <textarea
              rows={3}
              className={inputCls}
              placeholder={t("plan.notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <Button className="w-full" onClick={generate} disabled={loading}>
            {loading ? t("plan.thinking") : result ? t("plan.regenerate") : t("plan.generate")}
          </Button>
        </Card>

        <div className="space-y-4">
          {result?.note && (
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{result.note}</div>
          )}
          {loading && (
            <div className="grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-200/70" />
              ))}
            </div>
          )}
          {!loading && !result && <Empty>{t("plan.emptyHint")}</Empty>}
          {result && (
            <div className="grid gap-4 xl:grid-cols-3">
              {result.options.map((o, i) => (
                <Card key={i} className="flex flex-col">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Badge tone="brand">{t("plan.option", { n: i + 1 })}</Badge>
                    {result.source === "ai" ? <Badge tone="green">{t("plan.sourceAi")}</Badge> : <Badge>{t("plan.sourceMock")}</Badge>}
                  </div>
                  <h3 className="font-semibold text-slate-900">{o.title}</h3>
                  <div className="mb-2 text-xs text-slate-500">
                    {o.format} · {o.timeSuggestion}
                  </div>
                  <p className="mb-3 text-sm text-slate-700">{o.description}</p>
                  <div className="mb-3 rounded-lg bg-slate-50 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t("plan.costPerHead")}</span>
                      <span className="font-medium">{money(o.estimatedCostPerHead)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t("plan.total")}</span>
                      <span className={o.estimatedTotal > budget ? "font-medium text-rose-600" : "font-medium"}>
                        {money(o.estimatedTotal)}
                      </span>
                    </div>
                  </div>
                  {o.vendorIds.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {o.vendorIds.map((vid) => {
                        const v = s.vendors.find((x) => x.id === vid);
                        return v ? (
                          <Badge key={vid} tone="sky">
                            {t(`category.${v.category}`)}: {v.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  <details className="mb-3 text-sm">
                    <summary className="cursor-pointer text-slate-600">{t("plan.checklistCount", { count: o.checklist.length })}</summary>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
                      {o.checklist.map((c, j) => (
                        <li key={j}>
                          {c.title}{" "}
                          <span className="text-xs text-slate-400">
                            (
                            {c.dueOffsetDays > 0
                              ? t("plan.dueBefore", { count: c.dueOffsetDays })
                              : c.dueOffsetDays === 0
                                ? t("plan.dueSameDay")
                                : t("plan.dueAfter", { count: -c.dueOffsetDays })}
                            )
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                  <p className="mb-4 text-xs italic text-slate-500">💡 {o.reasoning}</p>
                  <Button className="mt-auto" onClick={() => choose(o)}>
                    {t("plan.choose")}
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
