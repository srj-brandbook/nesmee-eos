"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { authService } from "@/services/authService";
import { ApiClientError } from "@/lib/api/apiClient";

function ResetForm() {
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await authService.resetPassword({ token, password });
      setSuccess(response.message);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
      <h1 className="font-display text-2xl font-semibold">Choose a new password</h1>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}
      <Input label="New password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      <Button type="submit" className="w-full" loading={loading} disabled={!token}>
        Update password
      </Button>
      <Link href="/login" className="block text-sm text-primary">
        Back to login
      </Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
