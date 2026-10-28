import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { money, shortDate } from "../../lib/format";
import { useStore, useToday } from "../../lib/store";
import type { Activity, ActivityStatus, Expense } from "../../lib/types";

const STATUSES: ActivityStatus[] = ["open", "closed", "done", "cancelled"];
import { Badge, Button, Card, cx, Empty, Field, inputBase, inputCls, PageHeader, Stat, Tabs } from "../../components/ui";

type Tab = "overview" | "checklist" | "people" | "orders" | "expenses";

export default function ActivityDetail() {
  const { id } = useParams();
  const activity = useStore((s) => s.activities.find((a) => a.id === id));
  const [tab, setTab] = useState<Tab>("overview");
  const { t } = useTranslation();

  if (!activity)
    return (
      <Empty>
        {t("activity.notFound")} <Link to="/activities">{t("activity.back")}</Link>
      </Empty>
    );

  return (
    <>
      <PageHeader
        title={activity.title}
        subtitle={
          <>
            {activity.format} · {shortDate(activity.date)} {activity.time} · {activity.location}
            {activity.aiSource === "ai" && <span className="ml-2"><Badge tone="green">{t("activity.aiCreated")}</Badge></span>}
          </>
        }
        actions={<StatusSelect activity={activity} />}
      />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: t("activity.tab.overview") },
          {
            id: "checklist",
            label: t("activity.tab.checklist", {
              done: activity.checklist.filter((c) => c.done).length,
              total: activity.checklist.length,
            }),
          },
          { id: "people", label: t("activity.tab.people") },
          { id: "orders", label: t("activity.tab.orders") },
          { id: "expenses", label: t("activity.tab.expenses") },
        ]}
      />
      {tab === "overview" && <Overview activity={activity} />}
      {tab === "checklist" && <Checklist activity={activity} />}
      {tab === "people" && <People activity={activity} />}
      {tab === "orders" && <Orders activity={activity} />}
      {tab === "expenses" && <Expenses activity={activity} />}
    </>
  );
}

function StatusSelect({ activity }: { activity: Activity }) {
  const updateActivity = useStore((s) => s.updateActivity);
  const { t } = useTranslation();
  return (
    <select
      className={cx(inputBase, "w-auto")}
      value={activity.status}
      onChange={(e) => updateActivity(activity.id, { status: e.target.value as ActivityStatus })}
    >
      {STATUSES.map((k) => (
        <option key={k} value={k}>
          {t(`status.${k}`)}
        </option>
      ))}
    </select>
  );
}

function Overview({ activity }: { activity: Activity }) {
  const { updateActivity, participants, feedbacks } = useStore();
  const { t } = useTranslation();
  const [copied, setCopied] = useState("");
  const checkinUrl = `${location.origin}/checkin/${activity.id}?t=${activity.checkinToken}`;
  const ps = participants.filter((p) => p.activityId === activity.id);
  const fb = feedbacks.filter((f) => f.activityId === activity.id);
  const avg = fb.length ? (fb.reduce((s, f) => s + f.rating, 0) / fb.length).toFixed(1) : "–";

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Stat label={t("activity.overview.registered")} value={ps.filter((p) => p.status !== "declined").length} />
          <Stat label={t("activity.overview.checkedIn")} value={ps.filter((p) => p.status === "attended").length} />
          <Stat label={t("activity.overview.rating")} value={`${avg} ⭐`} hint={t("activity.overview.feedbackCount", { count: fb.length })} />
        </div>
        {activity.description && (
          <Card>
            <h3 className="mb-2 font-semibold">{t("activity.overview.description")}</h3>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{activity.description}</p>
          </Card>
        )}
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">{t("activity.overview.announcement")}</h3>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => copy(activity.announcement, "announcement")}>
                {copied === "announcement" ? t("common.copied") : t("common.copy")}
              </Button>
              <Button variant="secondary" onClick={() => setCopied("slack")}>
                {copied === "slack" ? t("activity.overview.sentSlack") : t("activity.overview.sendSlack")}
              </Button>
            </div>
          </div>
          <textarea
            rows={7}
            className={inputCls}
            value={activity.announcement}
            onChange={(e) => updateActivity(activity.id, { announcement: e.target.value })}
          />
        </Card>
        <Card className="grid gap-4 sm:grid-cols-2">
          <Field label={t("activity.overview.date")}>
            <input type="date" className={inputCls} value={activity.date} onChange={(e) => updateActivity(activity.id, { date: e.target.value })} />
          </Field>
          <Field label={t("activity.overview.time")}>
            <input className={inputCls} value={activity.time} onChange={(e) => updateActivity(activity.id, { time: e.target.value })} />
          </Field>
          <Field label={t("activity.overview.location")}>
            <input className={inputCls} value={activity.location} onChange={(e) => updateActivity(activity.id, { location: e.target.value })} />
          </Field>
          <Field label={t("activity.overview.budget")}>
            <input type="number" className={inputCls} value={activity.budget} onChange={(e) => updateActivity(activity.id, { budget: Number(e.target.value) })} />
          </Field>
        </Card>
      </div>
      <Card className="h-fit text-center">
        <h3 className="mb-3 font-semibold">{t("activity.overview.qrTitle")}</h3>
        <div className="mx-auto w-fit rounded-lg bg-white p-3 ring-1 ring-slate-200">
          <QRCodeSVG value={checkinUrl} size={200} />
        </div>
        <p className="mt-3 text-xs text-slate-500">{t("activity.overview.qrHint")}</p>
        <div className="mt-3 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => copy(checkinUrl, "qr")}>
            {copied === "qr" ? t("common.copied") : t("activity.overview.copyLink")}
          </Button>
          <a href={checkinUrl} target="_blank" rel="noreferrer">
            <Button variant="ghost">{t("activity.overview.openTest")}</Button>
          </a>
        </div>
      </Card>
    </div>
  );
}

