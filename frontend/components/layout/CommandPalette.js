"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { navItems, settingsNav } from "@/config/nav";
import { useAuth } from "@/contexts/AuthProvider";
import { navIcons } from "./navIcons";

function isTypingTarget(el) {
  if (!el || typeof el.closest !== "function") return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(el.isContentEditable);
}

function useIsMac() {
  const [mac, setMac] = useState(false);
  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform) || navigator.userAgent.includes("Mac"));
  }, []);
  return mac;
}

export function CommandPalette({ open, onOpen, onClose }) {
  const router = useRouter();
  const { can } = useAuth();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const isMac = useIsMac();

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    function matches(item) {
      if (!can(item.permission)) return false;
      if (!q) return true;
      return item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q);
    }
    const pages = navItems.filter(matches);
    const settings = settingsNav.filter(matches);
    return [
      pages.length ? { label: "Pages", items: pages } : null,
      settings.length ? { label: "Settings", items: settings } : null,
    ].filter(Boolean);
  }, [can, query]);

  const flat = groups.flatMap((group) => group.items);

  useEffect(() => {
    function onKey(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) onClose();
        else onOpen();
        return;
      }
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget(event.target)) {
        event.preventDefault();
        onOpen();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, onOpen]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, onClose]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  function go(href) {
    onClose();
    router.push(href);
  }

  function onKeyDown(event) {
    if (!flat.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => (value + 1) % flat.length);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => (value - 1 + flat.length) % flat.length);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const item = flat[active];
      if (item) go(item.href);
    }
  }

  let index = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <button type="button" className="absolute inset-0 bg-slate-950/40" onClick={onClose} aria-label="Close search" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search or jump to…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted"
            aria-autocomplete="list"
            aria-controls="command-results"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted sm:inline">Esc</kbd>
        </div>
        <div id="command-results" role="listbox" className="max-h-80 overflow-y-auto p-1">
          {flat.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">No matching pages</p>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="py-1">
                <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{group.label}</p>
                {group.items.map((item) => {
                  index += 1;
                  const itemIndex = index;
                  const Icon = navIcons[item.icon];
                  const selected = itemIndex === active;
                  return (
                    <button
                      key={`${group.label}-${item.href}`}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                        selected ? "bg-primary/10 text-primary" : "text-text hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                      onMouseEnter={() => setActive(itemIndex)}
                      onClick={() => go(item.href)}
                    >
                      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                      <span className="flex-1 truncate">{item.label}</span>
                      <span className="truncate text-xs text-muted">{item.href}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] text-muted">
          <span>Navigate with ↑↓, open with Enter</span>
          <span>{isMac ? "⌘K" : "Ctrl+K"}</span>
        </div>
      </div>
    </div>
  );
}

export { useIsMac };
