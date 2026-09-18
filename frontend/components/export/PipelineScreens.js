"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Columns3, Plus, Table2 } from "lucide-react";
import { exportService } from "@/services/exportService";
import { OnboardingPanel } from "@/components/onboarding/OnboardingPanel";
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
import { Alert } from "@/components/ui/Alert";
import { KanbanBoard } from "@/components/crm/KanbanBoard";
import { PERMISSIONS } from "@/constants/permissions";
import { OPPORTUNITY_STAGES, BUYER_STATUSES, labelFor, statusVariant } from "@/constants/export";
import { ExportOwnerSelect, IncotermSelect } from "./ExportSelects";
import { ApiClientError } from "@/lib/api/apiClient";

export function OpportunityWorkspace() {
  const { can } = useAuth();
  const toast = useToast();
  const { value, setValue, debounced } = useDebouncedSearch();
  const { page, setPage, limit } = usePagination({ page: 1, limit: 50 });
  const [view, setView] = useState("table");
  const [stage, setStage] = useState("");
  const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });

  async function load() {
    const response = await exportService.opportunities.list({ search: debounced, stage, page: view === "board" ? 1 : page, limit: view === "board" ? 100 : limit, board: view === "board" ? "true" : undefined });
    setData(response.data);
  }
  useEffect(() => { load().catch(() => toast.error("Unable to load opportunities")); }, [debounced, stage, page, limit, view]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Export opportunities</h1>
          <p className="text-sm text-muted">Pipeline from identified demand to converted business.</p>
        </div>
        <div className="flex gap-2">
          <div className="inline-flex rounded-md border border-border p-0.5">
            <Button size="icon" variant={view === "table" ? "primary" : "ghost"} className="h-8 w-8" onClick={() => setView("table")}><Table2 className="h-4 w-4" /></Button>
            <Button size="icon" variant={view === "board" ? "primary" : "ghost"} className="h-8 w-8" onClick={() => setView("board")}><Columns3 className="h-4 w-4" /></Button>
          </div>
          {can(PERMISSIONS.EXPORT_OPPORTUNITIES_CREATE) ? <Link href="/export/opportunities/new"><Button><Plus className="h-4 w-4" /> New</Button></Link> : null}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Input label="Search" value={value} onChange={(event) => { setValue(event.target.value); setPage(1); }} />
        <Select label="Stage" value={stage} onChange={(event) => setStage(event.target.value)}>
          <option value="">All</option>
          {OPPORTUNITY_STAGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </Select>
      </div>
      {view === "board" ? (
        <KanbanBoard
          columns={OPPORTUNITY_STAGES.filter((item) => item.value !== "lost")}
          items={data.items}
          onMove={async (id, next) => {
            await exportService.opportunities.stage(id, { stage: next });
            await load();
          }}
          renderCard={(item) => (
            <Link href={`/export/opportunities/${item.id}/edit`}>
              <p className="font-medium">{item.title}</p>
              <p className="text-xs text-muted">{item.market?.name || "No market"}</p>
            </Link>
          )}
        />
      ) : (
        <Card>
          <Table
            empty="No opportunities."
            rows={data.items}
            columns={[
              { key: "title", label: "Opportunity", render: (row) => <Link className="text-primary" href={`/export/opportunities/${row.id}/edit`}>{row.title}</Link> },
              { key: "market", label: "Market", render: (row) => row.market?.name },
              { key: "stage", label: "Stage", render: (row) => <Badge variant={statusVariant(row.stage)}>{labelFor(OPPORTUNITY_STAGES, row.stage)}</Badge> },
              { key: "expectedRevenue", label: "Revenue" },
              { key: "probability", label: "Probability" },
            ]}
          />
          <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />
        </Card>
      )}
    </div>
  );
}

const emptyOpp = { title: "", marketId: "", productId: "", buyerId: "", corridorId: "", expectedVolume: 0, expectedRevenue: 0, expectedMargin: 0, probability: 20, incotermCode: "CIF", currency: "USD", stage: "identified", ownerId: "", nextAction: "", notes: "" };

