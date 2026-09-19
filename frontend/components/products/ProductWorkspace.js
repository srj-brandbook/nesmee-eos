"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { productService } from "@/services/productService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { labelFor, PRODUCT_STATUSES, PRODUCT_LISTING_STATUSES, productStatusVariant, listingStatusVariant } from "@/constants/products";
import { labelFor as verificationLabel, LEAD_VERIFICATION_STATUSES, verificationStatusVariant } from "@/constants/verification";
import { ProductSharePanel } from "./ProductSharePanel";
import { ProductVerificationPanel } from "./ProductVerificationPanel";
import { ApiClientError } from "@/lib/api/apiClient";
import { previewUrl } from "@/lib/cloudinaryMedia";

export function ProductWorkspace({ productId }) {
  const { can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [busy, setBusy] = useState("");

  async function load() {
    const response = await productService.get(productId);
    setProduct(response.data.product);
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load product"));
  }, [productId]);

  async function run(action, fn, success) {
    setBusy(action);
    try {
      await fn();
      toast.success(success);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Action failed");
    } finally {
      setBusy("");
    }
  }

  if (!product) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const canList = can(PERMISSIONS.PRODUCTS_LIST) && (product.verificationStatus === "verified" || product.origin === "migrated");

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-4">
          <button type="button" onClick={() => router.push(ROUTES.products)} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-text">
            <ArrowLeft className="h-3.5 w-3.5" />
            Products
          </button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              {product.thumbnail?.url ? (
                <img src={previewUrl(product.thumbnail) || product.thumbnail.url} alt="" className="h-16 w-16 rounded-lg object-cover" />
              ) : null}
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Product</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <h1 className="truncate font-display text-2xl font-semibold">{product.name}</h1>
                  <Badge variant={productStatusVariant(product.status)}>{labelFor(PRODUCT_STATUSES, product.status)}</Badge>
                  <Badge variant={listingStatusVariant(product.listingStatus)}>{labelFor(PRODUCT_LISTING_STATUSES, product.listingStatus)}</Badge>
                  {product.origin === "migrated" && product.verificationStatus === "none" ? (
                    <Badge variant="warning">Legacy — not catalog-verified</Badge>
                  ) : (
                    <Badge variant={verificationStatusVariant(product.verificationStatus)}>
                      {verificationLabel(LEAD_VERIFICATION_STATUSES, product.verificationStatus)}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">
                  {product.supplier ? (
                    <Link className="text-primary hover:underline" href={`${ROUTES.suppliers}/${product.supplierId}`}>{product.supplier.name}</Link>
                  ) : "No supplier"}
                  {product.sku ? ` · ${product.sku}` : ""}
                  {product.category ? ` · ${product.category}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {can(PERMISSIONS.PRODUCTS_UPDATE) ? (
                <Link href={`${ROUTES.products}/${productId}/edit`}>
                  <Button variant="outline">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                </Link>
              ) : null}
              {canList && product.listingStatus !== "listed" ? (
                <Button loading={busy === "list"} onClick={() => run("list", () => productService.listToCatalog(productId), "Product listed")}>
                  List to catalog
                </Button>
              ) : null}
              {can(PERMISSIONS.PRODUCTS_LIST) && product.listingStatus === "listed" ? (
                <Button variant="outline" loading={busy === "unlist"} onClick={() => run("unlist", () => productService.unlist(productId), "Product unlisted")}>
                  Unlist
                </Button>
              ) : null}
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          {product.description ? (
            <Card>
              <CardHeader>Description</CardHeader>
              <CardBody className="whitespace-pre-wrap text-sm">{product.description}</CardBody>
            </Card>
          ) : null}

          {(product.media || []).length ? (
            <Card>
              <CardHeader>Media</CardHeader>
              <CardBody className="grid gap-3 sm:grid-cols-3">
                {product.media.map((item, index) => (
                  <div key={item.id || index} className="rounded-md border border-border p-2">
                    {item.kind === "photo" && item.file?.url ? (
                      <img src={item.file.url} alt={item.caption || product.name} className="h-32 w-full rounded object-cover" />
                    ) : item.kind === "video" && item.file?.url ? (
                      <video src={item.file.url} controls className="h-32 w-full rounded bg-black" />
                    ) : item.file?.url ? (
                      <a href={item.file.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">{item.file.name || "Document"}</a>
                    ) : (
                      <p className="text-sm text-muted">No file</p>
                    )}
                    <p className="mt-1 text-xs text-muted">{item.caption || item.role}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}

          {(product.measurements || []).length ? (
            <Card>
              <CardHeader>Measurements</CardHeader>
              <CardBody className="space-y-2 text-sm">
                {product.measurements.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="flex justify-between gap-2">
                    <span>{item.name || "Measurement"}</span>
                    <span className="text-muted">{[item.value, item.maxValue ? `– ${item.maxValue}` : "", item.unit].filter(Boolean).join(" ")}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}

          {(product.attributes || []).length ? (
            <Card>
              <CardHeader>Specifications</CardHeader>
              <CardBody className="space-y-2 text-sm">
                {product.attributes.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="flex justify-between gap-2">
                    <span>{[item.group, item.name].filter(Boolean).join(" · ")}</span>
                    <span className="text-muted">{[item.value, item.unit].filter(Boolean).join(" ")}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}

          <ProductVerificationPanel product={product} onChanged={load} />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-20">
          <Card>
            <CardHeader>Commercial</CardHeader>
            <CardBody className="space-y-2 text-sm">
              <p>MOQ: {product.moq?.value ? `${product.moq.value} ${product.moq.unit || ""}` : "—"}</p>
              <p>Lead time: {product.leadTimeDays ? `${product.leadTimeDays} days` : "—"}</p>
              <p>Incoterm: {product.incotermCode || "—"}</p>
              {product.indicativePrice != null ? <p>Indicative price: {product.indicativePrice} {product.currency || ""}</p> : null}
            </CardBody>
          </Card>
          <ProductSharePanel product={product} onChanged={load} />
        </aside>
      </div>
    </div>
  );
}
