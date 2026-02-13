export function isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;

    // Check if the input string matches the parsed date (handles invalid days like 2023-02-30)
    // toISOString() returns "YYYY-MM-DDTHH:mm:ss.sssZ", we take the first 10 chars.
    return date.toISOString().startsWith(dateString);
}

export function isValidDateRange(from: string, to: string): boolean {
    if (!isValidDate(from) || !isValidDate(to)) return false;

    const fromDate = new Date(from);
    const toDate = new Date(to);

    return fromDate <= toDate;
}
