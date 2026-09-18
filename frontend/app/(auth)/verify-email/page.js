"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { authService } from "@/services/authService";
import { useAuth } from "@/contexts/AuthProvider";

function Verify() {
  const token = useSearchParams().get("token") || "";
  const router = useRouter();
  const { refresh } = useAuth();
  const [state, setState] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function run() {
      if (!token) {
        setState("error");
        setMessage("Missing verification token");
        return;
      }
      try {
        await authService.verifyEmail(token);
        await refresh();
        setState("success");
        setTimeout(() => router.push("/dashboard"), 800);
      } catch (error) {
        setState("error");
        setMessage(error.message || "Verification failed");
      }
    }
    run();
  }, [refresh, router, token]);

  return (
    <div className="w-full max-w-sm space-y-4">
      <h1 className="font-display text-2xl font-semibold">Email verification</h1>
      {state === "loading" ? <Spinner label="Verifying…" /> : null}
      {state === "success" ? <Alert variant="success">Email verified. Redirecting…</Alert> : null}
      {state === "error" ? <Alert variant="danger">{message}</Alert> : null}
      <Link href="/login">
        <Button variant="outline">Go to login</Button>
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <Verify />
    </Suspense>
  );
}
