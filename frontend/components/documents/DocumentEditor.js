"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/Spinner";

export const DocumentEditor = dynamic(() => import("./DocumentEditorCanvas").then((mod) => mod.DocumentEditorCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[28rem] items-center justify-center">
      <Spinner label="Loading editor" />
    </div>
  ),
});
