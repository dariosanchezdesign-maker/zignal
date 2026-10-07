const DAY = 86400000;

/** Snapshots within `days` of the latest simulation. */
export function windowed<T extends { simulation: { run_date: string } }>(history: T[], days: number): T[] {
  const end = new Date(history[history.length - 1].simulation.run_date).getTime();
  return history.filter((h) => end - new Date(h.simulation.run_date).getTime() <= days * DAY);
}
