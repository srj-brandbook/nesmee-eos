"use client";

import { useEffect, useState } from "react";
import { Select } from "@/components/ui/Select";
import { exportService } from "@/services/exportService";

export function ExportOwnerSelect({ label = "Owner", value, onChange, error, allowEmpty = true, emptyLabel = "Unassigned" }) {
  const [people, setPeople] = useState([]);

  useEffect(() => {
    exportService
      .assignees()
      .then((response) => setPeople(response.data.items || []))
      .catch(() => setPeople([]));
  }, []);

  return (
    <Select label={label} value={value || ""} error={error} onChange={onChange}>
      {allowEmpty ? <option value="">{emptyLabel}</option> : null}
      {people.map((person) => (
        <option key={person.id} value={person.id}>
          {person.name}
        </option>
      ))}
    </Select>
  );
}

export function LookupSelect({ type, label, value, onChange, error, allowEmpty = true, emptyLabel = "Select", countryCode, requiredMark }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    exportService.lookups
      .list({ type, status: "active", limit: 100, countryCode })
      .then((response) => setItems(response.data.items || []))
      .catch(() => setItems([]));
  }, [type, countryCode]);

  return (
    <Select label={label} value={value || ""} error={error} onChange={onChange} requiredMark={requiredMark}>
      {allowEmpty ? <option value="">{emptyLabel}</option> : null}
      {items.map((item) => (
        <option key={item.id} value={item.code || item.id}>
          {item.name} {item.code ? `(${item.code})` : ""}
        </option>
      ))}
    </Select>
  );
}

export function IncotermSelect({ label = "Incoterm", value, onChange, error, allowEmpty = true }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    exportService.incoterms
      .list({ status: "active", limit: 50 })
      .then((response) => setItems(response.data.items || []))
      .catch(() => setItems([]));
  }, []);
  return (
    <Select label={label} value={value || ""} error={error} onChange={onChange}>
      {allowEmpty ? <option value="">Select</option> : null}
      {items.map((item) => (
        <option key={item.id} value={item.code}>
          {item.code} — {item.name}
        </option>
      ))}
    </Select>
  );
}
