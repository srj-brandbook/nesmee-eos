"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PermissionGate } from "@/components/layout/PermissionGate";
import { PermissionMatrix } from "@/components/roles/PermissionMatrix";
import { roleService } from "@/services/roleService";
import { permissionService } from "@/services/permissionService";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PERMISSIONS } from "@/constants/permissions";
import { useAuth } from "@/contexts/AuthProvider";

function RoleDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const [data, setData] = useState(null);
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    roleService.get(id).then((response) => setData(response.data));
    permissionService.list().then((response) => setPermissions(response.data.items)).catch(() => {});
  }, [id]);

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">{data.role.name}</h1>
          <p className="text-sm text-muted">{data.role.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {data.role.isSystem ? <Badge>System</Badge> : null}
          {can(PERMISSIONS.ROLES_UPDATE) ? (
            <Link href={`/roles/${id}/edit`}>
              <Button>Edit</Button>
            </Link>
          ) : null}
        </div>
      </div>
      <PermissionMatrix permissions={permissions} selected={data.role.permissionIds} readOnly onChange={() => {}} />
      <Card>
        <CardHeader>Assigned users</CardHeader>
        <CardBody className="space-y-2 text-sm">
          {data.users.map((user) => (
            <Link key={user.id} href={`/users/${user.id}`} className="block text-primary">
              {user.name} · {user.email}
            </Link>
          ))}
          {data.users.length === 0 ? <p className="text-muted">No users assigned.</p> : null}
        </CardBody>
      </Card>
    </div>
  );
}

export default function RoleDetailPage() {
  return (
    <PermissionGate permission={PERMISSIONS.ROLES_VIEW}>
      <RoleDetail />
    </PermissionGate>
  );
}
