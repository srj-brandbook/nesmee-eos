"use client";

import { useEffect, useState } from "react";
import { exportService } from "@/services/exportService";
import { useToast } from "@/contexts/ToastProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Chart } from "@/components/ui/Chart";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { labelFor, OPPORTUNITY_STAGES } from "@/constants/export";
import { formatDateTime } from "@/lib/utils";

export function AnalyticsScreen() {
  const toast = useToast();
  const [filters, setFilters] = useState({ from: "", to: "" });
  const [data, setData] = useState(null);
  const [markets, setMarkets] = useState([]);

  useEffect(() => {
    exportService.markets.list({ limit: 100 }).then((response) => setMarkets(response.data.items || []));
  }, []);

  async function load() {
    try {
      const response = await exportService.analytics(filters);
      setData(response.data);
    } catch {
      toast.error("Unable to load analytics");
    }
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Market analytics</h1>
      <div className="grid gap-3 md:grid-cols-4">
        <Select label="Market" value={filters.marketId || ""} onChange={(event) => setFilters((current) => ({ ...current, marketId: event.target.value }))}>
          <option value="">All</option>
          {markets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        <Input type="date" label="From" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
        <Input type="date" label="To" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
        <div className="flex items-end"><Button onClick={load}>Apply</Button></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>Revenue by market</CardHeader>
          <CardBody>
            {(data?.revenueByMarket || []).length ? (
              <Chart data={(data.revenueByMarket || []).map((row) => ({ name: row.name, value: row.expectedRevenue || row.count }))} />
            ) : (
              <p className="text-sm text-muted">No opportunity data yet.</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Opportunities by stage</CardHeader>
          <CardBody>
            {(data?.opportunitiesByStage || []).length ? (
              <Chart data={(data.opportunitiesByStage || []).map((row) => ({ name: labelFor(OPPORTUNITY_STAGES, row.stage), value: row.count }))} />
            ) : (
              <p className="text-sm text-muted">No pipeline data yet.</p>
            )}
          </CardBody>
        </Card>
      </div>
      <Table
        empty="No corridor usage yet."
        rows={(data?.corridorsByMode || []).map((row) => ({ ...row, id: row._id }))}
        columns={[
          { key: "_id", label: "Mode" },
          { key: "count", label: "Corridors" },
          { key: "avgTransit", label: "Avg transit", render: (row) => Math.round((row.avgTransit || 0) * 10) / 10 },
        ]}
      />
    </div>
  );
}

export function AlertsScreen() {
  const toast = useToast();
  const [data, setData] = useState({ items: [] });
  async function load() {
    const response = await exportService.alerts.list({ limit: 50 });
    setData(response.data);
  }
  useEffect(() => { load().catch(() => toast.error("Unable to load alerts")); }, []);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Export alerts</h1>
      <Table
        empty="No alerts."
        rows={data.items}
        columns={[
          { key: "title", label: "Alert" },
          { key: "eventType", label: "Type" },
          { key: "severity", label: "Severity", render: (row) => <Badge variant={row.severity === "critical" ? "danger" : "warning"}>{row.severity}</Badge> },
          { key: "createdAt", label: "When", render: (row) => formatDateTime(row.createdAt) },
          { key: "read", label: "", render: (row) => row.readAt ? "Read" : <Button size="sm" variant="outline" onClick={async () => { await exportService.alerts.read(row.id); await load(); }}>Mark read</Button> },
        ]}
      />
    </div>
  );
}
