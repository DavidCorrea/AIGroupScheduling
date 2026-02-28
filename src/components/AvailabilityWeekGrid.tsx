"use client";

import { useCallback, useRef, useState } from "react";

const MIN_BLOCK_MINUTES = 15;
const SNAP_MINUTES = 15; // soft-lock: snap to 15-min like calendar apps
const TOTAL_MINUTES = 24 * 60; // 1440
const HEADER_HEIGHT = 40;

function parseHHMM(s: string): number {
  const [h, m] = (s ?? "00:00").trim().split(":").map((x) => parseInt(x, 10) || 0);
  return Math.min(TOTAL_MINUTES - 1, Math.max(0, h * 60 + m));
}

function minutesToHHMM(min: number): string {
  const m = Math.min(TOTAL_MINUTES, Math.max(0, Math.round(min)));
  const h = Math.floor(m / 60);
  const mi = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

/** Snap minutes to nearest SNAP_MINUTES (e.g. 15), clamped to [0, TOTAL_MINUTES]. */
function snapToStep(min: number): number {
  const step = SNAP_MINUTES;
  const rounded = Math.round(min / step) * step;
  return Math.min(TOTAL_MINUTES, Math.max(0, rounded));
}

export interface WeekdayOption {
  weekdayId: number;
  dayOfWeek: string;
}

export type AvailabilityBlock = { startLocal: string; endLocal: string };

export interface AvailabilityWeekGridProps {
  days: WeekdayOption[];
  /** key = weekdayId, value = array of blocks (multiple blocks per day allowed) */
  availability: Record<number, AvailabilityBlock[]>;
  onChange: (availability: Record<number, AvailabilityBlock[]>) => void;
  gridHeight?: number;
}

export default function AvailabilityWeekGrid({
  days,
  availability,
  onChange,
  gridHeight = 360,
}: AvailabilityWeekGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const mobileStripRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [dragState, setDragState] = useState<{
    weekdayId: number;
    blockIndex: number;
    mode: "resize-top" | "resize-bottom" | "resize-left" | "resize-right" | "move";
    startMinutes: number;
    endMinutes: number;
    startY: number;
    startX?: number;
    layout: "desktop" | "mobile";
  } | null>(null);

  const handleColumnClick = useCallback(
    (e: React.MouseEvent, weekdayId: number) => {
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;
      const bodyTop = rect.top + HEADER_HEIGHT;
      const bodyHeight = rect.height - HEADER_HEIGHT;
      const bodyY = e.clientY - bodyTop;
      const pointerMinutes = snapToStep(
        Math.max(0, Math.min(TOTAL_MINUTES, (bodyY / bodyHeight) * TOTAL_MINUTES))
      );

      const blocks = availability[weekdayId] ?? [];
      if (blocks.length === 0) {
        onChange({ ...availability, [weekdayId]: [{ startLocal: "00:00", endLocal: "23:59" }] });
        return;
      }
      const startMinutes = pointerMinutes;
      const endMinutes = Math.min(TOTAL_MINUTES, snapToStep(pointerMinutes + 60));
      const actualEnd = Math.max(endMinutes, startMinutes + MIN_BLOCK_MINUTES);
      const newBlock: AvailabilityBlock = {
        startLocal: minutesToHHMM(startMinutes),
        endLocal: minutesToHHMM(actualEnd),
      };
      onChange({
        ...availability,
        [weekdayId]: [...blocks, newBlock].sort(
          (a, b) => parseHHMM(a.startLocal) - parseHHMM(b.startLocal)
        ),
      });
    },
    [availability, onChange]
  );

  const handleRemoveBlock = useCallback(
    (e: React.MouseEvent, weekdayId: number, blockIndex: number) => {
      e.stopPropagation();
      const blocks = availability[weekdayId] ?? [];
      const next = blocks.filter((_, i) => i !== blockIndex);
      if (next.length === 0) {
        const nextAvail = { ...availability };
        delete nextAvail[weekdayId];
        onChange(nextAvail);
      } else {
        onChange({ ...availability, [weekdayId]: next });
      }
    },
    [availability, onChange]
  );

  const handleRemoveAllDay = useCallback(
    (e: React.MouseEvent, weekdayId: number) => {
      e.stopPropagation();
      const next = { ...availability };
      delete next[weekdayId];
      onChange(next);
    },
    [availability, onChange]
  );

  const handleMobileStripClick = useCallback(
    (e: React.MouseEvent, weekdayId: number) => {
      const strip = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const x = e.clientX - strip.left;
      const pointerMinutes = snapToStep(
        Math.max(0, Math.min(TOTAL_MINUTES, (x / strip.width) * TOTAL_MINUTES))
      );
      const blocks = availability[weekdayId] ?? [];
      if (blocks.length === 0) {
        onChange({ ...availability, [weekdayId]: [{ startLocal: "00:00", endLocal: "23:59" }] });
        return;
      }
      const startMinutes = pointerMinutes;
      const endMinutes = Math.min(TOTAL_MINUTES, snapToStep(pointerMinutes + 60));
      const actualEnd = Math.max(endMinutes, startMinutes + MIN_BLOCK_MINUTES);
      const newBlock: AvailabilityBlock = {
        startLocal: minutesToHHMM(startMinutes),
        endLocal: minutesToHHMM(actualEnd),
      };
      onChange({
        ...availability,
        [weekdayId]: [...blocks, newBlock].sort(
          (a, b) => parseHHMM(a.startLocal) - parseHHMM(b.startLocal)
        ),
      });
    },
    [availability, onChange]
  );

  const handlePointerDownBlockMobile = useCallback(
    (
      e: React.PointerEvent,
      weekdayId: number,
      blockIndex: number,
      edge: "left" | "right" | "center"
    ) => {
      e.stopPropagation();
      const blocks = availability[weekdayId] ?? [];
      const range = blocks[blockIndex];
      if (!range) return;
      const startMinutes = parseHHMM(range.startLocal);
      const endMinutes = parseHHMM(range.endLocal);
      const mode =
        edge === "left"
          ? "resize-left"
          : edge === "right"
            ? "resize-right"
            : "move";
      setDragState({
        weekdayId,
        blockIndex,
        mode,
        startMinutes,
        endMinutes,
        startY: 0,
        startX: e.clientX,
        layout: "mobile",
      });
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [availability]
  );

  const handlePointerDownBlock = useCallback(
    (e: React.PointerEvent, weekdayId: number, blockIndex: number, edge: "top" | "bottom" | "center") => {
      e.stopPropagation();
      const blocks = availability[weekdayId] ?? [];
      const range = blocks[blockIndex];
      if (!range) return;
      const startMinutes = parseHHMM(range.startLocal);
      const endMinutes = parseHHMM(range.endLocal);
      const mode =
        edge === "top" ? "resize-top" : edge === "bottom" ? "resize-bottom" : "move";
      setDragState({
        weekdayId,
        blockIndex,
        mode,
        startMinutes,
        endMinutes,
        startY: e.clientY,
        layout: "desktop",
      });
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [availability]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;
      const { weekdayId, blockIndex, mode, startMinutes, endMinutes, layout } = dragState;
      const blocks = [...(availability[weekdayId] ?? [])];

      let pointerMinutes: number;
      if (layout === "mobile") {
        const strip = mobileStripRefs.current[weekdayId];
        if (!strip) return;
        const rect = strip.getBoundingClientRect();
        const x = e.clientX - rect.left;
        pointerMinutes = Math.max(
          0,
          Math.min(TOTAL_MINUTES, (x / rect.width) * TOTAL_MINUTES)
        );
      } else {
        const rect = gridRef.current?.getBoundingClientRect();
        if (!rect) return;
        const bodyTop = rect.top + HEADER_HEIGHT;
        const bodyHeight = rect.height - HEADER_HEIGHT;
        const bodyY = e.clientY - bodyTop;
        pointerMinutes = Math.max(
          0,
          Math.min(TOTAL_MINUTES, (bodyY / bodyHeight) * TOTAL_MINUTES)
        );
      }

      let newStart = startMinutes;
      let newEnd = endMinutes;

      if (mode === "resize-top" || mode === "resize-left") {
        newStart = snapToStep(
          Math.min(endMinutes - MIN_BLOCK_MINUTES, Math.max(0, pointerMinutes))
        );
        newStart = Math.min(newStart, endMinutes - MIN_BLOCK_MINUTES);
      } else if (mode === "resize-bottom" || mode === "resize-right") {
        newEnd = snapToStep(
          Math.max(startMinutes + MIN_BLOCK_MINUTES, Math.min(TOTAL_MINUTES, pointerMinutes))
        );
        newEnd = Math.max(newEnd, startMinutes + MIN_BLOCK_MINUTES);
      } else {
        const duration = endMinutes - startMinutes;
        const newCenter = Math.max(
          duration / 2,
          Math.min(TOTAL_MINUTES - duration / 2, pointerMinutes)
        );
        newStart = snapToStep(newCenter - duration / 2);
        newEnd = newStart + duration;
        if (newEnd > TOTAL_MINUTES) {
          newEnd = TOTAL_MINUTES;
          newStart = TOTAL_MINUTES - duration;
        }
        if (newStart < 0) {
          newStart = 0;
          newEnd = duration;
        }
        newStart = snapToStep(newStart);
        newEnd = snapToStep(newEnd);
        if (newEnd - newStart < MIN_BLOCK_MINUTES) {
          newEnd = newStart + MIN_BLOCK_MINUTES;
        }
      }

      blocks[blockIndex] = {
        startLocal: minutesToHHMM(newStart),
        endLocal: minutesToHHMM(newEnd),
      };
      setDragState((prev) =>
        prev
          ? {
              ...prev,
              startMinutes: newStart,
              endMinutes: newEnd,
              startY: e.clientY,
              startX: e.clientX,
            }
          : null
      );
      onChange({ ...availability, [weekdayId]: blocks });
    },
    [dragState, availability, onChange]
  );

  const handlePointerUp = useCallback(() => {
    setDragState(null);
  }, []);

  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-muted-foreground mb-2">
        Haz clic en un día para agregar un bloque. Clic en espacio vacío del día agrega otro bloque. Arrastra para ajustar. Horarios en tu zona horaria local.
      </p>
      {/* Desktop: days as columns, time vertical */}
      <div
        ref={gridRef}
        className="hidden md:flex min-w-[320px] border border-border rounded-lg overflow-hidden bg-muted/20"
        style={{ height: gridHeight + HEADER_HEIGHT }}
        onPointerMove={dragState?.layout === "desktop" ? handlePointerMove : undefined}
        onPointerUp={dragState ? handlePointerUp : undefined}
        onPointerLeave={dragState ? handlePointerUp : undefined}
      >
        <div className="flex flex-col shrink-0 w-12 border-r border-border bg-muted/30">
          <div className="h-10 shrink-0 border-b border-border flex items-center justify-center text-xs text-muted-foreground font-medium">
            Hora
          </div>
          <div className="flex-1 relative py-0">
            {[0, 6, 12, 18, 24].map((hour) => (
              <div
                key={hour}
                className="absolute text-[10px] text-muted-foreground/70 -translate-y-1/2 z-10"
                style={{
                  top: `${(hour / 24) * 100}%`,
                  left: 4,
                }}
              >
                {hour === 24 ? "24" : `${String(hour).padStart(2, "0")}:00`}
              </div>
            ))}
            {/* Hour guides aligned with day columns */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
              {Array.from({ length: 25 }, (_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 border-b border-border/50"
                  style={{ top: `${(i / 24) * 100}%`, height: 0 }}
                />
              ))}
            </div>
          </div>
        </div>

        {days.map((d) => {
          const blocks = availability[d.weekdayId] ?? [];
          const hasBlocks = blocks.length > 0;

          return (
            <div
              key={d.weekdayId}
              className="flex-1 min-w-[5.5rem] flex flex-col border-r border-border last:border-r-0"
            >
              <div className="h-10 shrink-0 border-b border-border flex items-center justify-center gap-1 bg-background">
                <span className="text-xs font-medium truncate max-w-full px-0.5" title={d.dayOfWeek}>
                  {d.dayOfWeek.slice(0, 2)}
                </span>
                {hasBlocks && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveAllDay(e, d.weekdayId)}
                    className="rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label={`Quitar todo ${d.dayOfWeek}`}
                    title={`Quitar todo ${d.dayOfWeek}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div
                className="flex-1 relative cursor-pointer group"
                style={{ minHeight: gridHeight }}
                onClick={(e) => handleColumnClick(e, d.weekdayId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleColumnClick(e as unknown as React.MouseEvent, d.weekdayId);
                  }
                }}
                aria-label={
                  hasBlocks
                    ? `${d.dayOfWeek} ${blocks.length} bloque(s)`
                    : `Agregar disponibilidad ${d.dayOfWeek}`
                }
              >
                {/* Hour guides: subtle horizontal lines every hour */}
                <div className="absolute inset-0 pointer-events-none z-0" aria-hidden>
                  {Array.from({ length: 25 }, (_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-b border-border/50"
                      style={{ top: `${(i / 24) * 100}%`, height: 0 }}
                    />
                  ))}
                </div>
                {!hasBlocks && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground/60 group-hover:text-muted-foreground">
                      +
                    </span>
                  </div>
                )}
                {blocks.map((range, blockIndex) => {
                  const startMinutes = parseHHMM(range.startLocal);
                  const endMinutes = parseHHMM(range.endLocal);
                  const topPct = (startMinutes / TOTAL_MINUTES) * 100;
                  const heightPct = ((endMinutes - startMinutes) / TOTAL_MINUTES) * 100;
                  const canShowTime = heightPct > 8; // only show time if block is tall enough

                  return (
                    <div
                      key={`${blockIndex}-${range.startLocal}-${range.endLocal}`}
                      className="group/block absolute left-0.5 right-0.5 rounded bg-primary/80 hover:bg-primary transition-colors flex flex-col cursor-grab active:cursor-grabbing z-10"
                      style={{
                        top: `${topPct}%`,
                        height: `${heightPct}%`,
                        minHeight: 4,
                      }}
                      onPointerDown={(ev) => handlePointerDownBlock(ev, d.weekdayId, blockIndex, "center")}
                    >
                      <div
                        className="h-2 shrink-0 cursor-n-resize border-b border-primary flex-shrink-0 flex items-center justify-end pr-0.5"
                        aria-hidden
                        onPointerDown={(ev) => {
                          ev.stopPropagation();
                          handlePointerDownBlock(ev, d.weekdayId, blockIndex, "top");
                        }}
                      >
                        <button
                          type="button"
                          onClick={(ev) => handleRemoveBlock(ev, d.weekdayId, blockIndex)}
                          className="rounded p-0.5 text-primary-foreground/80 hover:bg-primary-foreground/20 opacity-0 group-hover/block:opacity-100 focus:opacity-100 transition-opacity"
                          aria-label={`Quitar bloque ${range.startLocal}–${range.endLocal}`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex-1 min-h-0 flex items-center justify-center px-0.5 overflow-hidden">
                        {canShowTime && (
                          <span className="text-[10px] font-medium text-primary-foreground truncate text-center">
                            {range.startLocal}–{range.endLocal}
                          </span>
                        )}
                      </div>
                      <div
                        className="h-2 shrink-0 cursor-s-resize border-t border-primary flex-shrink-0"
                        aria-hidden
                        onPointerDown={(ev) => {
                          ev.stopPropagation();
                          handlePointerDownBlock(ev, d.weekdayId, blockIndex, "bottom");
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: days as rows, time horizontal */}
      <div
        className="md:hidden border border-border rounded-lg overflow-hidden bg-muted/20 space-y-2 p-2"
        onPointerMove={dragState?.layout === "mobile" ? handlePointerMove : undefined}
        onPointerUp={dragState ? handlePointerUp : undefined}
        onPointerLeave={dragState ? handlePointerUp : undefined}
      >
        {days.map((d) => {
          const blocks = availability[d.weekdayId] ?? [];
          const hasBlocks = blocks.length > 0;
          return (
            <div
              key={d.weekdayId}
              className="flex flex-col gap-1 rounded-md bg-background border border-border overflow-hidden"
            >
              <div className="flex items-center justify-between px-2 py-1.5 shrink-0">
                <span className="text-sm font-medium">{d.dayOfWeek}</span>
                {hasBlocks && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveAllDay(e, d.weekdayId)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    aria-label={`Quitar todo ${d.dayOfWeek}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div
                ref={(el) => {
                  mobileStripRefs.current[d.weekdayId] = el;
                }}
                data-weekday-id={d.weekdayId}
                className="relative cursor-pointer group h-12 mx-2 mb-2 rounded border border-border bg-muted/30"
                onClick={(e) => handleMobileStripClick(e, d.weekdayId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleMobileStripClick(e as unknown as React.MouseEvent, d.weekdayId);
                  }
                }}
                aria-label={
                  hasBlocks
                    ? `${d.dayOfWeek} ${blocks.length} bloque(s)`
                    : `Agregar disponibilidad ${d.dayOfWeek}`
                }
              >
                {/* Hour guides: vertical lines every 2 hours */}
                <div className="absolute inset-0 pointer-events-none flex" aria-hidden>
                  {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24].map((hour) => (
                    <div
                      key={hour}
                      className="flex-1 border-r border-border/50 last:border-r-0"
                      style={{ width: `${100 / 12}%` }}
                    />
                  ))}
                </div>
                {!hasBlocks && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground/60 group-hover:text-muted-foreground">+</span>
                  </div>
                )}
                {blocks.map((range, blockIndex) => {
                  const startMinutes = parseHHMM(range.startLocal);
                  const endMinutes = parseHHMM(range.endLocal);
                  const leftPct = (startMinutes / TOTAL_MINUTES) * 100;
                  const widthPct = ((endMinutes - startMinutes) / TOTAL_MINUTES) * 100;
                  const canShowTime = widthPct > 12;
                  return (
                    <div
                      key={`${blockIndex}-${range.startLocal}-${range.endLocal}`}
                      className="group/block absolute top-0.5 bottom-0.5 rounded bg-primary/80 hover:bg-primary flex items-center cursor-grab active:cursor-grabbing z-10 min-w-[4px]"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                      }}
                      onPointerDown={(ev) =>
                        handlePointerDownBlockMobile(ev, d.weekdayId, blockIndex, "center")
                      }
                    >
                      <div
                        className="w-2 shrink-0 cursor-w-resize border-r border-primary self-stretch"
                        aria-hidden
                        onPointerDown={(ev) => {
                          ev.stopPropagation();
                          handlePointerDownBlockMobile(ev, d.weekdayId, blockIndex, "left");
                        }}
                      />
                      <div className="flex-1 min-w-0 flex items-center justify-center px-0.5 overflow-hidden">
                        {canShowTime && (
                          <span className="text-[10px] font-medium text-primary-foreground truncate">
                            {range.startLocal}–{range.endLocal}
                          </span>
                        )}
                      </div>
                      <div
                        className="w-2 shrink-0 cursor-e-resize border-l border-primary self-stretch"
                        aria-hidden
                        onPointerDown={(ev) => {
                          ev.stopPropagation();
                          handlePointerDownBlockMobile(ev, d.weekdayId, blockIndex, "right");
                        }}
                      />
                      <button
                        type="button"
                        onClick={(ev) => handleRemoveBlock(ev, d.weekdayId, blockIndex)}
                        className="absolute top-0 right-0 rounded p-0.5 text-primary-foreground/80 hover:bg-primary-foreground/20 opacity-0 group-hover/block:opacity-100 focus:opacity-100 transition-opacity"
                        aria-label={`Quitar bloque ${range.startLocal}–${range.endLocal}`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
