export interface WorkScheduleDay {
  from: string;
  to: string;
}

/** График работы водителя по дням недели (Req §8.4). */
export type WorkSchedule = Partial<
  Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', WorkScheduleDay | null>
>;
