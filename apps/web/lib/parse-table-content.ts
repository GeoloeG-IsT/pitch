export interface MetricPair {
  label: string;
  value: string;
  subLabel?: string;
}

export function parseTableContent(content: string): MetricPair[] | null {
  const lines = content.trim().split("\n");
  // Filter out separator lines (e.g., |---|---|) and empty lines
  const dataLines = lines.filter(
    (line) => line.includes("|") && !line.match(/^\|[\s-|]+\|$/)
  );

  if (dataLines.length < 2) return null; // Header + at least one data row

  const pairs: MetricPair[] = [];
  // Skip header row (index 0), parse data rows
  for (let i = 1; i < dataLines.length; i++) {
    const cells = dataLines[i]
      .split("|")
      .filter(Boolean)
      .map((c) => c.trim());
    if (cells.length >= 2) {
      pairs.push({
        label: cells[0],
        value: cells[1],
        subLabel: cells[2] || undefined,
      });
    }
  }
  return pairs.length > 0 ? pairs : null;
}
