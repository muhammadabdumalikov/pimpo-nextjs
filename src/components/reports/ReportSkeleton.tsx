import { TableRow, TableCell } from "@/components/ui/table";

// Shared loading placeholders for report bodies — replace the old plain
// "Loading…" text so a report animates a shape of its incoming data instead.
const BAR = "block h-3.5 animate-pulse rounded bg-gray-100 dark:bg-gray-800/60";

/**
 * Skeleton rows for a report data table while it loads. Renders `rows`
 * placeholder rows of `columns` cells; the first cell is wider (label column),
 * the rest narrower (values), matching the usual report table shape.
 */
export function ReportTableSkeleton({
  columns,
  rows = 8,
}: {
  columns: number;
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r}>
          {Array.from({ length: columns }).map((_, c) => (
            <TableCell key={c} className="py-3.5 px-4 sm:px-6">
              <span className={`${BAR} ${c === 0 ? "w-32" : "w-16"}`} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/**
 * Generic block skeleton for non-table report bodies (heatmap, progress,
 * chart). A stack of pulsing bars that fills the content area.
 */
export function ReportBlockSkeleton({ lines = 6 }: { lines?: number }) {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: lines }).map((_, i) => (
        <span key={i} className={`${BAR} h-8 w-full`} />
      ))}
    </div>
  );
}
