// A lesson already closed belongs to history even when completed early.
// An ongoing lesson remains active even after its scheduled start time.
export function studentLessonFilters(now: string) {
  return {
    upcoming: `status.eq.in_progress,and(status.eq.scheduled,start_datetime.gte.${now})`,
    history: `start_datetime.lt.${now},status.in.(completed,late,missed,canceled)`,
  }
}
