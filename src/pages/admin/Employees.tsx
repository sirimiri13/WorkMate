import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { parseEmployeesCsv, type ImportResult } from "../../lib/csv";
import { shortDate } from "../../lib/format";
import { useStore } from "../../lib/store";
import type { Employee } from "../../lib/types";
import { Badge, Button, Card, cx, Field, inputBase, inputCls, PageHeader } from "../../components/ui";

const GENDERS: Employee["gender"][] = ["male", "female", "other"];

const blank = (): Employee => ({
  id: crypto.randomUUID(),
  code: "",
  fullName: "",
  email: "",
  department: "",
  position: "",
  birthDate: "",
  joinDate: "",
  gender: "other",
  status: "active",
});

export default function Employees() {
  const { t } = useTranslation();
  const { employees, importEmployees, addEmployee } = useStore();
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("");
  const [preview, setPreview] = useState<(ImportResult & { fileName: string }) | null>(null);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<Employee | null>(null);

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

  // Thêm tay thì không ghi đè như import: trùng mã NV hoặc email là báo lỗi.
  const code = draft?.code.trim().toLowerCase() ?? "";
  const email = draft?.email.trim().toLowerCase() ?? "";
  const duplicate = employees.some((e) => (code && e.code.toLowerCase() === code) || (email && e.email.toLowerCase() === email));

  const saveDraft = () => {
    if (!draft) return;
    const e = {
      ...draft,
      code: draft.code.trim(),
      fullName: draft.fullName.trim(),
      email: draft.email.trim(),
      department: draft.department.trim() || t("csv.uncategorized"),
      position: draft.position.trim(),
    };
    addEmployee(e);
    setMessage(t("employees.added", { name: e.fullName }));
    setDraft(null);
  };

  return (
    <>
      <PageHeader
        title={t("employees.title")}
        subtitle={t("employees.activeCount", { count: employees.filter((e) => e.status === "active").length })}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDraft(blank())}>
              {t("employees.add")}
            </Button>
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

      {draft && (
        <Card className="mb-6 grid gap-3 border-brand-200 sm:grid-cols-3">
          <Field label={t("employees.form.fullName")}>
            <input className={inputCls} value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} />
          </Field>
          <Field label={t("employees.form.code")}>
            <input className={inputCls} value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
          </Field>
          <Field label={t("employees.form.email")}>
            <input className={inputCls} type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          </Field>
          <Field label={t("employees.form.department")}>
            <input className={inputCls} list="departments" value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })} />
            <datalist id="departments">
              {departments.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </Field>
          <Field label={t("employees.form.position")}>
            <input className={inputCls} value={draft.position} onChange={(e) => setDraft({ ...draft, position: e.target.value })} />
          </Field>
          <Field label={t("employees.form.gender")}>
            <select className={inputCls} value={draft.gender} onChange={(e) => setDraft({ ...draft, gender: e.target.value as Employee["gender"] })}>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {t(`employees.gender.${g}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("employees.form.birthDate")}>
            <input className={inputCls} type="date" value={draft.birthDate} onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })} />
          </Field>
          <Field label={t("employees.form.joinDate")}>
            <input className={inputCls} type="date" value={draft.joinDate} onChange={(e) => setDraft({ ...draft, joinDate: e.target.value })} />
          </Field>
          <Field label={t("employees.col.status")}>
            <select className={inputCls} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Employee["status"] })}>
              <option value="active">{t("employees.active")}</option>
              <option value="inactive">{t("employees.inactive")}</option>
            </select>
          </Field>
          {duplicate && <p className="text-sm text-rose-600 sm:col-span-3">{t("employees.duplicate")}</p>}
          <div className="flex gap-2 sm:col-span-3">
            <Button disabled={!draft.fullName.trim() || !draft.birthDate || !draft.joinDate || duplicate} onClick={saveDraft}>
              {t("common.save")}
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              {t("common.cancel")}
            </Button>
          </div>
        </Card>
      )}

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
