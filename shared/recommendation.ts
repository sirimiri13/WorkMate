// Dùng chung giữa frontend (src/) và serverless function (api/).
import { z } from "zod";

export const PlanContextSchema = z.object({
  // Ngôn ngữ cho mọi nội dung chữ AI trả về (tiêu đề, checklist, thông báo...).
  lang: z.enum(["vi", "en"]).default("vi"),
  occasions: z.array(
    z.object({
      type: z.enum(["birthday", "anniversary", "special"]),
      title: z.string(),
      personName: z.string().optional(),
      date: z.string(),
      department: z.string().optional(),
      years: z.number().optional(),
    }),
  ),
  eventDate: z.string(),
  headcount: z.number().int().positive(),
  departments: z.record(z.string(), z.number()),
  budgetPerEvent: z.number().nonnegative(),
  budgetRemaining: z.number(),
  pastActivities: z.array(
    z.object({
      title: z.string(),
      format: z.string(),
      costPerHead: z.number(),
      attendees: z.number(),
      rating: z.number().nullable(),
    }),
  ),
  vendors: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      category: z.string(),
      canIssueVat: z.boolean(),
      menuSample: z.string(),
    }),
  ),
  notes: z.string(),
});
export type PlanContext = z.infer<typeof PlanContextSchema>;
export type PlanLang = PlanContext["lang"];

export const PlanOptionSchema = z.object({
  title: z.string(),
  format: z.string(),
  description: z.string(),
  timeSuggestion: z.string(),
  estimatedCostPerHead: z.number(),
  estimatedTotal: z.number(),
  vendorIds: z.array(z.string()),
  checklist: z.array(z.object({ title: z.string(), dueOffsetDays: z.number() })),
  announcement: z.string(),
  reasoning: z.string(),
});
export type PlanOption = z.infer<typeof PlanOptionSchema>;

export const PlanOptionsSchema = z.object({ options: z.array(PlanOptionSchema) });

export interface PlanResult {
  options: PlanOption[];
  source: "ai" | "mock";
  note?: string;
}

// JSON schema gửi cho structured outputs. Giữ khớp với PlanOptionsSchema ở trên.
export const PLAN_OPTIONS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["options"],
  properties: {
    options: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "format",
          "description",
          "timeSuggestion",
          "estimatedCostPerHead",
          "estimatedTotal",
          "vendorIds",
          "checklist",
          "announcement",
          "reasoning",
        ],
        properties: {
          title: { type: "string", description: "Tên hoạt động ngắn gọn" },
          format: { type: "string", description: "Hình thức, ví dụ: tea break, ăn trưa, quà tặng" },
          description: { type: "string", description: "Mô tả 2-3 câu" },
          timeSuggestion: { type: "string", description: "Khung giờ đề xuất, ví dụ 15:30-16:30" },
          estimatedCostPerHead: { type: "integer", description: "VND / người" },
          estimatedTotal: { type: "integer", description: "Tổng chi phí ước tính, VND" },
          vendorIds: {
            type: "array",
            items: { type: "string" },
            description: "Chỉ dùng id có trong danh sách nhà cung cấp",
          },
          checklist: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "dueOffsetDays"],
              properties: {
                title: { type: "string" },
                dueOffsetDays: { type: "integer", description: "Số ngày trước sự kiện (0 = ngày diễn ra)" },
              },
            },
          },
          announcement: { type: "string", description: "Nội dung thông báo gửi nhân viên" },
          reasoning: { type: "string", description: "Vì sao phương án này phù hợp, 1-2 câu" },
        },
      },
    },
  },
} as const;

export const SYSTEM_PROMPT = `Bạn là trợ lý của Ban Chấp hành Công đoàn một công ty phần mềm tại Việt Nam.
Nhiệm vụ: đề xuất đúng 3 phương án hoạt động nội bộ khác nhau rõ rệt (về hình thức và mức chi phí) cho các dịp được cung cấp.

Yêu cầu:
- Mục "Yêu cầu riêng của Công đoàn" (nếu có) là bắt buộc và ưu tiên cao nhất: CẢ 3 phương án đều phải đáp ứng mọi ý trong đó (giờ giấc, món ăn, ăn kiêng, địa điểm...). Phần reasoning của mỗi phương án nêu ngắn gọn cách đã đáp ứng.
- Tổng chi phí ước tính không vượt ngân sách cho sự kiện. Nếu ngân sách eo hẹp, có ít nhất 1 phương án tiết kiệm.
- Chỉ chọn nhà cung cấp trong danh sách được cung cấp (dùng đúng id). Ưu tiên nhà cung cấp xuất được hóa đơn VAT.
- Tham khảo lịch sử: lặp lại hình thức được đánh giá cao, tránh hình thức bị đánh giá thấp.
- Checklist 4-7 việc cụ thể, có hạn theo số ngày trước sự kiện.
- Toàn bộ nội dung chữ (title, format, description, timeSuggestion, checklist, announcement, reasoning) viết bằng ngôn ngữ ghi ở mục "Ngôn ngữ đầu ra".
- Thông báo thân thiện, ngắn, có thời gian, địa điểm (nếu chưa rõ ghi "pantry tầng X"), hạn đăng ký và hướng dẫn chọn món trên app nếu có đặt đồ ăn/nước. Nhắc tên người được chúc mừng nếu có.
- Viết tự nhiên, không sáo rỗng.`;