function Checklist({ activity }: { activity: Activity }) {
  const { toggleChecklist, updateActivity } = useStore();
  const { t } = useTranslation();
  const today = useToday();
  const [title, setTitle] = useState("");
  const items = [...activity.checklist].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const add = () => {
    if (!title.trim()) return;
    updateActivity(activity.id, {
      checklist: [...activity.checklist, { id: crypto.randomUUID(), title: title.trim(), dueDate: activity.date, done: false }],
    });
    setTitle("");
  };

  return (
    <Card>
      <ul className="divide-y divide-slate-100">
        {items.map((c) => {
          const overdue = !c.done && c.dueDate < today;
          return (
            <li key={c.id} className="flex items-center gap-3 py-2.5">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-600"
                checked={c.done}
                onChange={() => toggleChecklist(activity.id, c.id)}
              />
              <span className={cx("flex-1 text-sm", c.done && "text-slate-400 line-through")}>{c.title}</span>
              <Badge tone={overdue ? "rose" : "slate"}>{shortDate(c.dueDate)}</Badge>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex gap-2">
        <input
          className={inputCls}
          placeholder={t("activity.checklist.addPlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button onClick={add}>{t("common.add")}</Button>
      </div>
    </Card>
  );
}

function People({ activity }: { activity: Activity }) {
  const { employees, participants, setParticipant } = useStore();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"all" | "registered" | "attended" | "declined" | "none">("all");
  const statusOf = (eid: string) =>
    participants.find((p) => p.activityId === activity.id && p.employeeId === eid)?.status ?? "none";
  const active = employees.filter((e) => e.status === "active");
  const counts = {
    registered: active.filter((e) => statusOf(e.id) === "registered").length,
    attended: active.filter((e) => statusOf(e.id) === "attended").length,
    declined: active.filter((e) => statusOf(e.id) === "declined").length,
    none: active.filter((e) => statusOf(e.id) === "none").length,
  };
  const TONE = { registered: "brand", attended: "green", declined: "slate", none: "amber" } as const;
  const rows = active.filter((e) => filter === "all" || statusOf(e.id) === filter);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "registered", "attended", "declined", "none"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={cx(
              "rounded-full px-3 py-1 text-xs",
              filter === k ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            {k === "all" ? t("activity.people.all", { count: active.length }) : `${t(`activity.people.${k}`)} (${counts[k]})`}
          </button>
        ))}
      </div>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-slate-100">
          {rows.map((e) => {
            const st = statusOf(e.id);
            return (
              <tr key={e.id}>
                <td className="py-2">
                  <div className="font-medium">{e.fullName}</div>
                  <div className="text-xs text-slate-500">{e.department}</div>
                </td>
                <td className="py-2">
                  <Badge tone={TONE[st]}>{t(`activity.people.${st}`)}</Badge>
                </td>
                <td className="py-2 text-right">
                  {st !== "attended" ? (
                    <Button variant="ghost" onClick={() => setParticipant(activity.id, e.id, "attended")}>
                      {t("activity.people.manualCheckin")}
                    </Button>
                  ) : (
                    <Button variant="ghost" onClick={() => setParticipant(activity.id, e.id, "registered")}>
                      {t("activity.people.undoCheckin")}
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

function Orders({ activity }: { activity: Activity }) {
  const { vendors, orders, employees, participants, updateActivity, addExpense, expenses } = useStore();
  const { t } = useTranslation();
  const today = useToday();
  const [copied, setCopied] = useState(false);
  const vendor = vendors.find((v) => v.id === activity.menuVendorId);
  const items = orders.filter((o) => o.activityId === activity.id);
  const menuVendors = vendors.filter((v) => v.menu.length && (v.category === "drink" || v.category === "food"));

  // Gom theo món + ghi chú (đá/đường...) để gửi quán.
  const summary = new Map<string, { name: string; note: string; qty: number; price: number }>();
  for (const o of items) {
    const m = vendor?.menu.find((x) => x.id === o.menuItemId);
    if (!m) continue;
    const key = `${m.id}|${o.note.trim().toLowerCase()}`;
    const row = summary.get(key) ?? { name: m.name, note: o.note.trim(), qty: 0, price: m.price };
    row.qty += o.qty;
    summary.set(key, row);
  }
  const rows = [...summary.values()].sort((a, b) => a.name.localeCompare(b.name));
  const total = rows.reduce((s, r) => s + r.qty * r.price, 0);
  const ordered = new Set(items.map((o) => o.employeeId));
  const missing = participants
    .filter((p) => p.activityId === activity.id && p.status !== "declined" && !ordered.has(p.employeeId))
    .map((p) => employees.find((e) => e.id === p.employeeId)?.fullName)
    .filter(Boolean);
  const alreadyBilled = expenses.some((e) => e.activityId === activity.id && e.vendorId === vendor?.id);

  const orderText = vendor
    ? [
        t("activity.orders.textHeader", { title: activity.title, date: shortDate(activity.date), time: activity.time }),
        ...rows.map((r) => `- ${r.name}${r.note ? ` (${r.note})` : ""}: ${r.qty}`),
        t("activity.orders.textTotal", { count: rows.reduce((s, r) => s + r.qty, 0), amount: money(total) }),
        vendor.canIssueVat ? t("activity.orders.textVat") : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <Field label={t("activity.orders.vendorLabel")} className="min-w-64 flex-1">
            <select
              className={inputCls}
              value={activity.menuVendorId ?? ""}
              onChange={(e) => updateActivity(activity.id, { menuVendorId: e.target.value || undefined })}
            >
              <option value="">{t("activity.orders.noOrder")}</option>
              {menuVendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({t(`category.${v.category}`)}){v.canIssueVat ? " · VAT" : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {!vendor ? (
          <Empty>{t("activity.orders.pickVendor")}</Empty>
        ) : rows.length === 0 ? (
          <Empty>{t("activity.orders.noOrdersYet")}</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2 font-medium">{t("activity.orders.col.item")}</th>
                <th className="py-2 font-medium">{t("activity.orders.col.note")}</th>
                <th className="py-2 text-right font-medium">{t("activity.orders.col.qty")}</th>
                <th className="py-2 text-right font-medium">{t("activity.orders.col.amount")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.name + r.note}>
                  <td className="py-2">{r.name}</td>
                  <td className="py-2 text-slate-500">{r.note}</td>
                  <td className="py-2 text-right font-medium">{r.qty}</td>
                  <td className="py-2 text-right">{money(r.qty * r.price)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-2" colSpan={2}>
                  {t("activity.orders.total")}
                </td>
                <td className="py-2 text-right">{rows.reduce((s, r) => s + r.qty, 0)}</td>
                <td className="py-2 text-right">{money(total)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </Card>

      <div className="space-y-4">
        {vendor && rows.length > 0 && (
          <Card>
            <h3 className="mb-2 font-semibold">{t("activity.orders.sendToVendor")}</h3>
            <pre className="mb-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-xs">{orderText}</pre>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(orderText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? t("common.copied") : t("activity.orders.copyOrder")}
              </Button>
              <Button
                disabled={alreadyBilled}
                onClick={() =>
                  addExpense({
                    id: crypto.randomUUID(),
                    activityId: activity.id,
                    vendorId: vendor.id,
                    description: t("activity.orders.expenseDesc", { vendor: vendor.name }),
                    amount: total,
                    fundSource: "cong_doan",
                    invoiceNo: "",
                    date: today,
                  })
                }
              >
                {alreadyBilled ? t("activity.orders.recorded") : t("activity.orders.recordExpense")}
              </Button>
            </div>
          </Card>
        )}
        <Card>
          <h3 className="mb-2 font-semibold">{t("activity.orders.missing", { count: missing.length })}</h3>
          {missing.length ? (
            <p className="text-sm text-slate-600">{missing.join(", ")}</p>
          ) : (
            <p className="text-sm text-slate-500">{t("activity.orders.allOrdered")}</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Expenses({ activity }: { activity: Activity }) {
  const { expenses, vendors, addExpense, removeExpense } = useStore();
  const { t } = useTranslation();
  const today = useToday();
  const list = expenses.filter((e) => e.activityId === activity.id);
  const spent = list.reduce((s, e) => s + e.amount, 0);
  const [form, setForm] = useState<Omit<Expense, "id" | "activityId">>({
    description: "",
    amount: 0,
    vendorId: activity.vendorIds[0],
    fundSource: "cong_doan",
    invoiceNo: "",
    date: today,
  });

  const submit = () => {
    if (!form.description || form.amount <= 0) return;
    addExpense({ ...form, id: crypto.randomUUID(), activityId: activity.id });
    setForm({ ...form, description: "", amount: 0, invoiceNo: "" });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Stat label={t("activity.expenses.budget")} value={money(activity.budget)} />
        <Stat label={t("activity.expenses.spent")} value={<span className={spent > activity.budget ? "text-rose-600" : ""}>{money(spent)}</span>} />
        <Stat label={t("activity.expenses.left")} value={money(activity.budget - spent)} />
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-2 font-medium">{t("activity.expenses.col.description")}</th>
              <th className="py-2 font-medium">{t("activity.expenses.col.vendor")}</th>
              <th className="py-2 font-medium">{t("activity.expenses.col.fund")}</th>
              <th className="py-2 font-medium">{t("activity.expenses.col.invoice")}</th>
              <th className="py-2 text-right font-medium">{t("activity.expenses.col.amount")}</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((e) => {
              const v = vendors.find((x) => x.id === e.vendorId);
              return (
                <tr key={e.id}>
                  <td className="py-2">{e.description}</td>
                  <td className="py-2">
                    {v?.name ?? "–"} {v?.canIssueVat && <Badge tone="green">VAT</Badge>}
                  </td>
                  <td className="py-2">{t(`activity.expenses.fund.${e.fundSource}`)}</td>
                  <td className="py-2">{e.invoiceNo || <span className="text-amber-600">{t("activity.expenses.noInvoice")}</span>}</td>
                  <td className="py-2 text-right">{money(e.amount)}</td>
                  <td className="py-2 text-right">
                    <Button variant="danger" onClick={() => removeExpense(e.id)}>
                      {t("common.delete")}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && <Empty>{t("activity.expenses.empty")}</Empty>}

        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-6">
          <input className={cx(inputCls, "sm:col-span-2")} placeholder={t("activity.expenses.col.description")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className={inputCls} value={form.vendorId ?? ""} onChange={(e) => setForm({ ...form, vendorId: e.target.value || undefined })}>
            <option value="">{t("activity.expenses.vendorPlaceholder")}</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <input className={inputCls} placeholder={t("activity.expenses.col.invoice")} value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} />
          <input type="number" className={inputCls} placeholder={t("activity.expenses.col.amount")} value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          <Button onClick={submit}>{t("common.add")}</Button>
        </div>
      </Card>
    </div>
  );
}
