"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { authService } from "@/services/authService";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await authService.forgotPassword(email);
      setMessage(response.message);
    } catch {
      setMessage("If an account exists, a reset email was sent");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
      <h1 className="font-display text-2xl font-semibold">Reset password</h1>
      {message ? <Alert variant="success">{message}</Alert> : null}
      <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Button type="submit" className="w-full" loading={loading}>
        Send reset link
      </Button>
      <Link href="/login" className="block text-sm text-primary">
        Back to login
      </Link>
    </form>
  );
}
