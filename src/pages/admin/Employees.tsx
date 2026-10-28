import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { parseEmployeesCsv, type ImportResult } from "../../lib/csv";
import { shortDate } from "../../lib/format";
import { useStore } from "../../lib/store";
import { Badge, Button, Card, cx, inputBase, inputCls, PageHeader } from "../../components/ui";

export default function Employees() {
  const { t } = useTranslation();
  const { employees, importEmployees } = useStore();
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("");
  const [preview, setPreview] = useState<(ImportResult & { fileName: string }) | null>(null);
  const [message, setMessage] = useState("");

  const departments = useMemo(() => [...new Set(employees.map((e) => e.department))].sort(), [employees]);
  const rows = employees.filter(
    (e) =>
      (!dept || e.department === dept) &&
      (e.fullName.toLowerCase().includes(query.toLowerCase()) || e.code.toLowerCase().includes(query.toLowerCase())),
  );

  const onFile = async (file: File) => {
    setPreview({ ...parseEmployeesCsv(await file.text()), fileName: file.name });
    setMessage("");
  };

  const confirmImport = () => {
    if (!preview) return;
    const { added, updated } = importEmployees(preview.valid);
    setMessage(t("employees.importDone", { added, updated }));
    setPreview(null);
  };

  return (
    <>
      <PageHeader
        title={t("employees.title")}
        subtitle={t("employees.activeCount", { count: employees.filter((e) => e.status === "active").length })}
        actions={
          <>
            <a href="/sample-employees.csv" download>
              <Button variant="secondary">{t("employees.downloadSample")}</Button>
            </a>
            <label>
              <span className="inline-flex cursor-pointer items-center rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700">
                {t("employees.importCsv")}
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                  e.target.value = "";
                }}
              />
            </label>
          </>
        }
      />

      {message && <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

      {preview && (
        <Card className="mb-6 border-brand-200">
          <h3 className="mb-2 font-semibold">{t("employees.previewTitle", { file: preview.fileName })}</h3>
          <p className="mb-3 text-sm text-slate-600">
            <Badge tone="green">{t("employees.validRows", { count: preview.valid.length })}</Badge>{" "}
            {preview.errors.length > 0 && <Badge tone="rose">{t("employees.errorRows", { count: preview.errors.length })}</Badge>}
          </p>
          {preview.errors.length > 0 && (
            <ul className="mb-3 max-h-40 overflow-y-auto rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              {preview.errors.map((e) => (
                <li key={e.row}>{t("employees.rowError", { row: e.row, message: e.message })}</li>
              ))}
            </ul>
          )}
          <p className="mb-3 text-xs text-slate-500">{t("employees.upsertNote")}</p>
          <div className="flex gap-2">
            <Button onClick={confirmImport} disabled={!preview.valid.length}>
              {t("employees.importN", { count: preview.valid.length })}
            </Button>
            <Button variant="ghost" onClick={() => setPreview(null)}>
              {t("common.cancel")}
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-0">
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <input className={cx(inputCls, "max-w-xs")} placeholder={t("employees.searchPlaceholder")} value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className={cx(inputBase, "w-auto")} value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">{t("employees.allDepartments")}</option>
            {departments.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                {(["code", "name", "department", "birthDate", "joinDate", "status"] as const).map((c) => (
                  <th key={c} className="px-4 py-3 font-medium">
                    {t(`employees.col.${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2.5 text-slate-500">{e.code}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{e.fullName}</div>
                    <div className="text-xs text-slate-500">{e.email}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    {e.department}
                    <div className="text-xs text-slate-500">{e.position}</div>
                  </td>
                  <td className="px-4 py-2.5">{shortDate(e.birthDate)}</td>
                  <td className="px-4 py-2.5">{shortDate(e.joinDate)}</td>
                  <td className="px-4 py-2.5">
                    {e.status === "active" ? <Badge tone="green">{t("employees.active")}</Badge> : <Badge>{t("employees.inactive")}</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
