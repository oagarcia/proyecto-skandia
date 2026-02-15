export function isValidDate(dateString: string): boolean {
  // Regex for YYYY-MM-DD format
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  // Parse date and check if it's a valid date object
  const date = new Date(dateString);
  const timestamp = date.getTime();

  if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) return false;

  // Check if the date string matches the ISO string (handles invalid dates like 2023-02-30)
  return date.toISOString().startsWith(dateString);
}
