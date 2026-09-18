"use client";

import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { FileUpload } from "@/components/ui/FileUpload";

function asEvidence(value) {
  if (!value) {
    return { title: "", description: "", issuer: "", documentNumber: "", issuedAt: "", expiresAt: "", files: [] };
  }
  if (Array.isArray(value)) {
    return { title: "", description: "", issuer: "", documentNumber: "", issuedAt: "", expiresAt: "", files: value };
  }
  if (value.files || value.title || value.issuedAt || value.expiresAt || value.issuer) {
    return {
      title: value.title || "",
      description: value.description || "",
      issuer: value.issuer || "",
      documentNumber: value.documentNumber || "",
      issuedAt: (value.issuedAt || value.issuedDate || "").toString().slice(0, 10),
      expiresAt: (value.expiresAt || value.expiryDate || "").toString().slice(0, 10),
      files: Array.isArray(value.files) ? value.files : value.url ? [value] : [],
    };
  }
  return { title: "", description: "", issuer: "", documentNumber: "", issuedAt: "", expiresAt: "", files: value.url ? [value] : [] };
}

export function DocumentEvidenceInput({
  label,
  value,
  onChange,
  error,
  disabled,
  requiredMark,
  maxFiles = 3,
  accept,
  maxSizeMb = 15,
  collectIssuedDate = true,
  collectExpiryDate = true,
  collectIssuer = true,
  collectDocumentNumber = true,
  showUpload = true,
}) {
  const evidence = asEvidence(value);

  function patch(updates) {
    onChange({ ...evidence, ...updates });
  }

  return (
    <div className="space-y-3">
      {label ? (
        <p className="text-sm font-medium text-text">
          {label}
          {requiredMark ? (
            <span className="ml-0.5 font-semibold text-danger" aria-label="required">
              *
            </span>
          ) : null}
        </p>
      ) : null}
      <Input label="Title" value={evidence.title} disabled={disabled} onChange={(event) => patch({ title: event.target.value })} />
      <Textarea
        label="Description"
        value={evidence.description}
        disabled={disabled}
        onChange={(event) => patch({ description: event.target.value })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {collectDocumentNumber ? (
          <Input
            label="Document number"
            value={evidence.documentNumber}
            disabled={disabled}
            onChange={(event) => patch({ documentNumber: event.target.value })}
          />
        ) : null}
        {collectIssuer ? (
          <Input label="Issuer" value={evidence.issuer} disabled={disabled} onChange={(event) => patch({ issuer: event.target.value })} />
        ) : null}
        {collectIssuedDate ? (
          <Input
            type="date"
            label="Issued date"
            value={evidence.issuedAt}
            disabled={disabled}
            onChange={(event) => patch({ issuedAt: event.target.value })}
          />
        ) : null}
        {collectExpiryDate ? (
          <Input
            type="date"
            label="Expiry date"
            value={evidence.expiresAt}
            disabled={disabled}
            onChange={(event) => patch({ expiresAt: event.target.value })}
          />
        ) : null}
      </div>
      {showUpload ? (
        <FileUpload
          label="Files"
          folder="forms"
          resourceType="auto"
          accept={accept}
          maxSizeMb={maxSizeMb}
          maxFiles={maxFiles}
          value={evidence.files}
          onChange={(files) => patch({ files: Array.isArray(files) ? files : files ? [files] : [] })}
          disabled={disabled}
          error={error}
          destroyOnChange={false}
        />
      ) : error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : null}
    </div>
  );
}
