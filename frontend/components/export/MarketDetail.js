"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { exportService } from "@/services/exportService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { PERMISSIONS } from "@/constants/permissions";
import {
  MARKET_STATUSES,
  MAPPING_STATUSES,
  REQUIREMENT_STATUSES,
  RISK_SEVERITIES,
  RISK_STATUSES,
  labelFor,
  statusVariant,
  scoreVariant,
} from "@/constants/export";
import { IncotermSelect, LookupSelect } from "./ExportSelects";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ApiClientError } from "@/lib/api/apiClient";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "products", label: "Products" },
  { value: "buyers", label: "Distributors" },
  { value: "corridors", label: "Corridors" },
  { value: "compliance", label: "Compliance" },
  { value: "pricing", label: "Pricing" },
  { value: "risks", label: "Risks" },
  { value: "opportunities", label: "Opportunities" },
  { value: "activity", label: "Activity" },
];

function Fact({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

export function MarketDetail({ marketId }) {
  const { can } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("overview");
  const [market, setMarket] = useState(null);
  const [profile, setProfile] = useState(null);
  const [breakdown, setBreakdown] = useState({});
  const [nested, setNested] = useState({ products: [], buyers: [], corridors: [], requirements: [], pricing: [], risks: [], opportunities: [], activity: [] });
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  async function loadMarket() {
    const response = await exportService.markets.get(marketId);
    setMarket(response.data.market);
  }

  useEffect(() => {
    loadMarket().catch(() => toast.error("Unable to load market"));
    exportService.scoreProfiles.list({ scope: "market" }).then((response) => {
      const item = (response.data.items || []).find((row) => row.status === "active") || response.data.items?.[0];
      setProfile(item || null);
    }).catch(() => {});
  }, [marketId]);

  useEffect(() => {
    if (!market) return;
    async function loadTab() {
      try {
        if (tab === "products") {
          const response = await exportService.mappings.list(marketId, { limit: 50 });
          setNested((current) => ({ ...current, products: response.data.items }));
        } else if (tab === "buyers") {
          const response = await exportService.buyers.list({ marketId, limit: 50 });
          setNested((current) => ({ ...current, buyers: response.data.items }));
        } else if (tab === "corridors") {
          const response = await exportService.corridors.list({ marketId, limit: 50 });
          setNested((current) => ({ ...current, corridors: response.data.items }));
        } else if (tab === "compliance") {
          const response = await exportService.requirements.list({ marketId, limit: 50 });
          setNested((current) => ({ ...current, requirements: response.data.items }));
        } else if (tab === "pricing") {
          const response = await exportService.pricing.list({ marketId, limit: 50 });
          setNested((current) => ({ ...current, pricing: response.data.items }));
        } else if (tab === "risks") {
          const response = await exportService.risks.list({ scopeType: "market", scopeId: marketId, limit: 50 });
          setNested((current) => ({ ...current, risks: response.data.items }));
        } else if (tab === "opportunities") {
          const response = await exportService.opportunities.list({ marketId, limit: 50 });
          setNested((current) => ({ ...current, opportunities: response.data.items }));
        } else if (tab === "activity") {
          const response = await exportService.markets.activity(marketId, { limit: 20 });
          setNested((current) => ({ ...current, activity: response.data.items }));
        }
      } catch {
        toast.error("Unable to load tab");
      }
    }
    loadTab();
  }, [tab, marketId, market, reloadToken]);

  async function saveScore() {
    setSaving(true);
    try {
      await exportService.markets.evaluate(marketId, { breakdown });
      toast.success("Market scored");
      await loadMarket();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not score market");
    } finally {
      setSaving(false);
    }
  }

  if (!market) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/export/markets" className="inline-flex items-center gap-1 text-sm text-muted">
        <ArrowLeft className="h-4 w-4" /> Markets
      </Link>
      <Card>
        <CardBody className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold">{market.name}</h1>
              <Badge variant={statusVariant(market.status)}>{labelFor(MARKET_STATUSES, market.status)}</Badge>
              <Badge variant={scoreVariant(market.opportunityScore)}>Opportunity {market.opportunityScore} {market.scoreLabel}</Badge>
              <Badge variant={scoreVariant(100 - (market.riskScore || 0))}>Risk {market.riskScore}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">{market.countryName} · {market.currencyCode} · {market.owner?.name || "Unassigned"}</p>
          </div>
          {can(PERMISSIONS.EXPORT_MARKETS_UPDATE) ? (
            <Link href={`/export/markets/${market.id}/edit`}>
              <Button variant="outline">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>
          ) : null}
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Tabs tabs={TABS} value={tab} onChange={setTab} />
          {tab === "overview" ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>Overview</CardHeader>
                <CardBody className="grid gap-4 md:grid-cols-3">
                  <Fact label="Volume" value={market.expectedAnnualVolume} />
                  <Fact label="Target revenue" value={market.targetRevenue} />
                  <Fact label="Expected margin" value={market.expectedMargin ? `${market.expectedMargin}%` : "—"} />
                  <Fact label="Demand" value={market.estimatedDemand} />
                  <Fact label="Growth" value={market.growthPotential} />
                  <Fact label="Segment" value={market.targetSegment} />
                </CardBody>
              </Card>
              {can(PERMISSIONS.EXPORT_MARKETS_UPDATE) && profile ? (
                <Card>
                  <CardHeader>Market evaluation</CardHeader>
                  <CardBody className="grid gap-3 md:grid-cols-2">
                    {profile.factors.map((factor) => (
                      <Input
                        key={factor.key}
                        type="number"
                        label={`${factor.label} (${factor.weight}%)`}
                        value={breakdown[factor.key] ?? ""}
                        onChange={(event) => setBreakdown((current) => ({ ...current, [factor.key]: Number(event.target.value) }))}
                      />
                    ))}
                    <div className="md:col-span-2">
                      <Button loading={saving} onClick={saveScore}>
                        Recalculate score
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ) : null}
              {market.description ? (
                <Card>
                  <CardHeader>Description</CardHeader>
                  <CardBody className="text-sm">{market.description}</CardBody>
                </Card>
              ) : null}
            </div>
          ) : null}

          {tab === "products" ? (
            <NestedTable
              title="Product mapping"
              canAdd={can(PERMISSIONS.EXPORT_MAPPINGS_UPDATE)}
              onAdd={() => setModal({ type: "mapping" })}
              rows={nested.products}
              columns={[
                { key: "product", label: "Product", render: (row) => row.product?.name || row.productId },
                { key: "hsCode", label: "HS" },
                { key: "eligibilityStatus", label: "Status", render: (row) => <Badge variant={statusVariant(row.eligibilityStatus)}>{labelFor(MAPPING_STATUSES, row.eligibilityStatus)}</Badge> },
                { key: "targetPrice", label: "Target price" },
                { key: "incotermCode", label: "Incoterm" },
              ]}
            />
          ) : null}

          {tab === "buyers" ? (
            <NestedTable
              title="Distributors"
              canAdd={can(PERMISSIONS.EXPORT_BUYERS_CREATE)}
              addHref="/export/distributors/new"
              rows={nested.buyers}
              columns={[
                { key: "name", label: "Distributor", render: (row) => <Link className="text-primary" href={`/export/distributors/${row.id}`}>{row.name}</Link> },
                { key: "segment", label: "Segment" },
                { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
              ]}
            />
          ) : null}

          {tab === "corridors" ? (
            <NestedTable
              title="Corridors"
              canAdd={can(PERMISSIONS.EXPORT_CORRIDORS_CREATE)}
              addHref={`/export/corridors/new?marketId=${marketId}`}
              rows={nested.corridors}
              columns={[
                { key: "name", label: "Corridor", render: (row) => <Link className="text-primary" href={`/export/corridors/${row.id}`}>{row.name}</Link> },
                { key: "primaryMode", label: "Mode" },
                { key: "transitAvgDays", label: "Transit" },
                { key: "corridorScore", label: "Score" },
                { key: "isPrimary", label: "Primary", render: (row) => (row.isPrimary ? "Yes" : "") },
              ]}
            />
          ) : null}

          {tab === "compliance" ? (
            <NestedTable
              title="Requirements"
              canAdd={can(PERMISSIONS.EXPORT_COMPLIANCE_MANAGE)}
              onAdd={() => setModal({ type: "requirement" })}
              rows={nested.requirements}
              columns={[
                { key: "name", label: "Requirement" },
                { key: "requirementType", label: "Type" },
                { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status)}>{labelFor(REQUIREMENT_STATUSES, row.status)}</Badge> },
                { key: "expiryDate", label: "Expiry", render: (row) => formatDate(row.expiryDate) },
              ]}
            />
          ) : null}

          {tab === "pricing" ? (
            <NestedTable
              title="Pricing"
              canAdd={can(PERMISSIONS.EXPORT_PRICING_MANAGE)}
              addHref={`/export/pricing?marketId=${marketId}`}
              rows={nested.pricing}
              columns={[
                { key: "product", label: "Product", render: (row) => row.product?.name },
                { key: "pricingType", label: "Type" },
                { key: "targetPrice", label: "Target" },
                { key: "incotermCode", label: "Incoterm" },
              ]}
            />
          ) : null}

          {tab === "risks" ? (
            <NestedTable
              title="Risks"
              canAdd={can(PERMISSIONS.EXPORT_RISKS_MANAGE)}
              onAdd={() => setModal({ type: "risk" })}
              rows={nested.risks}
              columns={[
                { key: "riskType", label: "Type" },
                { key: "score", label: "Score" },
                { key: "severity", label: "Severity", render: (row) => <Badge variant={statusVariant(row.severity)}>{labelFor(RISK_SEVERITIES, row.severity)}</Badge> },
                { key: "status", label: "Status", render: (row) => labelFor(RISK_STATUSES, row.status) },
              ]}
            />
          ) : null}

          {tab === "opportunities" ? (
            <NestedTable
              title="Opportunities"
              canAdd={can(PERMISSIONS.EXPORT_OPPORTUNITIES_CREATE)}
              addHref="/export/opportunities/new"
              rows={nested.opportunities}
              columns={[
                { key: "title", label: "Opportunity", render: (row) => <Link className="text-primary" href={`/export/opportunities/${row.id}/edit`}>{row.title}</Link> },
                { key: "stage", label: "Stage" },
                { key: "expectedRevenue", label: "Revenue" },
              ]}
            />
          ) : null}

          {tab === "activity" ? (
            <Card>
              <CardHeader>Activity</CardHeader>
              <CardBody className="space-y-3">
                {nested.activity.length === 0 ? <p className="text-sm text-muted">No activity yet.</p> : null}
                {nested.activity.map((item) => (
                  <div key={item.id} className="border-b border-border pb-3 last:border-0">
                    <p className="text-sm font-medium">{item.action} · {item.actorEmail}</p>
                    <p className="text-xs text-muted">{formatDateTime(item.createdAt)}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>Facts</CardHeader>
            <CardBody className="space-y-3">
              <Fact label="Country" value={`${market.countryName} (${market.countryCode})`} />
              <Fact label="Region" value={market.regionCode} />
              <Fact label="Owner" value={market.owner?.name} />
              <Fact label="Manager" value={market.manager?.name} />
              <Fact label="Products" value={market.counts?.products} />
              <Fact label="Corridors" value={market.counts?.corridors} />
              <Fact label="Requirements" value={market.counts?.requirements} />
            </CardBody>
          </Card>
        </div>
      </div>

      <QuickModals
        marketId={marketId}
        modal={modal}
        onClose={() => setModal(null)}
        onSaved={async () => {
          setModal(null);
          await loadMarket();
          setReloadToken((value) => value + 1);
        }}
      />
    </div>
  );
}

function NestedTable({ title, rows, columns, canAdd, onAdd, addHref }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <span>{title}</span>
        {canAdd && addHref ? (
          <Link href={addHref}>
            <Button size="sm">Add</Button>
          </Link>
        ) : null}
        {canAdd && onAdd ? (
          <Button size="sm" onClick={onAdd}>
            Add
          </Button>
        ) : null}
      </CardHeader>
      <Table empty="Nothing here yet." columns={columns} rows={rows} />
    </Card>
  );
}

function QuickModals({ marketId, modal, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({});
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (!modal) return;
    setForm({});
    if (modal.type === "mapping" || modal.type === "pricing") {
      exportService.products.list({ limit: 100 }).then((response) => setProducts(response.data.items || [])).catch(() => {});
    }
  }, [modal]);

  async function save() {
    try {
      if (modal.type === "mapping") {
        await exportService.mappings.create(marketId, form);
      } else if (modal.type === "requirement") {
        await exportService.requirements.create({ ...form, marketId });
      } else if (modal.type === "risk") {
        await exportService.risks.create({ ...form, scopeType: "market", scopeId: marketId });
      }
      toast.success("Saved");
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not save");
    }
  }

  if (!modal) return null;
  return (
    <Modal open title={modal.type === "mapping" ? "Map product" : modal.type === "requirement" ? "Add requirement" : "Add risk"} onClose={onClose} className="max-w-xl">
      <div className="space-y-3">
        {modal.type === "mapping" ? (
          <>
            <Select label="Product" value={form.productId || ""} onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}>
              <option value="">Select</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Select label="Eligibility" value={form.eligibilityStatus || "pending_review"} onChange={(event) => setForm((current) => ({ ...current, eligibilityStatus: event.target.value }))}>
              {MAPPING_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
            <Input type="number" label="Target price" value={form.targetPrice || ""} onChange={(event) => setForm((current) => ({ ...current, targetPrice: Number(event.target.value) }))} />
            <IncotermSelect value={form.incotermCode || ""} onChange={(event) => setForm((current) => ({ ...current, incotermCode: event.target.value }))} />
          </>
        ) : null}
        {modal.type === "requirement" ? (
          <>
            <Input label="Name" value={form.name || ""} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <LookupSelect type="requirement_type" label="Type" value={form.requirementType || ""} onChange={(event) => setForm((current) => ({ ...current, requirementType: event.target.value }))} />
            <Input type="date" label="Expiry" value={form.expiryDate || ""} onChange={(event) => setForm((current) => ({ ...current, expiryDate: event.target.value }))} />
            <Textarea label="Notes" value={form.notes || ""} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          </>
        ) : null}
        {modal.type === "risk" ? (
          <>
            <LookupSelect type="risk_category" label="Risk type" value={form.riskType || ""} onChange={(event) => setForm((current) => ({ ...current, riskType: event.target.value }))} />
            <Input type="number" label="Score" value={form.score || ""} onChange={(event) => setForm((current) => ({ ...current, score: Number(event.target.value) }))} />
            <Select label="Severity" value={form.severity || "medium"} onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))}>
              {RISK_SEVERITIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
            <Textarea label="Mitigation" value={form.mitigation || ""} onChange={(event) => setForm((current) => ({ ...current, mitigation: event.target.value }))} />
          </>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
