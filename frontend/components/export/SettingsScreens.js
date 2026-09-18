"use client";

import { useEffect, useState } from "react";
import { exportService } from "@/services/exportService";
import { useToast } from "@/contexts/ToastProvider";
import { useAuth } from "@/contexts/AuthProvider";
import { Tabs } from "@/components/ui/Tabs";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { LOOKUP_TYPES } from "@/constants/export";
import { PERMISSIONS } from "@/constants/permissions";
import { ApiClientError } from "@/lib/api/apiClient";

export function ExportSettingsScreen() {
  const toast = useToast();
  const { can } = useAuth();
  const [tab, setTab] = useState("general");
  const [settings, setSettings] = useState({});
  const [lookups, setLookups] = useState([]);
  const [lookupType, setLookupType] = useState("country");
  const [incoterms, setIncoterms] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [fx, setFx] = useState([]);
  const [rules, setRules] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const canEdit = can(PERMISSIONS.EXPORT_SETTINGS_UPDATE);

  async function load() {
    const [s, l, i, p, f] = await Promise.all([
      exportService.settings.get(),
      exportService.lookups.list({ type: lookupType, limit: 100 }),
      exportService.incoterms.list({ limit: 50 }),
      exportService.scoreProfiles.list(),
      exportService.fxRates.list({ limit: 50 }),
    ]);
    setSettings(s.data.settings);
    setLookups(l.data.items);
    setIncoterms(i.data.items);
    setProfiles(p.data.items);
    setFx(f.data.items);
  }

  useEffect(() => { load().catch(() => toast.error("Unable to load settings")); }, [lookupType]);
  useEffect(() => {
    if (tab === "rules") exportService.rules.list({ limit: 50 }).then((response) => setRules(response.data.items || [])).catch(() => {});
    if (tab === "alerts" && can(PERMISSIONS.EXPORT_ALERTS_MANAGE)) exportService.alertRules.list().then((response) => setAlerts(response.data.items || [])).catch(() => {});
  }, [tab]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Export settings</h1>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "general", label: "General" },
          { value: "lookups", label: "Lookups" },
          { value: "incoterms", label: "Incoterms" },
          { value: "scores", label: "Scoring" },
          { value: "fx", label: "FX rates" },
          { value: "rules", label: "Trade rules" },
          { value: "alerts", label: "Alert rules" },
        ]}
      />
      {tab === "general" ? (
        <Card>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <Input label="Base currency" value={settings.baseCurrency || ""} onChange={(event) => setSettings({ ...settings, baseCurrency: event.target.value })} />
            <Input label="Origin country" value={settings.originCountryCode || ""} onChange={(event) => setSettings({ ...settings, originCountryCode: event.target.value })} />
            <Input label="Default incoterm" value={settings.defaultIncoterm || ""} onChange={(event) => setSettings({ ...settings, defaultIncoterm: event.target.value })} />
            <Input type="number" label="Margin alert threshold" value={settings.marginAlertThreshold || 0} onChange={(event) => setSettings({ ...settings, marginAlertThreshold: Number(event.target.value) })} />
            {canEdit ? <Button onClick={async () => { await exportService.settings.update(settings); toast.success("Settings saved"); }}>Save</Button> : null}
          </CardBody>
        </Card>
      ) : null}
      {tab === "lookups" ? (
        <div className="space-y-3">
          <Select label="Type" value={lookupType} onChange={(event) => setLookupType(event.target.value)}>
            {LOOKUP_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <TableEditor
            rows={lookups}
            canEdit={canEdit}
            columns={["code", "name", "countryCode"]}
            onCreate={async (row) => { await exportService.lookups.create({ ...row, type: lookupType }); await load(); }}
            onDelete={async (row) => { await exportService.lookups.remove(row.id); await load(); }}
          />
        </div>
      ) : null}
      {tab === "incoterms" ? (
        <Table
          empty="None"
          rows={incoterms}
          columns={[
            { key: "code", label: "Code" },
            { key: "name", label: "Name" },
            { key: "costComponentCodes", label: "Included costs", render: (row) => (row.costComponentCodes || []).join(", ") },
          ]}
        />
      ) : null}
      {tab === "scores" ? (
        <div className="space-y-4">
          {profiles.map((profile) => (
            <Card key={profile.id}>
              <CardHeader>{profile.name} · {profile.scope}</CardHeader>
              <CardBody>
                <Table
                  empty=""
                  rows={profile.factors.map((factor) => ({ ...factor, id: factor.key }))}
                  columns={[
                    { key: "label", label: "Factor" },
                    { key: "weight", label: "Weight %" },
                    { key: "min", label: "Min" },
                    { key: "max", label: "Max" },
                  ]}
                />
                {canEdit ? (
                  <Button
                    className="mt-3"
                    size="sm"
                    onClick={async () => {
                      try {
                        await exportService.scoreProfiles.update(profile.id, { factors: profile.factors, thresholds: profile.thresholds });
                        toast.success("Profile saved");
                      } catch (err) {
                        toast.error(err instanceof ApiClientError ? err.message : "Weights must sum to 100");
                      }
                    }}
                  >
                    Save profile
                  </Button>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      ) : null}
      {tab === "fx" ? (
        <TableEditor
          rows={fx}
          canEdit={canEdit}
          columns={["base", "quote", "rate", "bufferPct"]}
          defaults={{ rateDate: new Date().toISOString().slice(0, 10), source: "manual" }}
          onCreate={async (row) => { await exportService.fxRates.create({ ...row, rate: Number(row.rate), bufferPct: Number(row.bufferPct || 0), rateDate: row.rateDate || new Date().toISOString() }); const response = await exportService.fxRates.list({ limit: 50 }); setFx(response.data.items); }}
          onDelete={async (row) => { await exportService.fxRates.remove(row.id); const response = await exportService.fxRates.list({ limit: 50 }); setFx(response.data.items); }}
        />
      ) : null}
      {tab === "rules" ? (
        <div className="space-y-3">
          {can(PERMISSIONS.EXPORT_COMPLIANCE_MANAGE) ? (
            <Button size="sm" onClick={async () => {
              await exportService.rules.create({
                name: "New trade rule",
                enabled: true,
                priority: 0,
                conditionGroup: { operator: "AND", conditions: [{ field: "productCategory", operator: "equals", value: "Food" }], groups: [] },
                actions: [{ type: "require_certification", payload: { name: "Lab test" } }],
              });
              const response = await exportService.rules.list({ limit: 50 });
              setRules(response.data.items);
            }}>New rule</Button>
          ) : null}
          <Table empty="No rules." rows={rules} columns={[
            { key: "name", label: "Rule" },
            { key: "enabled", label: "Enabled", render: (row) => (row.enabled ? "Yes" : "No") },
            { key: "priority", label: "Priority" },
            { key: "actions", label: "Actions", render: (row) => (row.actions || []).map((item) => item.type).join(", ") },
          ]} />
        </div>
      ) : null}
      {tab === "alerts" ? (
        <Table empty="No alert rules." rows={alerts} columns={[
          { key: "name", label: "Rule" },
          { key: "eventType", label: "Event" },
          { key: "enabled", label: "Enabled", render: (row) => (row.enabled ? "Yes" : "No") },
        ]} />
      ) : null}
    </div>
  );
}

function TableEditor({ rows, columns, onCreate, onDelete, canEdit, defaults = {} }) {
  const [draft, setDraft] = useState(defaults);
  return (
    <div className="space-y-3">
      <Table
        empty="None yet."
        rows={rows}
        columns={[
          ...columns.map((key) => ({ key, label: key })),
          canEdit ? { key: "del", label: "", render: (row) => <Button size="sm" variant="ghost" onClick={() => onDelete(row)}>Delete</Button> } : null,
        ].filter(Boolean)}
      />
      {canEdit ? (
        <div className="flex flex-wrap items-end gap-2">
          {columns.map((key) => (
            <Input key={key} label={key} value={draft[key] || ""} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} />
          ))}
          <Button onClick={async () => { await onCreate(draft); setDraft(defaults); }}>Add</Button>
        </div>
      ) : null}
    </div>
  );
}

export function PricingScreen() {
  const toast = useToast();
  const { can } = useAuth();
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [form, setForm] = useState({ productId: "", marketId: "", targetPrice: 0, currency: "USD", pricingType: "standard", status: "active" });

  async function load() {
    const [pricing, productList, marketList] = await Promise.all([
      exportService.pricing.list({ limit: 50 }),
      exportService.products.list({ limit: 100 }),
      exportService.markets.list({ limit: 100 }),
    ]);
    setItems(pricing.data.items);
    setProducts(productList.data.items);
    setMarkets(marketList.data.items);
  }
  useEffect(() => { load().catch(() => toast.error("Unable to load pricing")); }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Market pricing</h1>
      {can(PERMISSIONS.EXPORT_PRICING_MANAGE) ? (
        <Card>
          <CardBody className="grid gap-3 md:grid-cols-4">
            <Select label="Product" value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })}>
              <option value="">Select</option>
              {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
            <Select label="Market" value={form.marketId} onChange={(event) => setForm({ ...form, marketId: event.target.value })}>
              <option value="">Select</option>
              {markets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
            <Input type="number" label="Target price" value={form.targetPrice} onChange={(event) => setForm({ ...form, targetPrice: Number(event.target.value) })} />
            <Button onClick={async () => { await exportService.pricing.create(form); toast.success("Price saved"); await load(); }}>Add</Button>
          </CardBody>
        </Card>
      ) : null}
      <Table empty="No prices." rows={items} columns={[
        { key: "product", label: "Product", render: (row) => row.product?.name },
        { key: "market", label: "Market", render: (row) => row.market?.name },
        { key: "pricingType", label: "Type" },
        { key: "targetPrice", label: "Target" },
        { key: "status", label: "Status" },
      ]} />
    </div>
  );
}