export function buildPrompt(ctx: PlanContext): string {
  return [
    `## Ngôn ngữ đầu ra: ${ctx.lang === "en" ? "English" : "Tiếng Việt"}`,
    "",
    ...(ctx.notes.trim() ? ["## Yêu cầu riêng của Công đoàn (bắt buộc, áp dụng cho cả 3 phương án)", ctx.notes.trim(), ""] : []),
    "## Dịp cần tổ chức",
    ctx.occasions.length
      ? ctx.occasions
          .map((o) => `- ${o.title} (${o.date}${o.department ? `, ${o.department}` : ""}${o.years ? `, ${o.years} năm` : ""})`)
          .join("\n")
      : "- Không gắn với dịp cụ thể (hoạt động gắn kết chung)",
    "",
    "## Thông tin",
    `- Ngày dự kiến: ${ctx.eventDate}`,
    `- Số người dự kiến: ${ctx.headcount}`,
    `- Phân bổ phòng ban: ${Object.entries(ctx.departments).map(([d, n]) => `${d} ${n}`).join(", ")}`,
    `- Ngân sách cho sự kiện: ${ctx.budgetPerEvent} VND`,
    `- Ngân sách quý còn lại: ${ctx.budgetRemaining} VND`,
    "",
    "## Lịch sử hoạt động gần đây",
    ctx.pastActivities.length
      ? ctx.pastActivities
          .map(
            (a) =>
              `- ${a.title} [${a.format}]: ${a.attendees} người, ${a.costPerHead} VND/người, đánh giá ${a.rating ?? "chưa có"}/5`,
          )
          .join("\n")
      : "- Chưa có lịch sử",
    "",
    "## Nhà cung cấp",
    ctx.vendors
      .map((v) => `- id=${v.id} | ${v.name} | ${v.category} | VAT: ${v.canIssueVat ? "có" : "không"} | ${v.menuSample}`)
      .join("\n"),
  ]
    .filter((line) => line !== "")
    .join("\n");
}

