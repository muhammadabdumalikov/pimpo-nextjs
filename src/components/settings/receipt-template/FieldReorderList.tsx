"use client";
import React, { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import type { ReceiptFieldConfig } from "@/lib/api";
import Toggle from "./Toggle";

interface FieldReorderListProps {
  /** Unique drag type so info-block and footer lists don't cross-drop. */
  dragType: string;
  items: ReceiptFieldConfig[];
  onChange: (items: ReceiptFieldConfig[]) => void;
  labelFor: (key: string) => string;
  /** Per-key value editing (footer links carry a handle/url). */
  hasValue?: (key: string) => boolean;
  placeholderFor?: (key: string) => string | undefined;
}

interface RowProps {
  dragType: string;
  index: number;
  item: ReceiptFieldConfig;
  label: string;
  showValue: boolean;
  placeholder?: string;
  onToggle: (enabled: boolean) => void;
  onValue: (value: string) => void;
  onMove: (from: number, to: number) => void;
}

function DragHandle() {
  return (
    <span className="cursor-grab text-gray-400 active:cursor-grabbing" aria-hidden>
      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
        <circle cx="7" cy="5" r="1.4" />
        <circle cx="7" cy="10" r="1.4" />
        <circle cx="7" cy="15" r="1.4" />
        <circle cx="13" cy="5" r="1.4" />
        <circle cx="13" cy="10" r="1.4" />
        <circle cx="13" cy="15" r="1.4" />
      </svg>
    </span>
  );
}

function Row({
  dragType,
  index,
  item,
  label,
  showValue,
  placeholder,
  onToggle,
  onValue,
  onMove,
}: RowProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: dragType,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop<{ index: number }>({
    accept: dragType,
    hover: (dragged, monitor) => {
      if (!ref.current) return;
      const dragIndex = dragged.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      // Only swap once the pointer crosses the hovered row's vertical midpoint.
      // Without this the rows swap the instant the pointer enters a neighbour,
      // which oscillates (flicker) and lands the item on the wrong position.
      const rect = ref.current.getBoundingClientRect();
      const middleY = (rect.bottom - rect.top) / 2;
      const offset = monitor.getClientOffset();
      if (!offset) return;
      const pointerY = offset.y - rect.top;
      if (dragIndex < hoverIndex && pointerY < middleY) return; // moving down
      if (dragIndex > hoverIndex && pointerY > middleY) return; // moving up

      onMove(dragIndex, hoverIndex);
      dragged.index = hoverIndex;
    },
  });

  // react-dnd's documented pattern: connect both drag source and drop target
  // to the same node via a stable ref object. A callback ref that changes each
  // render would re-connect on every re-render and drop the drag mid-gesture.
  // eslint-disable-next-line react-hooks/refs
  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`flex flex-col gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DragHandle />
          <span className="text-sm text-gray-700 dark:text-gray-200">{label}</span>
        </div>
        <Toggle checked={item.enabled} onChange={onToggle} />
      </div>
      {showValue && item.enabled ? (
        <input
          type="text"
          value={item.value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onValue(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-brand-400 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
        />
      ) : null}
    </div>
  );
}

export default function FieldReorderList({
  dragType,
  items,
  onChange,
  labelFor,
  hasValue,
  placeholderFor,
}: FieldReorderListProps) {
  const move = (from: number, to: number) => {
    const next = items.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const setAt = (index: number, patch: Partial<ReceiptFieldConfig>) => {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <Row
          key={item.key}
          dragType={dragType}
          index={index}
          item={item}
          label={labelFor(item.key)}
          showValue={hasValue?.(item.key) ?? false}
          placeholder={placeholderFor?.(item.key)}
          onToggle={(enabled) => setAt(index, { enabled })}
          onValue={(value) => setAt(index, { value })}
          onMove={move}
        />
      ))}
    </div>
  );
}
