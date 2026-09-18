"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ExportOwnerSelect, LookupSelect } from "./ExportSelects";
import { exportService } from "@/services/exportService";
import { MARKET_STATUSES } from "@/constants/export";
import { useToast } from "@/contexts/ToastProvider";
import { ApiClientError } from "@/lib/api/apiClient";

const emptyForm = {
  name: "",
  countryCode: "",
  countryName: "",
  regionCode: "",
  currencyCode: "USD",
  timeZone: "",
  language: "",
  status: "research",
  marketType: "",
  targetSegment: "",
  marketSize: 0,
  estimatedDemand: 0,
  expectedAnnualVolume: 0,
  targetRevenue: 0,
  expectedMargin: 0,
  growthPotential: 0,
  description: "",
  notes: "",
  ownerId: "",
  managerId: "",
};

export function MarketForm({ marketId }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [countries, setCountries] = useState([]);

  useEffect(() => {
    exportService.lookups.list({ type: "country", limit: 100 }).then((response) => setCountries(response.data.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!marketId) return;
    exportService.markets.get(marketId).then((response) => {
      const market = response.data.market;
      setForm({ ...emptyForm, ...market, ownerId: market.ownerId || "", managerId: market.managerId || "" });
    });
  }, [marketId]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFields({});
    const payload = { ...form, ownerId: form.ownerId || null, managerId: form.managerId || null };
    try {
      if (marketId) {
        await exportService.markets.update(marketId, payload);
        toast.success("Market updated");
        router.push(`/export/markets/${marketId}`);
      } else {
        const response = await exportService.markets.create(payload);
        toast.success("Market created");
        router.push(`/export/markets/${response.data.market.id}`);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        setFields(err.fields || {});
      } else setError("Could not save market");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <h1 className="font-display text-2xl font-semibold">{marketId ? "Edit market" : "New market"}</h1>
        <p className="text-sm text-muted">A destination country or defined geographical export market.</p>
      </div>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Card>
        <CardHeader>Identity</CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Input label="Market name" requiredMark value={form.name} error={fields.name} onChange={(event) => setField("name", event.target.value)} />
          <Select
            label="Country"
            requiredMark
            value={form.countryCode}
            error={fields.countryCode}
            onChange={(event) => {
              const country = countries.find((item) => item.code === event.target.value);
              setForm((current) => ({
                ...current,
                countryCode: event.target.value,
                countryName: country?.name || "",
                regionCode: country?.metadata?.region || current.regionCode,
                currencyCode: country?.metadata?.currency || current.currencyCode,
              }));
            }}
          >
            <option value="">Select country</option>
            {countries.map((item) => (
              <option key={item.id} value={item.code}>
                {item.name}
              </option>
            ))}
          </Select>
          <LookupSelect type="region" label="Region" value={form.regionCode} onChange={(event) => setField("regionCode", event.target.value)} />
          <LookupSelect type="currency" label="Currency" value={form.currencyCode} onChange={(event) => setField("currencyCode", event.target.value)} />
          <Input label="Time zone" value={form.timeZone} onChange={(event) => setField("timeZone", event.target.value)} />
          <Input label="Language" value={form.language} onChange={(event) => setField("language", event.target.value)} />
          <LookupSelect type="market_type" label="Market type" value={form.marketType} onChange={(event) => setField("marketType", event.target.value)} />
          <Select label="Status" value={form.status} onChange={(event) => setField("status", event.target.value)}>
            {MARKET_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>Commercial</CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Input label="Target segment" value={form.targetSegment} onChange={(event) => setField("targetSegment", event.target.value)} />
          <Input type="number" label="Market size" value={form.marketSize} onChange={(event) => setField("marketSize", Number(event.target.value))} />
          <Input type="number" label="Estimated demand" value={form.estimatedDemand} onChange={(event) => setField("estimatedDemand", Number(event.target.value))} />
          <Input type="number" label="Expected annual volume" value={form.expectedAnnualVolume} onChange={(event) => setField("expectedAnnualVolume", Number(event.target.value))} />
          <Input type="number" label="Target revenue" value={form.targetRevenue} onChange={(event) => setField("targetRevenue", Number(event.target.value))} />
          <Input type="number" label="Expected margin %" value={form.expectedMargin} onChange={(event) => setField("expectedMargin", Number(event.target.value))} />
          <Input type="number" label="Growth potential (0-100)" value={form.growthPotential} onChange={(event) => setField("growthPotential", Number(event.target.value))} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader>Ownership</CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <ExportOwnerSelect value={form.ownerId} onChange={(event) => setField("ownerId", event.target.value)} />
          <ExportOwnerSelect label="Market manager" value={form.managerId} onChange={(event) => setField("managerId", event.target.value)} />
          <div className="md:col-span-2">
            <Textarea label="Description" value={form.description} onChange={(event) => setField("description", event.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={(event) => setField("notes", event.target.value)} />
          </div>
        </CardBody>
      </Card>
      <div className="flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Save market
        </Button>
      </div>
    </form>
  );
}
