import { useState } from "react";
import { useTranslation } from "react-i18next";
import { money, shortDate } from "../../lib/format";
import { useStore } from "../../lib/store";
import type { Activity } from "../../lib/types";
import { Badge, Button, Card, cx, Empty, inputCls } from "../../components/ui";

export default function MyActivities() {
  const { activities, employees, currentEmployeeId } = useStore();
  const { t } = useTranslation();
  const me = employees.find((e) => e.id === currentEmployeeId);
  const visible = activities
    .filter((a) => a.status !== "cancelled")
    .sort((a, b) => (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0) || a.date.localeCompare(b.date));

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold">{t("me.hello", { name: me?.fullName.split(" ").pop() })}</h1>
      <p className="mb-6 text-sm text-slate-500">{t("me.subtitle")}</p>
      {visible.length === 0 ? (
        <Empty>{t("me.empty")}</Empty>
      ) : (
        <div className="space-y-4">
          {visible.map((a) => (
            <ActivityCard key={a.id} activity={a} employeeId={currentEmployeeId} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityCard({ activity: a, employeeId }: { activity: Activity; employeeId: string }) {
  const { participants, setParticipant } = useStore();
  const { t } = useTranslation();
  const status = participants.find((p) => p.activityId === a.id && p.employeeId === employeeId)?.status;
  const open = a.status === "open";

  return (
    <Card>
      <div className="mb-1 flex items-start justify-between gap-2">
        <h2 className="font-semibold">{a.title}</h2>
        {status === "attended" && <Badge tone="green">{t("me.checkedIn")}</Badge>}
        {status === "registered" && <Badge tone="brand">{t("me.registered")}</Badge>}
        {status === "declined" && <Badge>{t("me.declined")}</Badge>}
        {!status && a.status === "done" && <Badge>{t("me.ended")}</Badge>}
      </div>
      <div className="mb-3 text-sm text-slate-500">
        📅 {shortDate(a.date)} · ⏰ {a.time} · 📍 {a.location}
      </div>
      {a.announcement && <p className="mb-4 whitespace-pre-wrap text-sm text-slate-700">{a.announcement}</p>}

      {open && status !== "attended" && (
        <div className="flex gap-2">
          <Button
            variant={status === "registered" ? "primary" : "secondary"}
            onClick={() => setParticipant(a.id, employeeId, "registered")}
          >
            {status === "registered" ? t("me.joined") : t("me.join")}
          </Button>
          <Button
            variant={status === "declined" ? "primary" : "secondary"}
            onClick={() => setParticipant(a.id, employeeId, "declined")}
          >
            {t("me.decline")}
          </Button>
        </div>
      )}
      {!open && a.status === "closed" && !status && <p className="text-sm text-slate-500">{t("me.closed")}</p>}

      {(status === "registered" || status === "attended") && a.menuVendorId && a.status !== "done" && (
        <MenuPicker activity={a} employeeId={employeeId} readOnly={!open} />
      )}
      {status === "registered" && a.status !== "done" && (
        <p className="mt-3 text-xs text-slate-500">{t("me.scanHint")}</p>
      )}
      {a.status === "done" && status === "attended" && <FeedbackForm activityId={a.id} employeeId={employeeId} />}
    </Card>
  );
}

function MenuPicker({ activity, employeeId, readOnly }: { activity: Activity; employeeId: string; readOnly: boolean }) {
  const { vendors, orders, saveOrder } = useStore();
  const { t } = useTranslation();
  const vendor = vendors.find((v) => v.id === activity.menuVendorId);
  const mine = orders.filter((o) => o.activityId === activity.id && o.employeeId === employeeId);
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(mine.map((o) => [o.menuItemId, o.qty])));
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(mine.map((o) => [o.menuItemId, o.note])));
  const [saved, setSaved] = useState(false);
  if (!vendor) return null;

  const save = () => {
    saveOrder(
      activity.id,
      employeeId,
      vendor.menu.map((m) => ({ menuItemId: m.id, qty: qty[m.id] ?? 0, note: notes[m.id] ?? "" })),
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  const change = (id: string, delta: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(3, (q[id] ?? 0) + delta)) }));

  return (
    <div className="mt-4 rounded-lg border border-slate-200 p-3">
      <div className="mb-2 text-sm font-medium">{t("me.menuTitle", { vendor: vendor.name })}</div>
      <ul className="space-y-2">
        {vendor.menu.map((m) => (
          <li key={m.id} className="text-sm">
            <div className="flex items-center gap-2">
              <span className="flex-1">
                {m.name} <span className="text-slate-400">{money(m.price)}</span>
              </span>
              {!readOnly && (
                <button className="h-7 w-7 rounded-md border border-slate-300" onClick={() => change(m.id, -1)}>
                  −
                </button>
              )}
              <span className="w-5 text-center font-medium">{qty[m.id] ?? 0}</span>
              {!readOnly && (
                <button className="h-7 w-7 rounded-md border border-slate-300" onClick={() => change(m.id, 1)}>
                  +
                </button>
              )}
            </div>
            {(qty[m.id] ?? 0) > 0 && (
              <input
                className={cx(inputCls, "mt-1 py-1 text-xs")}
                placeholder={t("me.notePlaceholder")}
                value={notes[m.id] ?? ""}
                disabled={readOnly}
                onChange={(e) => setNotes((n) => ({ ...n, [m.id]: e.target.value }))}
              />
            )}
          </li>
        ))}
      </ul>
      {!readOnly && (
        <Button className="mt-3 w-full" onClick={save}>
          {saved ? t("me.saved") : t("me.saveChoice")}
        </Button>
      )}
    </div>
  );
}

function FeedbackForm({ activityId, employeeId }: { activityId: string; employeeId: string }) {
  const { feedbacks, saveFeedback } = useStore();
  const { t } = useTranslation();
  const existing = feedbacks.find((f) => f.activityId === activityId && f.employeeId === employeeId);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [saved, setSaved] = useState(false);

  return (
    <div className="mt-4 rounded-lg bg-slate-50 p-3">
      <div className="mb-2 text-sm font-medium">{t("me.feedbackQuestion")}</div>
      <div className="mb-2 flex gap-1 text-2xl">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} className={n <= rating ? "" : "opacity-30 grayscale"}>
            ⭐
          </button>
        ))}
      </div>
      <textarea rows={2} className={inputCls} placeholder={t("me.feedbackPlaceholder")} value={comment} onChange={(e) => setComment(e.target.value)} />
      <Button
        className="mt-2"
        disabled={!rating}
        onClick={() => {
          saveFeedback({ activityId, employeeId, rating, comment });
          setSaved(true);
        }}
      >
        {saved ? t("me.thanks") : t("me.sendFeedback")}
      </Button>
    </div>
  );
}
