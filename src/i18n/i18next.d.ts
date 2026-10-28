import "i18next";
import type { vi } from "./vi";

// Cho t() kiểm tra key lúc build: gõ sai key là tsc báo lỗi.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof vi };
  }
}
