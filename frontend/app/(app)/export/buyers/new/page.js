"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { ROUTES } from "@/constants/routes";

export default function NewBuyerRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`${ROUTES.exportDistributors}/new`);
  }, [router]);
  return <Spinner />;
}
