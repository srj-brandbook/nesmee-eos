"use client";

import { useEffect, useState } from "react";
import { exportService } from "@/services/exportService";
import { useToast } from "@/contexts/ToastProvider";
import { Table } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { scoreVariant } from "@/constants/export";
import { Badge } from "@/components/ui/Badge";

export function MarketCompare() {
  const toast = useToast();
  const [markets, setMarkets] = useState([]);
  const [selected, setSelected] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    exportService.markets.list({ limit: 100 }).then((response) => setMarkets(response.data.items || [])).catch(() => toast.error("Unable to load markets"));
  }, [toast]);

  async function compare() {
    try {
      const response = await exportService.markets.compare(selected);
      setResult(response.data);
    } catch {
      toast.error("Select at least two markets");
    }
  }

  const factors = result?.profile?.factors || [];

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Market comparison</h1>
      <Card>
        <CardHeader>Select markets</CardHeader>
        <CardBody className="grid gap-2 md:grid-cols-3">
          {markets.map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={(event) => setSelected((current) => (event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id)))}
              />
              {item.name}
            </label>
          ))}
        </CardBody>
      </Card>
      <Button onClick={compare}>Compare</Button>
      {result ? (
        <Table
          empty="No data"
          rows={result.items}
          columns={[
            { key: "name", label: "Market" },
            ...factors.map((factor) => ({
              key: factor.key,
              label: factor.label,
              render: (row) => row.scoreBreakdown?.[factor.key]?.input ?? "—",
            })),
            { key: "opportunityScore", label: "Opportunity", render: (row) => <Badge variant={scoreVariant(row.opportunityScore)}>{row.opportunityScore}</Badge> },
            { key: "riskScore", label: "Risk" },
          ]}
        />
      ) : null}
    </div>
  );
}

export function CorridorCompare() {
  const toast = useToast();
  const [corridors, setCorridors] = useState([]);
  const [selected, setSelected] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    exportService.corridors.list({ limit: 100 }).then((response) => setCorridors(response.data.items || [])).catch(() => toast.error("Unable to load corridors"));
  }, [toast]);

  async function compare() {
    try {
      const response = await exportService.corridors.compare(selected);
      setResult(response.data);
    } catch {
      toast.error("Select at least two corridors");
    }
  }

  const metrics = [
    ["totalCost", "Total cost"],
    ["freight", "Freight"],
    ["inlandTransport", "Inland transport"],
    ["portCharges", "Port charges"],
    ["handling", "Handling"],
    ["insurance", "Insurance"],
    ["duties", "Duties"],
    ["transitTime", "Transit time"],
    ["reliability", "Reliability"],
    ["capacity", "Capacity"],
    ["risk", "Risk"],
    ["score", "Score"],
  ];

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Corridor comparison</h1>
      <Card>
        <CardBody className="grid gap-2 md:grid-cols-2">
          {corridors.map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => setSelected((current) => (event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id)))} />
              {item.name} {item.market?.name ? `· ${item.market.name}` : ""}
            </label>
          ))}
        </CardBody>
      </Card>
      <Button onClick={compare}>Compare</Button>
      {result?.items?.length ? (
        <Table
          empty=""
          rows={metrics.map(([key, label]) => ({
            id: key,
            metric: label,
            ...Object.fromEntries(result.items.map((item) => [item.id, item.comparison?.[key] ?? item[key] ?? "—"])),
          }))}
          columns={[
            { key: "metric", label: "Metric" },
            ...result.items.map((item) => ({ key: item.id, label: item.name })),
          ]}
        />
      ) : null}
    </div>
  );
}