export function OpportunityForm({ opportunityId }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(emptyOpp);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [lists, setLists] = useState({ markets: [], products: [], buyers: [], corridors: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      exportService.markets.list({ limit: 100 }),
      exportService.products.list({ limit: 100 }),
      exportService.buyers.list({ limit: 100 }),
      exportService.corridors.list({ limit: 100 }),
    ]).then(([markets, products, buyers, corridors]) => {
      setLists({ markets: markets.data.items, products: products.data.items, buyers: buyers.data.items, corridors: corridors.data.items });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!opportunityId) return;
    exportService.opportunities.get(opportunityId).then((response) => {
      const item = response.data.opportunity;
      setForm({ ...emptyOpp, ...item, ownerId: item.ownerId || "" });
      setSnapshot(item.landedCostSnapshot || null);
    });
  }, [opportunityId]);

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, ownerId: form.ownerId || null, marketId: form.marketId || null, productId: form.productId || null, buyerId: form.buyerId || null, corridorId: form.corridorId || null };
      if (opportunityId) await exportService.opportunities.update(opportunityId, payload);
      else await exportService.opportunities.create(payload);
      toast.success("Opportunity saved");
      router.push("/export/opportunities");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <h1 className="font-display text-2xl font-semibold">{opportunityId ? "Edit opportunity" : "New opportunity"}</h1>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Card>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Input label="Title" requiredMark value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <Select label="Stage" value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value })}>
            {OPPORTUNITY_STAGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <Select label="Market" value={form.marketId || ""} onChange={(event) => setForm({ ...form, marketId: event.target.value })}>
            <option value="">Select</option>
            {lists.markets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select label="Product" value={form.productId || ""} onChange={(event) => setForm({ ...form, productId: event.target.value })}>
            <option value="">Select</option>
            {lists.products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select label="Distributor" value={form.buyerId || ""} onChange={(event) => setForm({ ...form, buyerId: event.target.value })}>
            <option value="">Select</option>
            {lists.buyers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select label="Preferred corridor" value={form.corridorId || ""} onChange={(event) => setForm({ ...form, corridorId: event.target.value })}>
            <option value="">Select</option>
            {lists.corridors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Input type="number" label="Expected volume" value={form.expectedVolume} onChange={(event) => setForm({ ...form, expectedVolume: Number(event.target.value) })} />
          <Input type="number" label="Expected revenue" value={form.expectedRevenue} onChange={(event) => setForm({ ...form, expectedRevenue: Number(event.target.value) })} />
          <Input type="number" label="Expected margin %" value={form.expectedMargin} onChange={(event) => setForm({ ...form, expectedMargin: Number(event.target.value) })} />
          <Input type="number" label="Probability" value={form.probability} onChange={(event) => setForm({ ...form, probability: Number(event.target.value) })} />
          <IncotermSelect value={form.incotermCode} onChange={(event) => setForm({ ...form, incotermCode: event.target.value })} />
          <ExportOwnerSelect value={form.ownerId} onChange={(event) => setForm({ ...form, ownerId: event.target.value })} />
          <Input label="Next action" value={form.nextAction} onChange={(event) => setForm({ ...form, nextAction: event.target.value })} />
          <div className="md:col-span-2"><Textarea label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
        </CardBody>
      </Card>
      {opportunityId ? (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <span>Landed cost snapshot</span>
            <Link href={`/export/calculator?opportunityId=${opportunityId}&marketId=${form.marketId || ""}&corridorId=${form.corridorId || ""}`}>
              <Button type="button" size="sm" variant="outline">Update via calculator</Button>
            </Link>
          </CardHeader>
          <CardBody className="text-sm text-muted">
            {snapshot ? (
              <p>
                Landed cost {snapshot.landedCost} {snapshot.currency}
                {snapshot.grossMarginPct != null ? ` · Margin ${snapshot.grossMarginPct}%` : ""}
                {snapshot.incotermCode ? ` · ${snapshot.incotermCode}` : ""}
              </p>
            ) : (
              <p>No calculator snapshot saved yet.</p>
            )}
          </CardBody>
        </Card>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  );
}

const emptyBuyer = { name: "", legalName: "", marketId: "", segment: "", email: "", phone: "", city: "", paymentTerms: "", creditRisk: 0, status: "prospect", notes: "" };

export function BuyerForm({ buyerId }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(emptyBuyer);
  const [markets, setMarkets] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { exportService.markets.list({ limit: 100 }).then((response) => setMarkets(response.data.items || [])); }, []);
  useEffect(() => { if (buyerId) exportService.buyers.get(buyerId).then((response) => setForm({ ...emptyBuyer, ...response.data.buyer })); }, [buyerId]);
  async function onSubmit(event) {
    event.preventDefault();
    try {
      const payload = { ...form, marketId: form.marketId || null };
      let savedId = buyerId;
      if (buyerId) await exportService.buyers.update(buyerId, payload);
      else {
        const response = await exportService.buyers.create(payload);
        savedId = response.data.buyer?.id;
      }
      toast.success("Distributor saved");
      router.push(savedId ? `/export/distributors/${savedId}` : "/export/distributors");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save");
    }
  }
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <h1 className="font-display text-2xl font-semibold">{buyerId ? "Edit distributor" : "New distributor"}</h1>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Card>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Input label="Name" requiredMark value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input label="Legal name" value={form.legalName} onChange={(event) => setForm({ ...form, legalName: event.target.value })} />
          <Select label="Market" value={form.marketId || ""} onChange={(event) => setForm({ ...form, marketId: event.target.value })}>
            <option value="">Select</option>
            {markets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Input label="Segment" value={form.segment} onChange={(event) => setForm({ ...form, segment: event.target.value })} />
          <Input label="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <Select label="Status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            {BUYER_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <Input type="number" label="Credit risk" value={form.creditRisk} onChange={(event) => setForm({ ...form, creditRisk: Number(event.target.value) })} />
          <div className="md:col-span-2"><Textarea label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
        </CardBody>
      </Card>
      {buyerId ? (
        <OnboardingPanel
          subjectType="buyer"
          subjectId={buyerId}
          canStart={["prospect", "onboarding"].includes(form.status)}
          startAction={() => exportService.buyers.startOnboarding(buyerId)}
          onStarted={() => exportService.buyers.get(buyerId).then((response) => setForm({ ...emptyBuyer, ...response.data.buyer }))}
        />
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
