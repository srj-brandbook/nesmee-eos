"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const DropdownContext = createContext({ close: () => {} });

const placements = {
  "bottom-end": "right-0 top-full mt-2",
  "bottom-start": "left-0 top-full mt-2",
  "top-end": "right-0 bottom-full mb-2",
  "top-start": "left-0 bottom-full mb-2",
  "right-end": "left-full bottom-0 ml-2",
};

export function Dropdown({ trigger, children, placement = "bottom-end", menuClassName, onOpenChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  function setNext(next) {
    setOpen(next);
    onOpenChangeRef.current?.(next);
  }

  useEffect(() => {
    function onClick(event) {
      if (ref.current && !ref.current.contains(event.target)) setNext(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setNext(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <DropdownContext.Provider value={{ close: () => setNext(false) }}>
      <div className="relative" ref={ref}>
        <div onClick={() => setNext(!open)}>{trigger}</div>
        {open ? (
          <div
            className={cn(
              "absolute z-30 min-w-48 rounded-md border border-border bg-surface p-1 shadow-md",
              placements[placement],
              menuClassName
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownItem({ children, onClick, href, className, disabled }) {
  const { close } = useContext(DropdownContext);
  const classes = cn(
    "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800",
    disabled && "cursor-not-allowed opacity-50 hover:bg-transparent dark:hover:bg-transparent",
    className
  );

  function handleClick(event) {
    if (disabled) return;
    onClick?.(event);
    close();
  }

  if (href) {
    return (
      <Link href={href} className={classes} onClick={handleClick}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={handleClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
