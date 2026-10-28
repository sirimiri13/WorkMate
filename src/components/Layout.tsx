import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LANGS } from "../i18n";
import { useStore, useToday } from "../lib/store";
import { shortDate } from "../lib/format";
import { cx, inputBase } from "./ui";

const ADMIN_NAV = [
  { to: "/", key: "overview", end: true },
  { to: "/employees", key: "employees" },
  { to: "/activities", key: "activities" },
  { to: "/vendors", key: "vendors" },
  { to: "/settings", key: "settings" },
] as const;

export default function Layout() {
  const { t, i18n } = useTranslation();
  const role = useStore((s) => s.role);
  const setRole = useStore((s) => s.setRole);
  const employees = useStore((s) => s.employees);
  const currentEmployeeId = useStore((s) => s.currentEmployeeId);
  const setCurrentEmployee = useStore((s) => s.setCurrentEmployee);
  const simulated = useStore((s) => s.settings.simulatedToday);
  const today = useToday();
  const navigate = useNavigate();

  const switchRole = (r: typeof role) => {
    setRole(r);
    navigate(r === "admin" ? "/" : "/me");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <img src="/logo.svg" alt="" className="h-8 w-8" />
            <span>
              Work<span className="text-brand-600">Mate</span>
            </span>
          </div>

          {role === "admin" && (
            <nav className="flex flex-wrap gap-1">
              {ADMIN_NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={"end" in n && n.end}
                  className={({ isActive }) =>
                    cx(
                      "rounded-lg px-3 py-1.5 text-sm",
                      isActive ? "bg-brand-50 font-medium text-brand-700" : "text-slate-600 hover:bg-slate-100",
                    )
                  }
                >
                  {t(`nav.${n.key}`)}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
            <span className={cx("rounded-md px-2 py-1", simulated ? "bg-amber-100 text-amber-800" : "text-slate-500")}>
              📅 {shortDate(today)}
              {simulated && t("layout.simulated")}
            </span>
            {role === "employee" && (
              <select
                className={cx(inputBase, "w-auto max-w-56 py-1.5")}
                value={currentEmployeeId}
                onChange={(e) => setCurrentEmployee(e.target.value)}
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                  </option>
                ))}
              </select>
            )}
            <div className="flex rounded-lg border border-slate-300 p-0.5">
              {(["admin", "employee"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => switchRole(r)}
                  className={cx(
                    "rounded-md px-2.5 py-1",
                    role === r ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {r === "admin" ? t("layout.roleAdmin") : t("layout.roleEmployee")}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg border border-slate-300 p-0.5" role="group" aria-label={t("layout.language")}>
              {LANGS.map((l) => (
                <button
                  key={l}
                  onClick={() => i18n.changeLanguage(l)}
                  aria-pressed={i18n.language === l}
                  className={cx(
                    "rounded-md px-2 py-1 text-xs font-medium uppercase",
                    i18n.language === l ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
