function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>())
  );

  const headerRow = headers.map(escapeCsvValue).join(",");
  const bodyRows = rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(","));
  return [headerRow, ...bodyRows].join("\r\n");
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  const csv = toCsv(rows);
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
