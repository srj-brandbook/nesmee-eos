"use client";

import { useEffect, useState } from "react";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { permissionService } from "@/services/permissionService";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { PERMISSIONS } from "@/constants/permissions";

function Catalog() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    permissionService.list().then((response) => setItems(response.data.items));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Permission catalog</h1>
        <p className="text-sm text-muted">Seeded only. Add new names when you add a module.</p>
      </div>
      <Card>
        <Table
          columns={[
            { key: "name", label: "Name" },
            { key: "module", label: "Module" },
            { key: "action", label: "Action" },
            { key: "description", label: "Description" },
          ]}
          rows={items}
          empty="No permissions seeded"
        />
      </Card>
    </div>
  );
}

export default function PermissionsPage() {
  return (
    <PermissionGate permission={PERMISSIONS.PERMISSIONS_VIEW}>
      <Catalog />
    </PermissionGate>
  );
}
