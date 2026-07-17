"use client";
import React, { useEffect, useRef } from "react";

interface RichTextNoteProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

type Cmd = { cmd: string; label: string; title: string };

// document.execCommand is deprecated but universally supported and adequate for
// a small receipt note; no heavy editor dependency is pulled in for this.
const COMMANDS: Cmd[] = [
  { cmd: "bold", label: "B", title: "Жирный" },
  { cmd: "italic", label: "I", title: "Курсив" },
  { cmd: "underline", label: "U", title: "Подчёркнутый" },
  { cmd: "strikeThrough", label: "S", title: "Зачёркнутый" },
  { cmd: "justifyLeft", label: "⯇", title: "По левому краю" },
  { cmd: "justifyCenter", label: "≡", title: "По центру" },
  { cmd: "justifyRight", label: "⯈", title: "По правому краю" },
  { cmd: "insertUnorderedList", label: "•", title: "Список" },
];

export default function RichTextNote({
  value,
  onChange,
  placeholder,
}: RichTextNoteProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Seed the editable div's HTML once (and when an external value replaces it,
  // e.g. switching templates) without clobbering the caret on every keystroke.
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== value) el.innerHTML = value || "";
  }, [value]);

  const exec = (cmd: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  return (
    <div className="rounded-lg border border-gray-300 dark:border-gray-600">
      <div className="flex flex-wrap gap-1 border-b border-gray-200 p-1.5 dark:border-gray-700">
        {COMMANDS.map((c) => (
          <button
            key={c.cmd}
            type="button"
            title={c.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(c.cmd)}
            className="h-7 w-7 rounded text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {c.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        className="min-h-[80px] px-3 py-2 text-sm text-gray-700 focus:outline-none dark:text-gray-200 [&:empty:before]:text-gray-400 [&:empty:before]:content-[attr(data-placeholder)]"
      />
    </div>
  );
}
