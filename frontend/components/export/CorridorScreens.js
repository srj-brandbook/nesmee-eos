"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import { exportService } from "@/services/exportService";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { usePagination } from "@/hooks/usePagination";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Table } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Alert } from "@/components/ui/Alert";
import { Tabs } from "@/components/ui/Tabs";
import { PERMISSIONS } from "@/constants/permissions";
import { CORRIDOR_STATUSES, TRANSPORT_MODES, LOCATION_TYPES, labelFor, statusVariant, scoreVariant } from "@/constants/export";
import { ExportOwnerSelect, LookupSelect } from "./ExportSelects";
import { ApiClientError } from "@/lib/api/apiClient";
import { formatDate } from "@/lib/utils";

function emptySegment(sequence = 0) {
  return {
    key: `seg-${sequence}-${Date.now()}`,
    sequence,
    locationType: sequence === 0 ? "origin" : "transit",
    locationLabel: "",
    mode: "road",
    carrier: "",
    transitAvgDays: 0,
    transitMinDays: 0,
    transitMaxDays: 0,
    costAmount: 0,
    costCurrency: "INR",
    costComponentCode: "",
    riskScore: 0,
    notes: "",
  };
}

export function CorridorTable() {
  const { can } = useAuth();
  const toast = useToast();
  const { value, setValue, debounced } = useDebouncedSearch();
  const { page, setPage, limit } = usePagination({ page: 1, limit: 50 });
  const [status, setStatus] = useState("");
  const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });
  const [pendingDelete, setPendingDelete] = useState(null);

  async function load() {
    const response = await exportService.corridors.list({ search: debounced, status, page, limit, sort: "-createdAt" });
    setData(response.data);
  }
  useEffect(() => {
    load().catch(() => toast.error("Unable to load corridors"));
  }, [debounced, status, page, limit]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Export corridors</h1>
          <p className="text-sm text-muted">Origin to destination routes, costs and transit.</p>
        </div>
        <div className="flex gap-2">
          {can(PERMISSIONS.EXPORT_CORRIDORS_COMPARE) ? (
            <Link href="/export/corridors/compare"><Button variant="outline">Compare</Button></Link>
          ) : null}
          {can(PERMISSIONS.EXPORT_CORRIDORS_CREATE) ? (
            <Link href="/export/corridors/new">
              <Button><Plus className="h-4 w-4" /> New corridor</Button>
            </Link>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Input label="Search" value={value} onChange={(event) => { setValue(event.target.value); setPage(1); }} />
        <Select label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All</option>
          {CORRIDOR_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </Select>
      </div>
      <Card>
        <Table
          empty="No corridors yet."
          rows={data.items}
          columns={[
            { key: "name", label: "Corridor", render: (row) => <Link className="font-medium text-primary" href={`/export/corridors/${row.id}`}>{row.name}</Link> },
            { key: "market", label: "Market", render: (row) => row.market?.name },
            { key: "primaryMode", label: "Mode", render: (row) => labelFor(TRANSPORT_MODES, row.primaryMode) },
            { key: "status", label: "Status", render: (row) => <Badge variant={statusVariant(row.status)}>{labelFor(CORRIDOR_STATUSES, row.status)}</Badge> },
            { key: "transitAvgDays", label: "Transit (days)" },
            { key: "score", label: "Score", render: (row) => <Badge variant={scoreVariant(row.corridorScore)}>{row.corridorScore}</Badge> },
            { key: "primary", label: "Primary", render: (row) => (row.isPrimary ? "Yes" : "") },
          ]}
        />
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />
      </Card>
      <ConfirmationDialog open={Boolean(pendingDelete)} title="Delete corridor" description={`Delete ${pendingDelete?.name}?`} onClose={() => setPendingDelete(null)} onConfirm={async () => { await exportService.corridors.remove(pendingDelete.id); setPendingDelete(null); await load(); }} />
    </div>
  );
}

function SortableSegment({ segment, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: segment.key });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className="cursor-grab text-muted" {...attributes} {...listeners} aria-label="Reorder">
          <GripVertical className="h-4 w-4" />
        </button>
        <Button size="sm" variant="ghost" onClick={onRemove}>Remove</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Select label="Location type" value={segment.locationType} onChange={(event) => onChange({ locationType: event.target.value })}>
          {LOCATION_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </Select>
        <Input label="Location" value={segment.locationLabel} onChange={(event) => onChange({ locationLabel: event.target.value })} />
        <Select label="Mode" value={segment.mode} onChange={(event) => onChange({ mode: event.target.value })}>
          <option value="">None</option>
          {TRANSPORT_MODES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </Select>
        <Input label="Carrier" value={segment.carrier} onChange={(event) => onChange({ carrier: event.target.value })} />
        <Input type="number" label="Avg days" value={segment.transitAvgDays} onChange={(event) => onChange({ transitAvgDays: Number(event.target.value) })} />
        <Input type="number" label="Cost" value={segment.costAmount} onChange={(event) => onChange({ costAmount: Number(event.target.value) })} />
        <LookupSelect type="cost_component" label="Cost component" value={segment.costComponentCode} onChange={(event) => onChange({ costComponentCode: event.target.value })} />
        <Input type="number" label="Risk" value={segment.riskScore} onChange={(event) => onChange({ riskScore: Number(event.target.value) })} />
        <Input label="Notes" value={segment.notes} onChange={(event) => onChange({ notes: event.target.value })} />
      </div>
    </div>
  );
}

const emptyCorridor = {
  name: "",
  code: "",
  marketId: "",
  originCountryCode: "IN",
  originCity: "",
  destCountryCode: "",
  destCity: "",
  primaryMode: "sea",
  secondaryMode: "",
  status: "draft",
  priority: 0,
  isPrimary: false,
  reliability: 80,
  capacity: 0,
  notes: "",
  ownerId: "",
  segments: [emptySegment(0), emptySegment(1)],
  costs: [],
};

export function CorridorBuilder({ corridorId }) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [form, setForm] = useState({ ...emptyCorridor, marketId: params.get("marketId") || "" });
  const [markets, setMarkets] = useState([]);
  const [components, setComponents] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    exportService.markets.list({ limit: 100 }).then((response) => setMarkets(response.data.items || [])).catch(() => {});
    exportService.lookups.list({ type: "cost_component", limit: 50 }).then((response) => setComponents(response.data.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!corridorId) return;
    exportService.corridors.get(corridorId).then((response) => {
      const item = response.data.corridor;
      setForm({
        ...emptyCorridor,
        ...item,
        marketId: item.marketId || "",
        ownerId: item.ownerId || "",
        segments: item.segments?.length ? item.segments : emptyCorridor.segments,
        costs: item.costs || [],
      });
    });
  }, [corridorId]);

  const ids = useMemo(() => form.segments.map((item) => item.key), [form.segments]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = { ...form, ownerId: form.ownerId || null };
      if (corridorId) {
        await exportService.corridors.update(corridorId, payload);
        toast.success("Corridor updated");
        router.push(`/export/corridors/${corridorId}`);
      } else {
        const response = await exportService.corridors.create(payload);
        toast.success("Corridor created");
        router.push(`/export/corridors/${response.data.corridor.id}`);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save corridor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <h1 className="font-display text-2xl font-semibold">{corridorId ? "Edit corridor" : "Corridor builder"}</h1>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Card>
        <CardHeader>Corridor</CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Input label="Name" requiredMark value={form.name} onChange={(event) => setField("name", event.target.value)} />
          <Input label="Code" value={form.code} onChange={(event) => setField("code", event.target.value)} />
          <Select label="Market" requiredMark value={form.marketId} onChange={(event) => setField("marketId", event.target.value)}>
            <option value="">Select market</option>
            {markets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select label="Primary mode" value={form.primaryMode} onChange={(event) => setField("primaryMode", event.target.value)}>
            {TRANSPORT_MODES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <Input label="Origin city" value={form.originCity} onChange={(event) => setField("originCity", event.target.value)} />
          <Input label="Destination city" value={form.destCity} onChange={(event) => setField("destCity", event.target.value)} />
          <Select label="Status" value={form.status} onChange={(event) => setField("status", event.target.value)}>
            {CORRIDOR_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <ExportOwnerSelect value={form.ownerId} onChange={(event) => setField("ownerId", event.target.value)} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(form.isPrimary)} onChange={(event) => setField("isPrimary", event.target.checked)} />
            Primary corridor for this market
          </label>
        </CardBody>
      </Card>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <span>Route segments</span>
          <Button type="button" size="sm" variant="outline" onClick={() => setForm((current) => ({ ...current, segments: [...current.segments, emptySegment(current.segments.length)] }))}>
            Add segment
          </Button>
        </CardHeader>
        <CardBody className="space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
            if (!over || active.id === over.id) return;
            setForm((current) => {
              const oldIndex = current.segments.findIndex((item) => item.key === active.id);
              const newIndex = current.segments.findIndex((item) => item.key === over.id);
              return { ...current, segments: arrayMove(current.segments, oldIndex, newIndex).map((item, index) => ({ ...item, sequence: index })) };
            });
          }}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {form.segments.map((segment, index) => (
                <div key={segment.key} className="space-y-2">
                  {index > 0 ? <div className="ml-4 h-4 w-px bg-border" /> : null}
                  <SortableSegment
                    segment={segment}
                    onChange={(patch) => setForm((current) => ({ ...current, segments: current.segments.map((item) => (item.key === segment.key ? { ...item, ...patch } : item)) }))}
                    onRemove={() => setForm((current) => ({ ...current, segments: current.segments.filter((item) => item.key !== segment.key) }))}
                  />
                </div>
              ))}
            </SortableContext>
          </DndContext>
        </CardBody>
      </Card>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <span>Cost components</span>
          <Button type="button" size="sm" variant="outline" onClick={() => setForm((current) => ({ ...current, costs: [...current.costs, { componentCode: "freight", nameSnapshot: "Freight", amount: 0, currency: "INR" }] }))}>
            Add cost
          </Button>
        </CardHeader>
        <CardBody className="space-y-3">
          {form.costs.map((cost, index) => (
            <div key={`${cost.componentCode}-${index}`} className="grid gap-3 md:grid-cols-4">
              <Select label="Component" value={cost.componentCode} onChange={(event) => {
                const code = event.target.value;
                const name = components.find((item) => item.code === code)?.name || code;
                setForm((current) => ({ ...current, costs: current.costs.map((item, i) => (i === index ? { ...item, componentCode: code, nameSnapshot: name } : item)) }));
              }}>
                {components.map((item) => <option key={item.id} value={item.code}>{item.name}</option>)}
              </Select>
              <Input type="number" label="Amount" value={cost.amount} onChange={(event) => setForm((current) => ({ ...current, costs: current.costs.map((item, i) => (i === index ? { ...item, amount: Number(event.target.value) } : item)) }))} />
              <LookupSelect type="currency" label="Currency" value={cost.currency} onChange={(event) => setForm((current) => ({ ...current, costs: current.costs.map((item, i) => (i === index ? { ...item, currency: event.target.value } : item)) }))} />
              <Button type="button" variant="ghost" onClick={() => setForm((current) => ({ ...current, costs: current.costs.filter((_, i) => i !== index) }))}>Remove</Button>
            </div>
          ))}
        </CardBody>
      </Card>
      <Textarea label="Notes" value={form.notes} onChange={(event) => setField("notes", event.target.value)} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" loading={loading}>Save corridor</Button>
      </div>
    </form>
  );
}

export function CorridorDetail({ corridorId }) {
  const { can } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("overview");
  const [item, setItem] = useState(null);
  const [profile, setProfile] = useState(null);
  const [breakdown, setBreakdown] = useState({});
  const [performance, setPerformance] = useState([]);
  const [risks, setRisks] = useState([]);

  async function load() {
    const response = await exportService.corridors.get(corridorId);
    setItem(response.data.corridor);
  }
  useEffect(() => {
    load().catch(() => toast.error("Unable to load corridor"));
    exportService.scoreProfiles.list({ scope: "corridor" }).then((response) => setProfile((response.data.items || []).find((row) => row.status === "active")));
  }, [corridorId]);

  useEffect(() => {
    if (tab === "performance") exportService.performance.list(corridorId).then((response) => setPerformance(response.data.items || []));
    if (tab === "risks") exportService.risks.list({ scopeType: "corridor", scopeId: corridorId }).then((response) => setRisks(response.data.items || []));
  }, [tab, corridorId]);

  if (!item) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="space-y-4">
      <Link href="/export/corridors" className="text-sm text-muted">← Corridors</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold">{item.name}</h1>
            <Badge variant={statusVariant(item.status)}>{labelFor(CORRIDOR_STATUSES, item.status)}</Badge>
            {item.isPrimary ? <Badge variant="primary">Primary</Badge> : null}
            <Badge variant={scoreVariant(item.corridorScore)}>Score {item.corridorScore}</Badge>
          </div>
          <p className="text-sm text-muted">{item.market?.name} · {labelFor(TRANSPORT_MODES, item.primaryMode)} · {item.transitAvgDays} days</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/export/calculator?corridorId=${item.id}&marketId=${item.marketId}`}><Button variant="outline">Calculate</Button></Link>
          {can(PERMISSIONS.EXPORT_CORRIDORS_UPDATE) ? <Link href={`/export/corridors/${item.id}/edit`}><Button>Edit</Button></Link> : null}
        </div>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "route", label: "Route" },
          { value: "costs", label: "Costs" },
          { value: "risks", label: "Risks" },
          { value: "performance", label: "Performance" },
        ]}
      />
      {tab === "overview" ? (
        <Card>
          <CardBody className="grid gap-4 md:grid-cols-3">
            <div><p className="text-xs text-muted">Reliability</p><p>{item.reliability}</p></div>
            <div><p className="text-xs text-muted">Capacity</p><p>{item.capacity}</p></div>
            <div><p className="text-xs text-muted">Risk</p><p>{item.riskScore}</p></div>
            {can(PERMISSIONS.EXPORT_CORRIDORS_UPDATE) && profile ? (
              <div className="md:col-span-3 grid gap-3 md:grid-cols-2">
                {profile.factors.map((factor) => (
                  <Input key={factor.key} type="number" label={`${factor.label} (${factor.weight}%)`} value={breakdown[factor.key] ?? ""} onChange={(event) => setBreakdown((current) => ({ ...current, [factor.key]: Number(event.target.value) }))} />
                ))}
                <Button onClick={async () => { await exportService.corridors.score(item.id, { breakdown }); toast.success("Scored"); await load(); }}>Recalculate score</Button>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
      {tab === "route" ? (
        <Card>
          <CardBody className="space-y-3">
            {(item.segments || []).map((segment) => (
              <div key={segment.key} className="rounded-md border border-border p-3">
                <p className="font-medium">{labelFor(LOCATION_TYPES, segment.locationType)} · {segment.locationLabel || "—"}</p>
                <p className="text-sm text-muted">{labelFor(TRANSPORT_MODES, segment.mode)} · {segment.transitAvgDays} days · {segment.carrier}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}
      {tab === "costs" ? (
        <Table empty="No costs." rows={(item.costs || []).map((cost, index) => ({ ...cost, id: `${cost.componentCode}-${index}` }))} columns={[
          { key: "nameSnapshot", label: "Component" },
          { key: "amount", label: "Amount" },
          { key: "currency", label: "Currency" },
        ]} />
      ) : null}
      {tab === "risks" ? (
        <Table empty="No risks." rows={risks} columns={[
          { key: "riskType", label: "Type" },
          { key: "score", label: "Score" },
          { key: "severity", label: "Severity" },
          { key: "status", label: "Status" },
        ]} />
      ) : null}
      {tab === "performance" ? (
        <div className="space-y-3">
          {can(PERMISSIONS.EXPORT_CORRIDORS_UPDATE) ? (
            <Button size="sm" onClick={async () => {
              const start = new Date();
              start.setDate(1);
              const end = new Date(start);
              end.setMonth(end.getMonth() + 1);
              await exportService.performance.create(corridorId, { periodStart: start.toISOString(), periodEnd: end.toISOString(), plannedTransitDays: item.transitAvgDays, actualTransitDays: item.transitAvgDays });
              const response = await exportService.performance.list(corridorId);
              setPerformance(response.data.items || []);
            }}>Add this month</Button>
          ) : null}
          <Table empty="No actuals yet. Add planned vs actual periods." rows={performance} columns={[
            { key: "periodStart", label: "From", render: (row) => formatDate(row.periodStart) },
            { key: "actualTransitDays", label: "Actual transit" },
            { key: "actualCost", label: "Actual cost" },
            { key: "onTimeDeliveryPct", label: "OTD %" },
            { key: "shipmentVolume", label: "Volume" },
          ]} />
        </div>
      ) : null}
    </div>
  );
}
