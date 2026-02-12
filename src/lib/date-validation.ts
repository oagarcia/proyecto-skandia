/**
 * Validates if a string is in YYYY-MM-DD format and is a valid date.
 * @param dateString The date string to validate.
 * @returns true if valid, false otherwise.
 */
export function isValidDate(dateString: string): boolean {
    // Regex for YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) {
        return false;
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return false;
    }

    // Check if the date components match the input string to avoid rollover (e.g. 2023-02-31 becoming 2023-03-03)
    const [year, month, day] = dateString.split('-').map(Number);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
        // Note: Using UTC methods because "YYYY-MM-DD" is parsed as UTC midnight
        return false;
    }

    return true;
}

/**
 * Validates if the 'from' date is before or equal to the 'to' date.
 * Assumes inputs are valid dates.
 * @param from The start date string (YYYY-MM-DD).
 * @param to The end date string (YYYY-MM-DD).
 * @returns true if from <= to, false otherwise.
 */
export function isValidDateRange(from: string, to: string): boolean {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return fromDate <= toDate;
}
