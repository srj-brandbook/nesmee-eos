"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { billingService } from "@/services/billingService";
import { useToast } from "@/contexts/ToastProvider";
import { formatInr } from "@/constants/billing";
import { ROUTES } from "@/constants/routes";
import { ApiClientError } from "@/lib/api/apiClient";

export function CreateJobFromGapModal({ open, leadId, gap, onClose, onCreated }) {
  const toast = useToast();
  const router = useRouter();
  const [offerings, setOfferings] = useState([]);
  const [offeringId, setOfferingId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    billingService.listServices({ active: "true", limit: 100 }).then((response) => {
      const items = response.data.items || [];
      setOfferings(items);
      const match = items.find((item) => item.id === gap?.offering?.id || item.documentKey === gap?.documentKey);
      setOfferingId(match?.id || gap?.offering?.id || "");
    }).catch(() => {});
  }, [open, gap]);

  async function create() {
    const offering = offerings.find((item) => item.id === offeringId) || gap?.offering;
    if (!offering) {
      toast.error("Select a catalog service");
      return;
    }
    setLoading(true);
    try {
      const response = await billingService.createJob({
        leadId,
        source: gap?.status === "expired" ? "expiry" : "verification_gap",
        verificationCaseId: gap?.caseId || null,
        lines: [
          {
            offeringId: offering.id,
            documentKey: offering.documentKey || gap?.documentKey || "",
            description: offering.name,
            quantity: 1,
            unitPrice: offering.unitPrice,
            taxRateId: offering.taxRateId || null,
            hsnSac: offering.hsnSac || "",
            slaDays: offering.slaDays,
          },
        ],
      });
      toast.success("Service job created");
      onCreated?.(response.data.job);
      onClose();
      router.push(`${ROUTES.billingJobs}/${response.data.job.id}`);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not create job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} title="Sell as a service" onClose={onClose} className="max-w-lg">
      <p className="mb-4 text-sm text-muted">
        Create a billed job to obtain <span className="font-medium text-text">{gap?.label || "this certificate"}</span> for the supplier.
      </p>
      <Select label="Catalog service" value={offeringId} onChange={(event) => setOfferingId(event.target.value)}>
        <option value="">Select service</option>
        {offerings.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} · {formatInr(item.unitPrice)}
          </option>
        ))}
      </Select>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button loading={loading} onClick={create}>
          Create job
        </Button>
      </div>
    </Modal>
  );
}
