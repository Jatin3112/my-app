import { addDays, addWeeks, addMonths, format, parseISO } from "date-fns"

export function getNextDueDate(currentDueDate: string, rule: string): string {
  const date = parseISO(currentDueDate)
  switch (rule) {
    case "daily":
      return format(addDays(date, 1), "yyyy-MM-dd")
    case "weekly":
      return format(addWeeks(date, 1), "yyyy-MM-dd")
    case "monthly":
      return format(addMonths(date, 1), "yyyy-MM-dd")
    default:
      return currentDueDate
  }
}

export function shouldGenerateNextOccurrence(
  nextDueDate: string,
  endDate: string | null,
): boolean {
  if (!endDate) return true
  return nextDueDate <= endDate
}
