"use client";

import { useState } from "react";

export function Accordion({ items }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-surface">
      {items.map((item, index) => (
        <div key={item.q}>
          <button
            type="button"
            className="flex w-full items-center justify-between px-5 py-4 text-left font-medium"
            onClick={() => setOpen(index === open ? -1 : index)}
          >
            {item.q}
            <span>{open === index ? "–" : "+"}</span>
          </button>
          {open === index ? <p className="px-5 pb-4 text-sm text-muted">{item.a}</p> : null}
        </div>
      ))}
    </div>
  );
}
