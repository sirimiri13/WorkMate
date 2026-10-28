import { useState } from "react";
import { useTranslation } from "react-i18next";
import { money } from "../../lib/format";
import { useStore } from "../../lib/store";
import type { Vendor } from "../../lib/types";
import { Badge, Button, Card, cx, Field, inputBase, inputCls, PageHeader } from "../../components/ui";

const CATEGORIES: Vendor["category"][] = ["food", "drink", "cake", "gift"];

const blank = (): Vendor => ({
  id: crypto.randomUUID(),
  name: "",
  category: "drink",
  phone: "",
  address: "",
  taxCode: "",
  canIssueVat: true,
  menu: [],
});

export default function Vendors() {
  const { vendors, addVendor, updateVendor } = useStore();
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Vendor | null>(null);

  return (
    <>
      <PageHeader
        title={t("vendors.title")}
        subtitle={t("vendors.subtitle")}
        actions={<Button onClick={() => setDraft(blank())}>{t("vendors.add")}</Button>}
      />

      {draft && (
        <Card className="mb-6 grid gap-3 border-brand-200 sm:grid-cols-3">
          <Field label={t("vendors.name")}>
            <input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label={t("vendors.category")}>
            <select className={inputCls} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Vendor["category"] })}>
              {CATEGORIES.map((k) => (
                <option key={k} value={k}>
                  {t(`category.${k}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("vendors.phone")}>
            <input className={inputCls} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          </Field>
          <Field label={t("vendors.address")} className="sm:col-span-2">
            <input className={inputCls} value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
          </Field>
          <Field label={t("vendors.taxCode")}>
            <input className={inputCls} value={draft.taxCode} onChange={(e) => setDraft({ ...draft, taxCode: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-brand-600" checked={draft.canIssueVat} onChange={(e) => setDraft({ ...draft, canIssueVat: e.target.checked })} />
            {t("vendors.canIssueVat")}
          </label>
          <div className="flex gap-2 sm:col-span-3">
            <Button
              disabled={!draft.name.trim()}
              onClick={() => {
                addVendor(draft);
                setDraft(null);
              }}
            >
              {t("common.save")}
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              {t("common.cancel")}
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {vendors.map((v) => (
          <VendorCard key={v.id} vendor={v} onAddItem={(item) => updateVendor(v.id, { menu: [...v.menu, item] })} />
        ))}
      </div>
    </>
  );
}

function VendorCard({ vendor: v, onAddItem }: { vendor: Vendor; onAddItem: (item: Vendor["menu"][number]) => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const add = () => {
    if (!name.trim() || !Number(price)) return;
    onAddItem({ id: crypto.randomUUID(), name: name.trim(), price: Number(price) });
    setName("");
    setPrice("");
  };

  return (
    <Card>
      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="font-semibold">{v.name}</h3>
        <div className="flex gap-1">
          <Badge tone="sky">{t(`category.${v.category}`)}</Badge>
          {v.canIssueVat ? <Badge tone="green">VAT</Badge> : <Badge tone="amber">{t("vendors.noVat")}</Badge>}
        </div>
      </div>
      <div className="mb-3 text-xs text-slate-500">
        {v.phone} · {v.address}
        {v.taxCode && ` · ${t("vendors.taxCodeShort", { code: v.taxCode })}`}
      </div>
      <ul className="mb-3 divide-y divide-slate-100 text-sm">
        {v.menu.map((m) => (
          <li key={m.id} className="flex justify-between py-1.5">
            <span>{m.name}</span>
            <span className="text-slate-600">{money(m.price)}</span>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input className={inputCls} placeholder={t("vendors.itemName")} value={name} onChange={(e) => setName(e.target.value)} />
        <input className={cx(inputBase, "w-28")} placeholder={t("vendors.price")} type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        <Button variant="secondary" onClick={add}>
          +
        </Button>
      </div>
    </Card>
  );
}
