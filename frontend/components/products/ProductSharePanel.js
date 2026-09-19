"use client";

import { useEffect, useState } from "react";
import { productService } from "@/services/productService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { PERMISSIONS } from "@/constants/permissions";
import { ApiClientError } from "@/lib/api/apiClient";
import { formatDate } from "@/lib/utils";

export function ProductSharePanel({ product, onChanged }) {
  const { can } = useAuth();
  const toast = useToast();
  const [buyers, setBuyers] = useState([]);
  const [buyerId, setBuyerId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const shares = product?.shares || [];
  const listed = product?.listingStatus === "listed";

  useEffect(() => {
    if (!can(PERMISSIONS.PRODUCTS_SHARE)) return;
    productService.distributors({ limit: 100 }).then((response) => setBuyers(response.data.items || [])).catch(() => {});
  }, [can]);

  async function share(event) {
    event.preventDefault();
    if (!buyerId) return;
    setSaving(true);
    try {
      await productService.share(product.id, { buyerId, note });
      toast.success("Shared with distributor");
      setBuyerId("");
      setNote("");
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not share product");
    } finally {
      setSaving(false);
    }
  }

  async function revoke(shareId) {
    try {
      await productService.revokeShare(product.id, shareId);
      toast.success("Share revoked");
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not revoke share");
    }
  }

  const sharedIds = new Set(shares.filter((item) => item.status === "shared").map((item) => item.buyerId));

  return (
    <Card>
      <CardHeader>Share with distributors</CardHeader>
      <CardBody className="space-y-4">
        {listed && can(PERMISSIONS.PRODUCTS_SHARE) ? (
          <form className="space-y-3" onSubmit={share}>
            <Select label="Distributor" value={buyerId} onChange={(event) => setBuyerId(event.target.value)}>
              <option value="">Select a distributor</option>
              {buyers.filter((item) => !sharedIds.has(item.id)).map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </Select>
            <Textarea label="Note" value={note} onChange={(event) => setNote(event.target.value)} />
            <Button type="submit" loading={saving} disabled={!buyerId}>Share</Button>
          </form>
        ) : (
          <p className="text-sm text-muted">{listed ? "You cannot share this product." : "List the product before sharing it with distributors."}</p>
        )}
        <ul className="space-y-2">
          {shares.filter((item) => item.status === "shared").map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{item.buyer?.name || "Distributor"}</p>
                <p className="text-xs text-muted">Shared {formatDate(item.sharedAt)}</p>
              </div>
              {can(PERMISSIONS.PRODUCTS_SHARE) ? (
                <Button size="sm" variant="ghost" onClick={() => revoke(item.id)}>Revoke</Button>
              ) : null}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
