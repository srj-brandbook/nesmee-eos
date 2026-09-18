"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { ROUTES } from "@/constants/routes";

export default function EditBuyerRedirectPage() {
  const { id } = useParams();
  const router = useRouter();
  useEffect(() => {
    if (id) router.replace(`${ROUTES.exportDistributors}/${id}/edit`);
  }, [id, router]);
  return <Spinner />;
}
