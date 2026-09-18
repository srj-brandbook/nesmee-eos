"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { roleService } from "@/services/roleService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { PERMISSIONS } from "@/constants/permissions";

function RolesList() {
  const { can } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [pending, setPending] = useState(null);

  async function load() {
    const response = await roleService.list({ limit: 100 });
    setItems(response.data.items);
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load roles"));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Roles</h1>
        {can(PERMISSIONS.ROLES_CREATE) ? (
          <Link href="/roles/new">
            <Button>Create role</Button>
          </Link>
        ) : null}
      </div>
      <Card>
        <Table
          columns={[
            { key: "name", label: "Name" },
            { key: "userCount", label: "Users" },
            {
              key: "system",
              label: "Type",
              render: (row) => (row.isSystem ? <Badge>System</Badge> : <Badge variant="primary">Custom</Badge>),
            },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <div className="flex gap-2 text-sm">
                  <Link href={`/roles/${row.id}`} className="text-primary">
                    View
                  </Link>
                  {can(PERMISSIONS.ROLES_UPDATE) ? (
                    <Link href={`/roles/${row.id}/edit`} className="text-primary">
                      Edit
                    </Link>
                  ) : null}
                  {can(PERMISSIONS.ROLES_DELETE) && !row.isSystem ? (
                    <button type="button" className="text-danger" onClick={() => setPending(row)}>
                      Delete
                    </button>
                  ) : null}
                </div>
              ),
            },
          ]}
          rows={items}
          empty="No roles yet"
        />
      </Card>
      <ConfirmationDialog
        open={Boolean(pending)}
        title="Delete role"
        description="This role must have no assigned users."
        onClose={() => setPending(null)}
        onConfirm={async () => {
          await roleService.remove(pending.id);
          setPending(null);
          toast.success("Role deleted");
          load();
        }}
      />
    </div>
  );
}

export default function RolesPage() {
  return (
    <PermissionGate permission={PERMISSIONS.ROLES_VIEW}>
      <RolesList />
    </PermissionGate>
  );
}
