"use client";

import { useEffect, useState } from "react";
import { Select } from "@/components/ui/Select";
import { leadService } from "@/services/crmService";

export function OwnerSelect({ label = "Owner", value, onChange, error, allowEmpty = true, emptyLabel = "Unassigned" }) {
  const [people, setPeople] = useState([]);

  useEffect(() => {
    leadService
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