// Câu chữ cho đề xuất mẫu, theo ngôn ngữ.
const MOCK_TEXT = {
  vi: {
    themeMany: (n: number) => `chúc mừng ${n} bạn`,
    themeNames: (names: string) => `chúc mừng ${names}`,
    themeTeam: "gắn kết team",
    when: (y: string, m: string, d: string) => `${d}/${m}/${y}`,
    checklist: [
      "Chốt thời gian, địa điểm và gửi thông báo",
      "Mở đăng ký và chọn món trên app",
      "Chốt số lượng, đặt hàng với nhà cung cấp",
      "Chuẩn bị thiệp/banner, in QR check-in",
      "Nhận hàng, setup và điểm danh",
      "Thu hóa đơn VAT, cập nhật chi phí",
    ],
    invite: (title: string, when: string, time: string) =>
      `🎉 Công đoàn mời cả nhà tham gia "${title}" vào ${when}, ${time} tại pantry.`,
    congrats: (names: string) => `Cùng chúc mừng ${names}! 🎂`,
    signUp: "👉 Vui lòng đăng ký và chọn món trên app trước 17:00 hai ngày trước sự kiện.",
    bye: "Hẹn gặp mọi người!",
    options: [
      {
        title: (theme: string) => `Tea break ${theme}`,
        format: "Tea break tại văn phòng",
        description: "Bánh kem + trà sữa tại pantry, cắt bánh và chụp ảnh chung. Gọn, ít ảnh hưởng giờ làm.",
        reasoning: "Chi phí thấp, dễ tổ chức, phù hợp gộp nhiều người trong tháng.",
      },
      {
        title: (theme: string) => `Ăn trưa cùng nhau – ${theme}`,
        format: "Ăn trưa tập thể",
        description: "Đặt cơm phần cho cả team, ăn chung tại phòng họp lớn, có bánh kem chúc mừng cuối bữa.",
        reasoning: "Thời gian giao lưu dài hơn, lịch sử cho thấy ăn trưa chung được đánh giá cao.",
      },
      {
        title: (theme: string) => `Quà tặng & thiệp – ${theme}`,
        format: "Quà tặng cá nhân",
        description: "Tặng quà kèm thiệp có chữ ký của team, trao nhanh tại chỗ ngồi. Phù hợp khi team bận release.",
        reasoning: "Tiết kiệm nhất, không cần tập trung mọi người.",
      },
    ],
    giftTime: "Trong giờ làm",
  },
  en: {
    themeMany: (n: number) => `celebrating ${n} teammates`,
    themeNames: (names: string) => `celebrating ${names}`,
    themeTeam: "team bonding",
    when: (y: string, m: string, d: string) =>
      new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    checklist: [
      "Confirm time and place, send the announcement",
      "Open sign-up and ordering in the app",
      "Lock the headcount and place orders with vendors",
      "Prepare cards/banner, print the check-in QR",
      "Receive the order, set up and take attendance",
      "Collect VAT invoices, update expenses",
    ],
    invite: (title: string, when: string, time: string) =>
      `🎉 The union invites everyone to "${title}" on ${when}, ${time} in the pantry.`,
    congrats: (names: string) => `Let's celebrate ${names}! 🎂`,
    signUp: "👉 Please sign up and pick your order in the app by 5 PM, two days before the event.",
    bye: "See you there!",
    options: [
      {
        title: (theme: string) => `Tea break – ${theme}`,
        format: "Office tea break",
        description: "Cake and milk tea in the pantry, cake cutting and a group photo. Short and light on work hours.",
        reasoning: "Low cost, easy to run, and works well for grouping several people in a month.",
      },
      {
        title: (theme: string) => `Team lunch – ${theme}`,
        format: "Team lunch",
        description: "Order lunch boxes for the whole team, eat together in the big meeting room, with a celebration cake to finish.",
        reasoning: "More time to socialize, and past team lunches were rated highly.",
      },
      {
        title: (theme: string) => `Gifts & cards – ${theme}`,
        format: "Personal gifts",
        description: "A gift with a card signed by the team, handed over at their desk. Good when the team is busy with a release.",
        reasoning: "The cheapest option, no need to gather everyone.",
      },
    ],
    giftTime: "During work hours",
  },
} as const;

// Đề xuất dự phòng khi chưa có API key hoặc gọi AI lỗi, để demo không bị gián đoạn.
export function mockRecommendation(ctx: PlanContext): PlanOption[] {
  const tx = MOCK_TEXT[ctx.lang];
  const byCategory = (cat: string) => ctx.vendors.filter((v) => v.category === cat).map((v) => v.id);
  const people = ctx.occasions.filter((o) => o.type !== "special").map((o) => o.personName ?? o.title);
  const special = ctx.occasions.find((o) => o.type === "special");
  const theme = special
    ? special.title
    : people.length > 2
      ? tx.themeMany(people.length)
      : people.length
        ? tx.themeNames(people.join(" & "))
        : tx.themeTeam;
  const [y, m, d] = ctx.eventDate.split("-");
  const when = tx.when(y, m, d);
  const n = ctx.headcount;
  const fit = (perHead: number) => Math.min(perHead, Math.floor(ctx.budgetPerEvent / n / 1000) * 1000 || perHead);

  const make = (index: 0 | 1 | 2, time: string, perHead: number, vendorIds: string[]): PlanOption => {
    const { format, description, reasoning } = tx.options[index];
    const title = tx.options[index].title(theme);
    const cost = fit(perHead);
    return {
      title,
      format,
      description,
      timeSuggestion: time,
      estimatedCostPerHead: cost,
      estimatedTotal: cost * n,
      vendorIds,
      checklist: [5, 4, 1, 1, 0, -2].map((dueOffsetDays, i) => ({ title: tx.checklist[i], dueOffsetDays })),
      announcement: [
        tx.invite(title, when, time),
        people.length ? tx.congrats(people.join(", ")) : "",
        tx.signUp,
        tx.bye,
      ]
        .filter(Boolean)
        .join("\n"),
      reasoning,
    };
  };

  return [
    make(0, "15:30 - 16:15", 70000, [...byCategory("cake").slice(0, 1), ...byCategory("drink").slice(0, 1)]),
    make(1, "12:00 - 13:15", 140000, [...byCategory("food").slice(0, 1), ...byCategory("cake").slice(0, 1)]),
    make(2, tx.giftTime, 50000, byCategory("gift").slice(0, 1)),
  ];
}
