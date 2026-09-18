import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

export default function ForbiddenPage() {
  return (
    <Card>
      <CardBody className="space-y-3">
        <h1 className="font-display text-2xl font-semibold">Access denied</h1>
        <p className="text-sm text-muted">You do not have permission to view this page.</p>
        <Link href="/dashboard">
          <Button>Back to dashboard</Button>
        </Link>
      </CardBody>
    </Card>
  );
}
