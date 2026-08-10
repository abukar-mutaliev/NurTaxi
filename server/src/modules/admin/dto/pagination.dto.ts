import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginatedResponseMeta {
  @ApiPropertyOptional({ description: 'Курсор для следующей страницы' })
  nextCursor!: string | null;

  @ApiProperty()
  hasMore!: boolean;
}

export function encodeCursor(createdAt: Date, id: string): string {
  return `${createdAt.toISOString()}|${id}`;
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  const sep = cursor.indexOf('|');
  if (sep <= 0) return null;
  const createdAt = new Date(cursor.slice(0, sep));
  const id = cursor.slice(sep + 1);
  if (Number.isNaN(createdAt.getTime()) || !id) return null;
  return { createdAt, id };
}
