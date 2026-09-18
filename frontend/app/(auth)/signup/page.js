"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { authService } from "@/services/authService";
import { ApiClientError } from "@/lib/api/apiClient";

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [fields, setFields] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFields({});
    try {
      const response = await authService.signup(form);
      setSuccess(response.message);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        setFields(err.fields);
      } else {
        setError("Unable to create account");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-muted">We’ll send a verification link.</p>
      </div>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}
      <Input label="Name" value={form.name} error={fields.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      <Input label="Email" type="email" value={form.email} error={fields.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
      <Input label="Password" type="password" hint="At least 8 characters with a letter and number" value={form.password} error={fields.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
      <Button type="submit" className="w-full" loading={loading}>
        Sign up
      </Button>
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-primary">
          Log in
        </Link>
      </p>
    </form>
  );
}
