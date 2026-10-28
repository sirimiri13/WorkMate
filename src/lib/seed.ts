// Dữ liệu demo, sinh tương đối theo ngày hiện tại để lúc nào mở app cũng có sự kiện sắp tới.
import { addDays, parseISO, setYear } from "date-fns";
import { toISO } from "./occasions";
import type {
  Activity,
  Employee,
  Expense,
  Feedback,
  Participant,
  ReminderRule,
  SpecialDate,
  Vendor,
} from "./types";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const PEOPLE: [string, Employee["gender"]][] = [
  ["Nguyễn Minh Anh", "female"], ["Trần Quốc Bảo", "male"], ["Lê Thu Hà", "female"],
  ["Phạm Đức Huy", "male"], ["Võ Ngọc Lan", "female"], ["Đặng Hoàng Nam", "male"],
  ["Bùi Thanh Tâm", "female"], ["Hồ Gia Khang", "male"], ["Ngô Phương Linh", "female"],
  ["Dương Tuấn Kiệt", "male"], ["Lý Mỹ Duyên", "female"], ["Phan Văn Lộc", "male"],
  ["Trịnh Bảo Ngọc", "female"], ["Mai Quang Vinh", "male"], ["Đỗ Khánh Vy", "female"],
  ["Huỳnh Nhật Minh", "male"], ["Cao Thảo Nguyên", "female"], ["Tạ Đình Phúc", "male"],
  ["La Hoài Thương", "female"], ["Châu Minh Trí", "male"], ["Kiều Thanh Trúc", "female"],
  ["Vũ Hải Đăng", "male"], ["Lâm Bích Trâm", "female"], ["Tô Hữu Thắng", "male"],
  ["Quách Diệu Linh", "female"], ["Thái Gia Bảo", "male"], ["Hà Ngọc Hân", "female"],
  ["Lưu Anh Tuấn", "male"], ["Từ Kim Ngân", "female"], ["Mạc Công Danh", "male"],
];

const DEPARTMENTS: [string, string][] = [
  ["Engineering", "Software Engineer"], ["Engineering", "Senior Engineer"], ["QA", "QA Engineer"],
  ["Design", "UI/UX Designer"], ["BA", "Business Analyst"], ["HR", "HR Executive"], ["Sales", "Account Manager"],
];

