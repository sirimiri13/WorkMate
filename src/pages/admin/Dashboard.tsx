import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { daysUntil, upcomingOccasions } from "../../lib/occasions";
import { quarterSpent, useStore, useToday } from "../../lib/store";
import { dayMonth, money, OCCASION_ICON } from "../../lib/format";
import type { OccasionType } from "../../lib/types";
import { Badge, Button, Card, cx, Empty, inputBase, PageHeader, Stat } from "../../components/ui";

const WINDOW = 30;
const FILTERS: (OccasionType | "all")[] = ["all", "birthday", "anniversary", "special"];

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const s = useStore();
  const today = useToday();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<OccasionType | "all">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [flash, setFlash] = useState("");

  const occasions = useMemo(
    () => upcomingOccasions(s.employees, s.specialDates, today, WINDOW),
    // Tên dịp sinh ra theo ngôn ngữ, nên tính lại khi đổi ngôn ngữ.
    [s.employees, s.specialDates, today, i18n.language],
  );
  const visible = occasions.filter((o) => filter === "all" || o.type === filter);
  const plannedBy = (key: string) => s.activities.find((a) => a.occasionKeys.includes(key) && a.status !== "cancelled");
  const budgetLeft = s.settings.quarterBudget - quarterSpent(s.expenses, today);

  const toggle = (key: string) =>
    setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));

  // Chỉ tính các dịp đang hiện theo bộ lọc và chưa lên kế hoạch.
  const selectable = visible.filter((o) => !plannedBy(o.key)).map((o) => o.key);
  const allSelected = selectable.length > 0 && selectable.every((k) => selected.includes(k));
  const someSelected = !allSelected && selectable.some((k) => selected.includes(k));
  const toggleAll = () =>
    setSelected((cur) =>
      allSelected ? cur.filter((k) => !selectable.includes(k)) : [...new Set([...cur, ...selectable])],
    );

  const runReminders = () => {
    const created = s.runReminders();
    setFlash(created.length ? t("dashboard.remindersCreated", { count: created.length }) : t("dashboard.noNewReminders"));
    setTimeout(() => setFlash(""), 3000);
  };

  return (
    <>
      <PageHeader
        title={t("dashboard.greeting", { org: s.settings.orgName })}
        subtitle={t("dashboard.subtitle")}
        actions={
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">{t("dashboard.simulateDate")}</span>
            <input
              type="date"
              className={cx(inputBase, "w-auto")}
              value={today}
              onChange={(e) => s.updateSettings({ simulatedToday: e.target.value || null })}
            />
            {s.settings.simulatedToday && (
              <Button variant="ghost" onClick={() => s.updateSettings({ simulatedToday: null })}>
                {t("dashboard.backToToday")}
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label={t("dashboard.statEmployees")} value={s.employees.filter((e) => e.status === "active").length} />
        <Stat label={t("dashboard.statUpcoming", { days: WINDOW })} value={occasions.length} />
        <Stat label={t("dashboard.statOpen")} value={s.activities.filter((a) => a.status === "open").length} />
        <Stat
          label={t("dashboard.statBudget")}
          value={<span className={budgetLeft < 0 ? "text-rose-600" : ""}>{money(budgetLeft)}</span>}
          hint={`/ ${money(s.settings.quarterBudget)}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t("dashboard.upcomingTitle")}</h2>
            <div className="flex flex-wrap gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cx(
                    "rounded-full px-3 py-1 text-xs",
                    filter === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  {t(`dashboard.filter.${f}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-600"
              aria-label={t("dashboard.selectAll")}
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              disabled={!selectable.length}
              onChange={toggleAll}
            />
            <span className="flex-1 text-sm text-slate-500">
              {selected.length ? t("dashboard.selected", { count: selected.length }) : t("dashboard.selectHint")}
            </span>
            <Button
              disabled={!selected.length}
              onClick={() => navigate(`/plan?${new URLSearchParams({ o: selected.join(",") })}`)}
            >
              {t("dashboard.planWithAi")}
            </Button>
          </div>

          {visible.length === 0 ? (
            <Empty className="mt-4">{t("dashboard.noUpcoming", { days: WINDOW })}</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visible.map((o) => {
                const left = daysUntil(o.date, today);
                const planned = plannedBy(o.key);
                return (
                  <li key={o.key} className="flex items-center gap-3 py-2.5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand-600"
                      checked={selected.includes(o.key)}
                      onChange={() => toggle(o.key)}
                      disabled={!!planned}
                    />
                    <span className="text-xl">{OCCASION_ICON[o.type]}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-800">{o.title}</div>
                      <div className="text-xs text-slate-500">
                        {dayMonth(o.date)} · {o.department ?? t("common.people", { count: o.audienceCount ?? 0 })}
                      </div>
                    </div>
                    {planned ? (
                      <Link to={`/activities/${planned.id}`}>
                        <Badge tone="green">{t("dashboard.planned")}</Badge>
                      </Link>
                    ) : (
                      <Badge tone={left <= 3 ? "rose" : left <= 7 ? "amber" : "slate"}>
                        {left === 0 ? t("dashboard.today") : t("dashboard.daysLeft", { count: left })}
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Màn rộng: card nhắc nhở cao đúng bằng cột trái, danh sách cuộn bên trong tới sát mép dưới. */}
        <div className="relative lg:min-h-[520px]">
        <Card className="flex flex-col overflow-hidden lg:absolute lg:inset-0">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("dashboard.remindersTitle")}</h2>
            {s.notifications.some((n) => !n.read) && (
              <button className="text-xs text-brand-600 hover:underline" onClick={s.markAllRead}>
                {t("dashboard.markAllRead")}
              </button>
            )}
          </div>
          <Button className="mb-2 w-full" variant="secondary" onClick={runReminders}>
            {t("dashboard.runReminders")}
          </Button>
          <p className="mb-3 text-xs text-slate-500">
            <Trans
              i18nKey="dashboard.remindersNote"
              components={{ link: <Link className="text-brand-600 hover:underline" to="/settings" /> }}
            />
          </p>
          {flash && <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{flash}</div>}
          <div className="-mx-5 -mb-5 max-h-[480px] min-h-0 flex-1 space-y-2 overflow-y-auto border-t border-slate-100 px-5 py-4 lg:max-h-none">
            {s.notifications.length === 0 ? (
              <Empty>{t("dashboard.noReminders")}</Empty>
            ) : (
              s.notifications.map((n) => (
                <div
                  key={n.id}
                  className={cx("rounded-lg border p-3", n.read ? "border-slate-200" : "border-brand-200 bg-brand-50/50")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium text-slate-800">{n.title}</div>
                    <div className="flex shrink-0 gap-1">
                      {n.channels.map((c) => (
                        <Badge key={c} tone="sky">
                          {t(`channel.${c}`)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-slate-600">{n.body}</pre>
                  <button
                    className="mt-2 text-xs font-medium text-brand-600 hover:underline"
                    onClick={() => navigate(`/plan?${new URLSearchParams({ o: n.occasionKeys.join(",") })}`)}
                  >
                    {t("dashboard.planIt")}
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
        </div>
      </div>
    </>
  );
}
