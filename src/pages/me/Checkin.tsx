import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { shortDate } from "../../lib/format";
import { useStore, useToday } from "../../lib/store";
import { Button, Card, cx, inputCls } from "../../components/ui";

export default function Checkin() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const today = useToday();
  const { t } = useTranslation();
  const { activities, employees, participants, currentEmployeeId, setCurrentEmployee, setParticipant } = useStore();
  const activity = activities.find((a) => a.id === id);
  const status = participants.find((p) => p.activityId === id && p.employeeId === currentEmployeeId)?.status;

  if (!activity || params.get("t") !== activity.checkinToken) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <div className="text-4xl">⚠️</div>
        <h1 className="mt-2 font-semibold">{t("checkin.invalid")}</h1>
        <p className="text-sm text-slate-500">{t("checkin.rescan")}</p>
      </Card>
    );
  }

  const wrongDay = activity.date !== today;

  return (
    <Card className="mx-auto max-w-md text-center">
      <div className="text-4xl">{status === "attended" ? "✅" : "📍"}</div>
      <h1 className="mt-2 text-lg font-semibold">{activity.title}</h1>
      <p className="mb-4 text-sm text-slate-500">
        {shortDate(activity.date)} · {activity.time} · {activity.location}
      </p>

      {status === "attended" ? (
        <p className="font-medium text-emerald-700">{t("checkin.done")}</p>
      ) : (
        <>
          <label className="mb-3 block text-left text-sm">
            <span className="mb-1 block font-medium">{t("checkin.whoAreYou")}</span>
            <select className={cx(inputCls)} value={currentEmployeeId} onChange={(e) => setCurrentEmployee(e.target.value)}>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName} – {e.department}
                </option>
              ))}
            </select>
          </label>
          {wrongDay && (
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t("checkin.wrongDay")}
            </p>
          )}
          <Button className="w-full" onClick={() => setParticipant(activity.id, currentEmployeeId, "attended")}>
            {t("checkin.button")}
          </Button>
        </>
      )}
      <Link to="/me" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
        {t("checkin.myActivities")}
      </Link>
    </Card>
  );
}
