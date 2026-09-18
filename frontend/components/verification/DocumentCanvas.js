"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, FileText, Maximize2, Minus, Minimize2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { isImageFile, isPdfFile, preloadUrl, previewCandidates, previewUrl, probeImage } from "@/lib/cloudinaryMedia";

export { isImageFile, isPdfFile };

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundZoom(value) {
  return Math.round(value * 100) / 100;
}

function sourceWidthForZoom(zoom) {
  if (zoom >= 2.5) return 2800;
  if (zoom >= 1.5) return 2000;
  return 1600;
}

function ToolbarButton({ label, disabled, onClick, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function ZoomableImage({ src, alt, zoom, resetKey, page, failed, onZoomChange, onLoadState }) {
  const viewportRef = useRef(null);
  const imgRef = useRef(null);
  const dragRef = useRef(null);
  const [aspect, setAspect] = useState(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setAspect(null);
  }, [resetKey]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return undefined;
    const update = () => setViewport({ width: node.clientWidth, height: node.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return undefined;
    function onWheel(event) {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      const direction = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      onZoomChange((current) => roundZoom(clamp(current + direction, MIN_ZOOM, MAX_ZOOM)));
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [onZoomChange]);

  function applyNatural(width, height) {
    if (!width || !height) return;
    setAspect((current) => current || width / height);
    onLoadState?.(true);
  }

  useEffect(() => {
    const image = imgRef.current;
    if (image?.complete && image.naturalWidth) {
      applyNatural(image.naturalWidth, image.naturalHeight);
    }
  }, [src]);

  const padded = { width: Math.max(0, viewport.width - 32), height: Math.max(0, viewport.height - 32) };
  const fitted = useMemo(() => {
    if (!aspect || !padded.width || !padded.height) return null;
    if (padded.width / padded.height > aspect) {
      const height = padded.height;
      return { width: height * aspect, height };
    }
    const width = padded.width;
    return { width, height: width / aspect };
  }, [aspect, padded.width, padded.height]);

  const displayWidth = fitted ? Math.max(160, fitted.width * zoom) : undefined;
  const displayHeight = fitted ? Math.max(160, fitted.height * zoom) : undefined;
  const canPan = zoom > 1;

  function onPointerDown(event) {
    if (!canPan || event.button !== 0) return;
    const node = viewportRef.current;
    if (!node) return;
    node.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, left: node.scrollLeft, top: node.scrollTop };
  }

  function onPointerMove(event) {
    const drag = dragRef.current;
    const node = viewportRef.current;
    if (!drag || !node) return;
    node.scrollLeft = drag.left - (event.clientX - drag.x);
    node.scrollTop = drag.top - (event.clientY - drag.y);
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  return (
    <div
      ref={viewportRef}
      className={cn("min-h-0 min-w-0 flex-1 overflow-auto", canPan ? "cursor-grab active:cursor-grabbing" : "cursor-default")}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => onZoomChange((current) => (current > 1 ? 1 : 1.75))}
    >
      <div
        className="flex min-h-full min-w-full items-center justify-center p-4"
        style={displayWidth && displayHeight ? { minWidth: displayWidth + 32, minHeight: displayHeight + 32 } : undefined}
      >
        {failed ? (
          <div className="max-w-sm text-center text-sm text-slate-300">
            <FileText className="mx-auto mb-2 h-10 w-10" />
            <p>This PDF cannot be previewed as an image.</p>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            key={`${resetKey}-${page || 1}-${src}`}
            src={src}
            alt={alt}
            draggable={false}
            decoding="async"
            className="select-none rounded-sm bg-white shadow-2xl"
            style={
              displayWidth
                ? { width: displayWidth, height: displayHeight, maxWidth: "none" }
                : { maxWidth: "min(100%, 900px)", maxHeight: "100%", width: "auto", height: "auto" }
            }
            onLoad={(event) => applyNatural(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
            onError={() => onLoadState?.(false)}
          />
        )}
      </div>
    </div>
  );
}

function DocumentViewer({ file, label, className, onFullscreen, fullscreen }) {
  const knownPages = Number(file.pages) > 0 ? Number(file.pages) : null;
  const paged = isPdfFile(file);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(knownPages);
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState("loading");
  const [srcIndex, setSrcIndex] = useState(0);

  useEffect(() => {
    setPage(1);
    setLimit(Number(file.pages) > 0 ? Number(file.pages) : null);
    setZoom(1);
    setStatus("loading");
    setSrcIndex(0);
  }, [file.url, file.publicId, file.pages]);

  const width = sourceWidthForZoom(zoom);
  const candidates = useMemo(() => previewCandidates(file, page, { width }), [file, page, width]);
  const src = candidates[srcIndex] || previewUrl(file, page, { width });
  const atStart = page <= 1;
  const atEnd = limit != null && page >= limit;

  useEffect(() => {
    setSrcIndex(0);
  }, [file.url, file.publicId, page, width]);

  useEffect(() => {
    if (!paged || Number(file.pages) > 0) return undefined;
    let active = true;
    probeImage(previewUrl(file, 2, { width: 320 })).then((exists) => {
      if (!active) return;
      setLimit((current) => current ?? (exists ? null : 1));
    });
    return () => {
      active = false;
    };
  }, [file, paged]);

  useEffect(() => {
    if (!paged) return undefined;
    if (limit != null && page + 1 > limit) return undefined;
    preloadUrl(previewUrl(file, page + 1, { width }));
    if (page > 1) preloadUrl(previewUrl(file, page - 1, { width }));
    return undefined;
  }, [file, paged, page, limit, width]);

  const goPage = useCallback(
    (next) => {
      const target = Math.max(1, next);
      if (limit != null && target > limit) return;
      setStatus("loading");
      setPage(target);
    },
    [limit]
  );

  useEffect(() => {
    function onKey(event) {
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || event.target?.isContentEditable) return;
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setZoom((current) => roundZoom(clamp(current + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM)));
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        setZoom((current) => roundZoom(clamp(current - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM)));
      } else if (event.key === "0") {
        event.preventDefault();
        setZoom(1);
      } else if (paged && event.key === "ArrowRight") {
        event.preventDefault();
        goPage(page + 1);
      } else if (paged && event.key === "ArrowLeft") {
        event.preventDefault();
        goPage(page - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPage, page, paged]);

  return (
    <div className={cn("relative flex h-full min-h-0 flex-col bg-[#111827]", className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center p-3">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/80 px-1.5 py-1 text-xs text-slate-100 shadow-lg backdrop-blur">
          <ToolbarButton label="Zoom out" disabled={zoom <= MIN_ZOOM} onClick={() => setZoom((current) => roundZoom(clamp(current - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM)))}>
            <Minus className="h-3.5 w-3.5" />
          </ToolbarButton>
          <button type="button" className="min-w-12 px-1 text-center font-medium tabular-nums" onClick={() => setZoom(1)}>
            {Math.round(zoom * 100)}%
          </button>
          <ToolbarButton label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={() => setZoom((current) => roundZoom(clamp(current + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM)))}>
            <Plus className="h-3.5 w-3.5" />
          </ToolbarButton>
          <span className="mx-1 h-4 w-px bg-white/15" />
          <ToolbarButton label="Fit to screen" onClick={() => setZoom(1)}>
            <Maximize2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          {onFullscreen ? (
            <>
              <span className="mx-1 h-4 w-px bg-white/15" />
              <ToolbarButton label={fullscreen ? "Exit full screen" : "Full screen"} onClick={onFullscreen}>
                {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
              </ToolbarButton>
            </>
          ) : null}
          {paged ? (
            <>
              <span className="mx-1 h-4 w-px bg-white/15" />
              <ToolbarButton label="Previous page" disabled={atStart} onClick={() => goPage(page - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </ToolbarButton>
              <span className="min-w-16 px-1 text-center tabular-nums">
                {page}
                {limit ? ` / ${limit}` : ""}
              </span>
              <ToolbarButton label="Next page" disabled={atEnd} onClick={() => goPage(page + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </ToolbarButton>
            </>
          ) : null}
        </div>
      </div>

      {status === "loading" ? (
        <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
        </div>
      ) : null}

      <ZoomableImage
        src={src}
        resetKey={file.publicId || file.url}
        page={page}
        alt={`${file.name || label || "Document"}${paged ? ` page ${page}` : ""}`}
        zoom={zoom}
        failed={status === "error"}
        onZoomChange={setZoom}
        onLoadState={(ok) => {
          if (ok) {
            setStatus("ready");
            return;
          }
          if (srcIndex + 1 < candidates.length) {
            setSrcIndex((current) => current + 1);
            return;
          }
          if (paged && page > 1) {
            setLimit(page - 1);
            setPage(page - 1);
            return;
          }
          setStatus("error");
        }}
      />
    </div>
  );
}

export const DocumentCanvas = memo(function DocumentCanvas({ file, label, className, onFullscreen, fullscreen = false }) {
  if (!file?.url && !file?.publicId) {
    return (
      <div className={cn("flex h-full flex-col items-center justify-center gap-2 bg-[#111827] text-sm text-slate-400", className)}>
        <FileText className="h-10 w-10" />
        <p>Upload a file to preview it here</p>
      </div>
    );
  }

  if (isPdfFile(file) || isImageFile(file)) {
    return <DocumentViewer file={file} label={label} className={className} onFullscreen={onFullscreen} fullscreen={fullscreen} />;
  }

  return (
    <div className={cn("relative flex h-full flex-col items-center justify-center gap-3 bg-[#111827] text-sm text-slate-300", className)}>
      <FileText className="h-10 w-10" />
      <p>{file.name || "Uploaded file"}</p>
    </div>
  );
});
