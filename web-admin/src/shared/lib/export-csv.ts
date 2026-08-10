/** Экспорт массива объектов в CSV и скачивание файла. */
export function downloadCsv(
  rows: Record<string, string | number | null>[],
  filename: string,
): void {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]!);
  const escape = (value: string | number | null): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h] ?? null)).join(',')),
  ];

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
