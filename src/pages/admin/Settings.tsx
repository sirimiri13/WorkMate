import { useState } from "react";
import { useTranslation } from "react-i18next";
import { dayMonth } from "../../lib/format";
import { useStore } from "../../lib/store";
import type { OccasionType, ReminderRule, SpecialDate } from "../../lib/types";
import { Button, Card, cx, Field, inputBase, inputCls, PageHeader } from "../../components/ui";

const TYPES: OccasionType[] = ["birthday", "anniversary", "special"];
const AUDIENCES: SpecialDate["audience"][] = ["all", "female", "male"];
const pad = (n: number) => String(n).padStart(2, "0");

export default function SettingsPage() {
  const s = useStore();
  const { t } = useTranslation();
  const [special, setSpecial] = useState<Omit<SpecialDate, "id">>({ name: "", month: 1, day: 1, audience: "all" });

  const toggleChannel = (rule: ReminderRule, c: ReminderRule["channels"][number]) =>
    s.upsertRule({
      ...rule,
      channels: rule.channels.includes(c) ? rule.channels.filter((x) => x !== c) : [...rule.channels, c],
    });

  return (
    <>
      <PageHeader title={t("settings.title")} />
      <div className="space-y-6">
        <Card className="grid gap-4 sm:grid-cols-2">
          <Field label={t("settings.orgName")}>
            <input className={inputCls} value={s.settings.orgName} onChange={(e) => s.updateSettings({ orgName: e.target.value })} />
          </Field>
          <Field label={t("settings.quarterBudget")}>
            <input
              type="number"
              step={1_000_000}
              className={inputCls}
              value={s.settings.quarterBudget}
              onChange={(e) => s.updateSettings({ quarterBudget: Number(e.target.value) })}
            />
          </Field>
        </Card>

        <Card>
          <h2 className="mb-1 text-lg font-semibold">{t("settings.reminderTitle")}</h2>
          <p className="mb-4 text-sm text-slate-500">{t("settings.reminderHint")}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  {(["type", "daysBefore", "groupBy", "channels", "active"] as const).map((c) => (
                    <th key={c} className="py-2 font-medium">
                      {t(`settings.col.${c}`)}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {s.reminderRules.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2">
                      <select className={cx(inputBase, "w-auto")} value={r.occasionType} onChange={(e) => s.upsertRule({ ...r, occasionType: e.target.value as OccasionType })}>
                        {TYPES.map((k) => (
                          <option key={k} value={k}>
                            {t(`settings.type.${k}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2">
                      <input type="number" min={0} className={cx(inputBase, "w-24")} value={r.daysBefore} onChange={(e) => s.upsertRule({ ...r, daysBefore: Number(e.target.value) })} />
                    </td>
                    <td className="py-2">
                      <select className={cx(inputBase, "w-auto")} value={r.groupBy} onChange={(e) => s.upsertRule({ ...r, groupBy: e.target.value as ReminderRule["groupBy"] })}>
                        <option value="batch">{t("settings.groupBatch")}</option>
                        <option value="none">{t("settings.groupNone")}</option>
                      </select>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-3">
                        {(["in_app", "email", "slack"] as const).map((c) => (
                          <label key={c} className="flex items-center gap-1">
                            <input type="checkbox" className="accent-brand-600" checked={r.channels.includes(c)} onChange={() => toggleChannel(r, c)} />
                            {t(`channel.${c}`)}
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="py-2">
                      <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={r.active} onChange={(e) => s.upsertRule({ ...r, active: e.target.checked })} />
                    </td>
                    <td className="py-2 text-right">
                      <Button variant="danger" onClick={() => s.removeRule(r.id)}>
                        {t("common.delete")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() =>
              s.upsertRule({ id: crypto.randomUUID(), occasionType: "birthday", daysBefore: 7, groupBy: "batch", channels: ["in_app"], active: true })
            }
          >
            {t("settings.addRule")}
          </Button>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">{t("settings.specialTitle")}</h2>
          <ul className="mb-4 divide-y divide-slate-100 text-sm">
            {s.specialDates.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2">
                <span>
                  {d.name} – {dayMonth(`2000-${pad(d.month)}-${pad(d.day)}`)}
                  <span className="ml-2 text-slate-500">({t(`settings.audience.${d.audience}`)})</span>
                </span>
                <Button variant="danger" onClick={() => s.removeSpecialDate(d.id)}>
                  {t("common.delete")}
                </Button>
              </li>
            ))}
          </ul>
          <div className="grid gap-2 sm:grid-cols-[1fr_80px_80px_120px_auto]">
            <input className={inputCls} placeholder={t("settings.specialName")} value={special.name} onChange={(e) => setSpecial({ ...special, name: e.target.value })} />
            <input type="number" min={1} max={31} className={inputCls} placeholder={t("settings.day")} value={special.day} onChange={(e) => setSpecial({ ...special, day: Number(e.target.value) })} />
            <input type="number" min={1} max={12} className={inputCls} placeholder={t("settings.month")} value={special.month} onChange={(e) => setSpecial({ ...special, month: Number(e.target.value) })} />
            <select className={inputCls} value={special.audience} onChange={(e) => setSpecial({ ...special, audience: e.target.value as SpecialDate["audience"] })}>
              {AUDIENCES.map((k) => (
                <option key={k} value={k}>
                  {t(`settings.audience.${k}`)}
                </option>
              ))}
            </select>
            <Button
              disabled={!special.name.trim()}
              onClick={() => {
                s.addSpecialDate({ ...special, id: crypto.randomUUID() });
                setSpecial({ name: "", month: 1, day: 1, audience: "all" });
              }}
            >
              {t("common.add")}
            </Button>
          </div>
        </Card>

        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">{t("settings.demoTitle")}</h2>
            <p className="text-sm text-slate-500">{t("settings.demoHint")}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              if (confirm(t("settings.resetConfirm"))) s.resetDemo();
            }}
          >
            {t("settings.reset")}
          </Button>
        </Card>
      </div>
    </>
  );
}
