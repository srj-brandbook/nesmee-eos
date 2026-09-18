"use client";

import { Button } from "./Button";
import { Modal } from "./Modal";

export function ConfirmationDialog({ open, title, description, confirmLabel = "Confirm", onConfirm, onClose, loading }) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-sm text-muted">{description}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
