"use client";

import { useEffect, useState } from "react";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { auditService } from "@/services/auditService";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { formatDate } from "@/lib/utils";
import { PERMISSIONS } from "@/constants/permissions";

function AuditLogs() {
  const [moduleName, setModuleName] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });

  useEffect(() => {
    auditService.list({ module: moduleName, action, page, limit: 20 }).then((response) => setData(response.data));
  }, [action, moduleName, page]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Audit logs</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Module" value={moduleName} onChange={(event) => { setModuleName(event.target.value); setPage(1); }} />
        <Input label="Action" value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} />
      </div>
      <Card>
        <Table
          columns={[
            { key: "createdAt", label: "When", render: (row) => formatDate(row.createdAt) },
            { key: "actorEmail", label: "Actor" },
            { key: "module", label: "Module" },
            { key: "action", label: "Action" },
            { key: "resourceType", label: "Resource" },
          ]}
          rows={data.items}
          empty="No audit events"
        />
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />
      </Card>
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <PermissionGate permission={PERMISSIONS.AUDIT_VIEW}>
      <AuditLogs />
    </PermissionGate>
  );
}
