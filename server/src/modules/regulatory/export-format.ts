import { createHash } from 'node:crypto';

export const EXPORT_CSV_SEPARATOR = ';';
export const EXPORT_CSV_ENCODING = 'utf-8';

export type ExportRow = Record<string, unknown>;

export interface ExportMeta {
  periodFrom: string;
  periodTo: string;
  dateField: string;
  requestRef: string;
}

export function serializeExportFile(
  rows: ExportRow[],
  format: 'csv' | 'json',
  meta: ExportMeta,
): { body: Buffer; rowCount: number; checksum: string } {
  let text: string;
  if (format === 'json') {
    text = JSON.stringify(
      { meta: { encoding: EXPORT_CSV_ENCODING, ...meta }, items: rows },
      null,
      2,
    );
  } else {
    const headers = rows[0] ? Object.keys(rows[0]) : ['publicNumber'];
    const escape = (value: unknown) => {
      const str = value == null ? '' : String(value);
      if (/[";\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
      return str;
    };
    const lines = [
      headers.join(EXPORT_CSV_SEPARATOR),
      ...rows.map((row) => headers.map((h) => escape(row[h])).join(EXPORT_CSV_SEPARATOR)),
    ];
    text = `\uFEFF${lines.join('\n')}`;
  }
  const body = Buffer.from(text, 'utf8');
  const checksum = createHash('sha256').update(body).digest('hex');
  return { body, rowCount: rows.length, checksum };
}
