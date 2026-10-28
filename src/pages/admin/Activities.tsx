import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { money, shortDate } from "../../lib/format";
import { useStore } from "../../lib/store";
import { Badge, Button, Card, Empty, PageHeader } from "../../components/ui";

const STATUS_TONE = { open: "brand", closed: "amber", done: "green", cancelled: "slate" } as const;

export default function Activities() {
  const { t } = useTranslation();
  const { activities, participants, expenses } = useStore();
  const navigate = useNavigate();
  const sorted = [...activities].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader
        title={t("activities.title")}
        subtitle={t("activities.subtitle")}
        actions={<Button onClick={() => navigate("/plan")}>{t("activities.create")}</Button>}
      />
      {sorted.length === 0 ? (
        <Empty>{t("activities.empty")}</Empty>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">{t("activities.col.activity")}</th>
                <th className="px-4 py-3 font-medium">{t("activities.col.date")}</th>
                <th className="px-4 py-3 font-medium">{t("activities.col.status")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("activities.col.attendees")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("activities.col.costBudget")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((a) => {
                const ps = participants.filter((p) => p.activityId === a.id);
                const going = ps.filter((p) => p.status !== "declined").length;
                const spent = expenses.filter((e) => e.activityId === a.id).reduce((s, e) => s + e.amount, 0);
                return (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/activities/${a.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                        {a.title}
                      </Link>
                      <div className="text-xs text-slate-500">{a.format}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{shortDate(a.date)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[a.status]}>{t(`status.${a.status}`)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">{going}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className={spent > a.budget ? "text-rose-600" : ""}>{money(spent)}</span>
                      <span className="text-slate-400"> / {money(a.budget)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
