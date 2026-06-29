import { useRef } from "react";

// Divisória arrastável para redimensionar painéis (vertical = largura,
// horizontal = altura). Usa Pointer Events com captura para um arrasto suave.
export function ResizeHandle({
  orientation,
  onDrag,
}: {
  orientation: "vertical" | "horizontal";
  onDrag: (clientX: number, clientY: number) => void;
}) {
  const active = useRef(false);
  const base =
    orientation === "vertical"
      ? "w-1.5 cursor-col-resize"
      : "h-1.5 cursor-row-resize";
  return (
    <div
      role="separator"
      aria-orientation={orientation === "vertical" ? "vertical" : "horizontal"}
      onPointerDown={(e) => {
        active.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
      }}
      onPointerMove={(e) => {
        if (active.current) onDrag(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        active.current = false;
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      }}
      className={`${base} shrink-0 bg-pl-toolbar-dark transition-colors hover:bg-pl-transport`}
    />
  );
}
