import Papa from "papaparse";
import { isValid, parse } from "date-fns";
import i18n from "../i18n";
import { toISO } from "./occasions";
import type { Employee } from "./types";

export type ImportRow = Omit<Employee, "id">;
export interface ImportResult {
  valid: ImportRow[];
  errors: { row: number; message: string }[];
}

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().trim().replace(/[\s-]+/g, "_");

// Chấp nhận header tiếng Việt hoặc tiếng Anh.
const ALIASES: Record<keyof ImportRow, string[]> = {
  code: ["code", "ma_nv", "ma_nhan_vien", "employee_code"],
  fullName: ["full_name", "fullname", "ho_ten", "ho_va_ten", "name"],
  email: ["email"],
  department: ["department", "phong_ban"],
  position: ["position", "chuc_vu", "title"],
  birthDate: ["birth_date", "birthday", "ngay_sinh", "dob"],
  joinDate: ["join_date", "ngay_vao", "ngay_vao_lam", "start_date"],
  gender: ["gender", "gioi_tinh"],
  status: ["status", "trang_thai"],
};

const DATE_FORMATS = ["yyyy-MM-dd", "dd/MM/yyyy", "d/M/yyyy", "dd-MM-yyyy"];
function parseDate(value: string): string | null {
  for (const f of DATE_FORMATS) {
    const d = parse(value.trim(), f, new Date());
    if (isValid(d) && d.getFullYear() > 1900) return toISO(d);
  }
  return null;
}

function parseGender(value = ""): Employee["gender"] {
  const v = normalize(value);
  if (["nu", "female", "f"].includes(v)) return "female";
  if (["nam", "male", "m"].includes(v)) return "male";
  return "other";
}

export function parseEmployeesCsv(text: string): ImportResult {
  const { data } = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true, transformHeader: normalize });
  const valid: ImportRow[] = [];
  const errors: ImportResult["errors"] = [];
  const get = (row: Record<string, string>, key: keyof ImportRow) =>
    ALIASES[key].map((a) => row[a]).find((v) => v !== undefined && v !== "")?.trim() ?? "";

  data.forEach((row, i) => {
    const line = i + 2; // +1 header, +1 vì đếm từ 1
    const fullName = get(row, "fullName");
    const birth = parseDate(get(row, "birthDate"));
    const join = parseDate(get(row, "joinDate"));
    const problems = [
      !fullName && i18n.t("csv.missingName"),
      !birth && i18n.t("csv.badBirthDate", { value: get(row, "birthDate") }),
      !join && i18n.t("csv.badJoinDate", { value: get(row, "joinDate") }),
    ].filter(Boolean);
    if (problems.length) {
      errors.push({ row: line, message: problems.join(", ") });
      return;
    }
    valid.push({
      code: get(row, "code"),
      fullName,
      email: get(row, "email"),
      department: get(row, "department") || i18n.t("csv.uncategorized"),
      position: get(row, "position"),
      birthDate: birth!,
      joinDate: join!,
      gender: parseGender(get(row, "gender")),
      status: ["inactive", "nghi_viec", "da_nghi"].includes(normalize(get(row, "status"))) ? "inactive" : "active",
    });
  });
  return { valid, errors };
}
