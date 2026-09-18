"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { userService } from "@/services/userService";
import { roleService } from "@/services/roleService";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { usePagination } from "@/hooks/usePagination";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Table } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { PERMISSIONS } from "@/constants/permissions";

const statusVariant = {
  active: "success",
  pending_verification: "warning",
  disabled: "danger",
};

export function UsersTable() {
  const { can } = useAuth();
  const toast = useToast();
  const { value, setValue, debounced } = useDebouncedSearch();
  const { page, setPage, limit } = usePagination();
  const [status, setStatus] = useState("");
  const [roleId, setRoleId] = useState("");
  const [sort, setSort] = useState("-createdAt");
  const [roles, setRoles] = useState([]);
  const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });
  const [pendingDelete, setPendingDelete] = useState(null);

  async function load() {
    const response = await userService.list({ search: debounced, status, roleId, sort, page, limit });
    setData(response.data);
  }

  useEffect(() => {
    roleService.list({ limit: 100 }).then((response) => setRoles(response.data.items)).catch(() => {});
  }, []);

  useEffect(() => {
    load().catch(() => toast.error("Unable to load users"));
  }, [debounced, status, roleId, sort, page, limit]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted">Search, filter, and manage accounts.</p>
        </div>
        {can(PERMISSIONS.USERS_CREATE) ? (
          <Link href="/users/new">
            <Button>Create user</Button>
          </Link>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Input label="Search" value={value} onChange={(event) => { setValue(event.target.value); setPage(1); }} />
        <Select label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="pending_verification">Pending</option>
          <option value="disabled">Disabled</option>
        </Select>
        <Select label="Role" value={roleId} onChange={(event) => { setRoleId(event.target.value); setPage(1); }}>
          <option value="">All roles</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </Select>
        <Select label="Sort" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="-createdAt">Newest</option>
          <option value="name">Name</option>
          <option value="email">Email</option>
        </Select>
      </div>
      <Card>
        {data.items.length === 0 ? (
          <EmptyState title="No users" description="Try another search or create a user." />
        ) : (
          <Table
            columns={[
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              {
                key: "status",
                label: "Status",
                render: (row) => <Badge variant={statusVariant[row.status]}>{row.status}</Badge>,
              },
              {
                key: "actions",
                label: "",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/users/${row.id}`} className="text-sm text-primary">
                      View
                    </Link>
                    {can(PERMISSIONS.USERS_UPDATE) ? (
                      <Link href={`/users/${row.id}/edit`} className="text-sm text-primary">
                        Edit
                      </Link>
                    ) : null}
                    {can(PERMISSIONS.USERS_UPDATE) ? (
                      <button
                        type="button"
                        className="text-sm text-primary"
                        onClick={async () => {
                          if (row.status === "disabled") await userService.activate(row.id);
                          else await userService.deactivate(row.id);
                          toast.success("Status updated");
                          load();
                        }}
                      >
                        {row.status === "disabled" ? "Activate" : "Deactivate"}
                      </button>
                    ) : null}
                    {can(PERMISSIONS.USERS_DELETE) ? (
                      <button type="button" className="text-sm text-danger" onClick={() => setPendingDelete(row)}>
                        Delete
                      </button>
                    ) : null}
                  </div>
                ),
              },
            ]}
            rows={data.items}
          />
        )}
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />
      </Card>
      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        title="Delete user"
        description={`Soft-delete ${pendingDelete?.name}? This cannot be undone from the UI.`}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          await userService.remove(pendingDelete.id);
          setPendingDelete(null);
          toast.success("User deleted");
          load();
        }}
      />
    </div>
  );
}
