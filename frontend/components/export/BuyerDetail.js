"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Pencil } from "lucide-react";
import { exportService } from "@/services/exportService";
import { OnboardingPanel } from "@/components/onboarding/OnboardingPanel";
import { DistributorProductsPanel } from "@/components/products/DistributorProductsPanel";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { BUYER_STATUSES, OPPORTUNITY_STAGES, labelFor, statusVariant } from "@/constants/export";
import { formatDate } from "@/lib/utils";

function Fact({ label, value, href }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      {href ? (
        <Link href={href} className="mt-0.5 block text-sm text-primary hover:underline">
          {value}
        </Link>
      ) : (
        <p className="mt-0.5 text-sm">{value}</p>
      )}
    </div>
  );
}

export function BuyerDetail({ buyerId }) {
  const { can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [buyer, setBuyer] = useState(null);
  const [opportunities, setOpportunities] = useState([]);

  async function load() {
    const response = await exportService.buyers.get(buyerId);
    setBuyer(response.data.buyer);
    if (can(PERMISSIONS.EXPORT_OPPORTUNITIES_VIEW)) {
      try {
        const opp = await exportService.opportunities.list({ buyerId, limit: 50, sort: "-createdAt" });
        setOpportunities(opp.data.items || []);
      } catch {
        setOpportunities([]);
      }
    }
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load distributor"));
  }, [buyerId]);

  if (!buyer) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const location = [buyer.city, buyer.country].filter(Boolean).join(", ");

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-4">
          <button
            type="button"
            onClick={() => router.push(ROUTES.exportDistributors)}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Distributors
          </button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Distributor</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <h1 className="truncate font-display text-2xl font-semibold">{buyer.name}</h1>
                  <Badge variant={statusVariant(buyer.status)}>{labelFor(BUYER_STATUSES, buyer.status)}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {buyer.legalName || location || buyer.market?.name || "No location yet"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {can(PERMISSIONS.EXPORT_BUYERS_UPDATE) ? (
                <Link href={`${ROUTES.exportDistributors}/${buyerId}/edit`}>
                  <Button variant="outline">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader>Profile</CardHeader>
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Fact
                label="Market"
                value={buyer.market?.name}
                href={buyer.marketId ? `${ROUTES.exportMarkets}/${buyer.marketId}` : undefined}
              />
              <Fact label="Country" value={buyer.country} />
              <Fact label="City" value={buyer.city} />
              <Fact label="Segment" value={buyer.segment} />
              <Fact label="Email" value={buyer.email} />
              <Fact label="Phone" value={buyer.phone} />
              <Fact label="Payment terms" value={buyer.paymentTerms} />
              <Fact label="Product interest" value={buyer.productInterest} />
              <Fact label="Credit risk" value={buyer.creditRisk != null ? String(buyer.creditRisk) : ""} />
              {buyer.notes ? (
                <div className="sm:col-span-2">
                  <Fact label="Notes" value={buyer.notes} />
                </div>
              ) : null}
            </CardBody>
          </Card>

          <DistributorProductsPanel buyerId={buyerId} />

          <OnboardingPanel
            subjectType="buyer"
            subjectId={buyerId}
            canStart={can(PERMISSIONS.EXPORT_BUYERS_UPDATE) && ["prospect", "onboarding"].includes(buyer.status)}
            startAction={() => exportService.buyers.startOnboarding(buyerId)}
            onStarted={load}
          />

          {can(PERMISSIONS.EXPORT_OPPORTUNITIES_VIEW) ? (
            <Card>
              <CardHeader className="flex items-center justify-between gap-2">
                <span>Related opportunities</span>
                {can(PERMISSIONS.EXPORT_OPPORTUNITIES_CREATE) ? (
                  <Link href={`${ROUTES.exportOpportunities}/new`} className="text-sm text-primary">
                    New opportunity
                  </Link>
                ) : null}
              </CardHeader>
              <Table
                empty="No opportunities for this distributor."
                rows={opportunities}
                columns={[
                  {
                    key: "title",
                    label: "Opportunity",
                    render: (row) => (
                      <Link className="text-primary" href={`${ROUTES.exportOpportunities}/${row.id}/edit`}>
                        {row.title}
                      </Link>
                    ),
                  },
                  {
                    key: "stage",
                    label: "Stage",
                    render: (row) => <Badge variant={statusVariant(row.stage)}>{labelFor(OPPORTUNITY_STAGES, row.stage)}</Badge>,
                  },
                  { key: "market", label: "Market", render: (row) => row.market?.name || "—" },
                  { key: "createdAt", label: "Created", render: (row) => formatDate(row.createdAt) },
                ]}
              />
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <Card>
            <CardBody className="flex items-center gap-3">
              {buyer.owner ? <Avatar name={buyer.owner.name} src={buyer.owner.avatarUrl} size={32} /> : null}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Owner</p>
                <p className="text-sm">{buyer.owner?.name || "Unassigned"}</p>
              </div>
            </CardBody>
          </Card>
          {buyer.market ? (
            <Card>
              <CardHeader>Market</CardHeader>
              <CardBody>
                <Link href={`${ROUTES.exportMarkets}/${buyer.marketId}`} className="text-sm font-medium text-primary hover:underline">
                  {buyer.market.name}
                </Link>
                {buyer.market.countryCode ? <p className="mt-1 text-xs text-muted">{buyer.market.countryCode}</p> : null}
              </CardBody>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
