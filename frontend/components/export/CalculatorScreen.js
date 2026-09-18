"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { exportService } from "@/services/exportService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { Alert } from "@/components/ui/Alert";
import { IncotermSelect } from "./ExportSelects";
import { PERMISSIONS } from "@/constants/permissions";
import { formatMoney } from "@/lib/utils";
import { ApiClientError } from "@/lib/api/apiClient";

export function LandedCostCalculator() {
  const params = useSearchParams();
  const { can } = useAuth();
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [corridors, setCorridors] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [form, setForm] = useState({
    productId: "",
    marketId: params.get("marketId") || "",
    corridorId: params.get("corridorId") || "",
    buyerId: "",
    opportunityId: params.get("opportunityId") || "",
    quantity: 1,
    unitPrice: 0,
    sellingPrice: 0,
    incotermCode: "CIF",
    currency: "USD",
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    exportService.products.list({ limit: 100 }).then((response) => setProducts(response.data.items || []));
    exportService.markets.list({ limit: 100 }).then((response) => setMarkets(response.data.items || []));
    exportService.buyers.list({ limit: 100 }).then((response) => setBuyers(response.data.items || [])).catch(() => {});
    exportService.opportunities.list({ limit: 100 }).then((response) => setOpportunities(response.data.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.marketId) return;
    exportService.corridors.list({ marketId: form.marketId, limit: 100 }).then((response) => setCorridors(response.data.items || []));
  }, [form.marketId]);

  async function calculate(save = false) {
    setError("");
    try {
      const response = await exportService.calculate({ ...form, save });
      setResult(response.data);
      if (save) toast.success("Estimate saved");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not calculate");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Landed cost calculator</h1>
        <p className="text-sm text-muted">Product cost through corridor costs to margin, using configured incoterms.</p>
      </div>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Card>
        <CardHeader>Assumptions</CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-3">
          <Select label="Product" value={form.productId} onChange={(event) => {
            const product = products.find((item) => item.id === event.target.value);
            setForm((current) => ({ ...current, productId: event.target.value, unitPrice: product?.baseCost || current.unitPrice }));
          }}>
            <option value="">Select</option>
            {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select label="Market" value={form.marketId} onChange={(event) => setForm((current) => ({ ...current, marketId: event.target.value, corridorId: "" }))}>
            <option value="">Select</option>
            {markets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select label="Corridor" value={form.corridorId} onChange={(event) => setForm((current) => ({ ...current, corridorId: event.target.value }))}>
            <option value="">Select</option>
            {corridors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select label="Distributor" value={form.buyerId} onChange={(event) => setForm((current) => ({ ...current, buyerId: event.target.value }))}>
            <option value="">Optional</option>
            {buyers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select label="Opportunity" value={form.opportunityId} onChange={(event) => setForm((current) => ({ ...current, opportunityId: event.target.value }))}>
            <option value="">Optional snapshot target</option>
            {opportunities.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </Select>
          <IncotermSelect value={form.incotermCode} allowEmpty={false} onChange={(event) => setForm((current) => ({ ...current, incotermCode: event.target.value }))} />
          <Input type="number" label="Quantity" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))} />
          <Input type="number" label="Unit price" value={form.unitPrice} onChange={(event) => setForm((current) => ({ ...current, unitPrice: Number(event.target.value) }))} />
          <Input type="number" label="Selling price" value={form.sellingPrice} onChange={(event) => setForm((current) => ({ ...current, sellingPrice: Number(event.target.value) }))} />
          <Input label="View currency" value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} />
        </CardBody>
      </Card>
      <div className="flex gap-2">
        <Button onClick={() => calculate(false)}>Calculate</Button>
        <Button variant="outline" onClick={() => calculate(true)}>Save snapshot</Button>
      </div>
      {result ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <Table
            empty=""
            rows={(result.lines || []).map((line) => ({ ...line, id: line.componentCode }))}
            columns={[
              { key: "name", label: "Component" },
              { key: "included", label: "Included", render: (row) => (row.included ? "Yes" : "No") },
              { key: "amount", label: "Amount", render: (row) => formatMoney(row.amount, row.currency) },
              { key: "convertedAmount", label: "Converted", render: (row) => formatMoney(row.convertedAmount, result.currency) },
            ]}
          />
          <Card>
            <CardHeader>Result</CardHeader>
            <CardBody className="space-y-2 text-sm">
              <p>Landed cost: <strong>{formatMoney(result.landedCost, result.currency)}</strong></p>
              {can(PERMISSIONS.EXPORT_FINANCE_VIEW) ? (
                <>
                  <p>Selling price: {formatMoney(result.sellingPrice, result.currency)}</p>
                  <p>Gross profit: {formatMoney(result.grossProfit, result.currency)}</p>
                  <p>Gross margin: {result.grossMarginPct ?? "—"}%</p>
                </>
              ) : (
                <p className="text-muted">Margin is hidden without finance access.</p>
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
