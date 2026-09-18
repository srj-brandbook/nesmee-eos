"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { ROUTES } from "@/constants/routes";

export default function BuyersRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(ROUTES.exportDistributors);
  }, [router]);
  return <Spinner />;
}
