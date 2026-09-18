"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Route } from "lucide-react";
import { exportService } from "@/services/exportService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chart } from "@/components/ui/Chart";
import { Badge } from "@/components/ui/Badge";
import { PERMISSIONS } from "@/constants/permissions";
import { formatDateTime } from "@/lib/utils";
import { labelFor, MARKET_STATUSES, OPPORTUNITY_STAGES } from "@/constants/export";

function Stat({ label, value, hint }) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-2 font-display text-3xl">{value ?? "—"}</p>
        {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      </CardBody>
    </Card>
  );
}

export function ExportDashboard() {
  const { can } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);

  useEffect(() => {
    exportService.dashboard()
      .then((response) => setData(response.data))
      .catch(() => toast.error("Unable to load export dashboard"));
  }, [toast]);

  const chartData = Object.entries(data?.marketStatus || {}).map(([name, value]) => ({
    name: labelFor(MARKET_STATUSES, name),
    value,
  }));
  const opportunityChart = (data?.opportunityStages || []).map((row) => ({
    name: labelFor(OPPORTUNITY_STAGES, row.stage),
    value: row.count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Export control center</h1>
          <p className="text-sm text-muted">Markets, corridors, margin and risk in one place.</p>
        </div>
        <div className="flex gap-2">
          {can(PERMISSIONS.EXPORT_MARKETS_CREATE) ? (
            <Link href="/export/markets/new">
              <Button>
                <Plus className="h-4 w-4" />
                New market
              </Button>
            </Link>
          ) : null}
          {can(PERMISSIONS.EXPORT_CORRIDORS_CREATE) ? (
            <Link href="/export/corridors/new">
              <Button variant="outline">
                <Route className="h-4 w-4" />
                New corridor
              </Button>
            </Link>
          ) : null}
          {can(PERMISSIONS.EXPORT_CALCULATOR_VIEW) ? (
            <Link href="/export/calculator">
              <Button variant="outline">Calculator</Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Active markets" value={data?.activeMarkets} hint={`${data?.underEvaluation || 0} under evaluation`} />
        <Stat label="Active corridors" value={data?.activeCorridors} hint={`${data?.averageTransitTime || 0} day avg transit`} />
        <Stat label="Active distributors" value={data?.activeBuyers} hint={`${data?.newOpportunities || 0} new opportunities`} />
        <Stat
          label={can(PERMISSIONS.EXPORT_FINANCE_VIEW) ? "Expected revenue" : "Pipeline"}
          value={can(PERMISSIONS.EXPORT_FINANCE_VIEW) ? data?.expectedRevenue : data?.newOpportunities}
          hint={can(PERMISSIONS.EXPORT_FINANCE_VIEW) ? `${data?.averageMargin || 0}% avg expected margin` : "Open opportunities"}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="High-risk markets" value={data?.highRiskMarkets} />
        <Stat label="High-risk corridors" value={data?.highRiskCorridors} />
        <Stat label="Pending compliance" value={data?.pendingCompliance} />
        <Stat label="Expiring requirements" value={data?.expiringRequirements} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>Markets by status</CardHeader>
          <CardBody>{chartData.length ? <Chart data={chartData} /> : <p className="text-sm text-muted">No market data yet.</p>}</CardBody>
        </Card>
        <Card>
          <CardHeader>Opportunity pipeline</CardHeader>
          <CardBody>
            {opportunityChart.length ? <Chart data={opportunityChart} /> : <p className="text-sm text-muted">No opportunities yet.</p>}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span>Recent alerts</span>
          <Link href="/export/alerts" className="text-sm text-primary">
            View all
          </Link>
        </CardHeader>
        <CardBody className="space-y-3">
          {(data?.alerts || []).length === 0 ? (
            <p className="text-sm text-muted">No alerts.</p>
          ) : (
            data.alerts.map((alert) => (
              <div key={alert.id} className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs text-muted">{alert.body}</p>
                </div>
                <Badge variant={alert.severity === "critical" ? "danger" : "warning"}>{formatDateTime(alert.createdAt)}</Badge>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