export function seedData(todayISO: string) {
  const today = parseISO(todayISO);
  const rand = rng(42);

  // 6 sinh nhật và 3 anniversary rơi vào 30 ngày tới.
  const birthdayOffsets = [2, 5, 9, 13, 20, 27];
  const anniversaries: Record<number, [number, number]> = { 6: [3, 1], 7: [11, 3], 8: [24, 5] };

  const employees: Employee[] = PEOPLE.map(([fullName, gender], i) => {
    const [department, position] = DEPARTMENTS[i % DEPARTMENTS.length];
    const birthOffset = birthdayOffsets[i] ?? 35 + Math.floor(rand() * 320);
    const birthDate = setYear(addDays(today, birthOffset), 1988 + Math.floor(rand() * 14));
    const anniv = anniversaries[i];
    const joinDate = anniv
      ? setYear(addDays(today, anniv[0]), addDays(today, anniv[0]).getFullYear() - anniv[1])
      : addDays(today, -(60 + Math.floor(rand() * 2400)));
    return {
      id: `e${i + 1}`,
      code: `DS${String(i + 1).padStart(3, "0")}`,
      fullName,
      email: `${fullName.split(" ").pop()!.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase()}${i + 1}@company.vn`,
      department,
      position,
      birthDate: toISO(birthDate),
      joinDate: toISO(joinDate),
      gender,
      status: "active",
    };
  });

  const vendors: Vendor[] = [
    {
      id: "v-cake", name: "Tiệm bánh Hạnh Phúc", category: "cake", phone: "0901 234 567",
      address: "12 Cộng Hòa, Tân Bình", taxCode: "0312345678", canIssueVat: true,
      menu: [
        { id: "m-cake-1", name: "Bánh kem bắp 20cm", price: 280000 },
        { id: "m-cake-2", name: "Bánh kem trà xanh 24cm", price: 420000 },
        { id: "m-cake-3", name: "Bánh su kem (hộp 10)", price: 90000 },
      ],
    },
    {
      id: "v-drink", name: "Trà sữa Mây", category: "drink", phone: "0938 111 222",
      address: "45 Út Tịch, Tân Bình", taxCode: "0318765432", canIssueVat: true,
      menu: [
        { id: "m-drink-1", name: "Trà sữa trân châu", price: 35000 },
        { id: "m-drink-2", name: "Trà đào cam sả", price: 39000 },
        { id: "m-drink-3", name: "Hồng trà macchiato", price: 42000 },
        { id: "m-drink-4", name: "Matcha latte", price: 45000 },
        { id: "m-drink-5", name: "Nước ép cam", price: 40000 },
      ],
    },
    {
      id: "v-coffee", name: "Cà phê Góc Phố", category: "drink", phone: "0909 888 777",
      address: "8 Hoàng Hoa Thám, Tân Bình", taxCode: "", canIssueVat: false,
      menu: [
        { id: "m-cf-1", name: "Cà phê sữa đá", price: 25000 },
        { id: "m-cf-2", name: "Bạc xỉu", price: 28000 },
        { id: "m-cf-3", name: "Cold brew cam", price: 39000 },
      ],
    },
    {
      id: "v-food", name: "Cơm Nhà Mộc", category: "food", phone: "0977 456 789",
      address: "102 Trường Chinh, Tân Bình", taxCode: "0315556667", canIssueVat: true,
      menu: [
        { id: "m-food-1", name: "Cơm gà xối mỡ", price: 55000 },
        { id: "m-food-2", name: "Cơm sườn nướng", price: 55000 },
        { id: "m-food-3", name: "Cơm chay thập cẩm", price: 50000 },
        { id: "m-food-4", name: "Bún bò Huế", price: 60000 },
      ],
    },
    {
      id: "v-gift", name: "Quà tặng Lộc Xinh", category: "gift", phone: "0912 345 000",
      address: "Online", taxCode: "0319998887", canIssueVat: true,
      menu: [
        { id: "m-gift-1", name: "Hộp quà bình giữ nhiệt + thiệp", price: 180000 },
        { id: "m-gift-2", name: "Set hoa mini + socola", price: 150000 },
      ],
    },
  ];

  const specialDates: SpecialDate[] = [
    { id: "s-0803", name: "Quốc tế Phụ nữ 8/3", month: 3, day: 8, audience: "female" },
    { id: "s-2010", name: "Phụ nữ Việt Nam 20/10", month: 10, day: 20, audience: "female" },
    { id: "s-1511", name: "Sinh nhật công ty", month: 11, day: 15, audience: "all" },
    { id: "s-2412", name: "Giáng sinh – Year End", month: 12, day: 24, audience: "all" },
  ];

  const reminderRules: ReminderRule[] = [
    { id: "r-birthday", occasionType: "birthday", daysBefore: 14, groupBy: "batch", channels: ["in_app", "slack"], active: true },
    { id: "r-anniv", occasionType: "anniversary", daysBefore: 14, groupBy: "none", channels: ["in_app", "email"], active: true },
    { id: "r-special", occasionType: "special", daysBefore: 21, groupBy: "none", channels: ["in_app", "slack"], active: true },
  ];

  // Lịch sử 3 hoạt động đã tổ chức để AI có dữ liệu tham chiếu.
  const past: [string, string, number, number, number, string][] = [
    ["Sinh nhật quý III – Tea break", "Tea break tại văn phòng", -75, 22, 75000, "v-cake"],
    ["Team lunch giữa năm", "Ăn trưa tập thể", -48, 26, 145000, "v-food"],
    ["Trung thu – phá cỗ", "Tiệc nhẹ buổi chiều", -20, 24, 60000, "v-drink"],
  ];
  const ratings = [4.1, 4.7, 3.6];

  const activities: Activity[] = [];
  const participants: Participant[] = [];
  const expenses: Expense[] = [];
  const feedbacks: Feedback[] = [];

  past.forEach(([title, fmt, offset, attendees, perHead, vendorId], idx) => {
    const id = `a-past-${idx + 1}`;
    const date = toISO(addDays(today, offset));
    activities.push({
      id, title, format: fmt, description: "", status: "done", date, time: "15:30", location: "Pantry tầng 5",
      budget: perHead * attendees + 300000, occasionKeys: [], vendorIds: [vendorId], checklist: [],
      announcement: "", checkinToken: crypto.randomUUID().slice(0, 8), createdAt: date,
    });
    employees.slice(0, attendees).forEach((e, i) => {
      participants.push({ activityId: id, employeeId: e.id, status: "attended", updatedAt: date });
      if (i % 3 === 0) {
        const r = Math.max(1, Math.min(5, Math.round(ratings[idx] + (rand() - 0.5) * 1.6)));
        feedbacks.push({ activityId: id, employeeId: e.id, rating: r, comment: "" });
      }
    });
    expenses.push({
      id: `x-past-${idx + 1}`, activityId: id, vendorId, description: `Thanh toán ${vendors.find((v) => v.id === vendorId)!.name}`,
      amount: perHead * attendees, fundSource: "cong_doan", invoiceNo: `00${1200 + idx * 37}`, date,
    });
  });

  return {
    employees,
    vendors,
    specialDates,
    reminderRules,
    activities,
    participants,
    expenses,
    feedbacks,
    orders: [],
    notifications: [],
  };
}
