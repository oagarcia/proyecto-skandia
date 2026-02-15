export function isValidDate(dateString: string): boolean {
    // Check format YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) {
        return false;
    }

    // Check validity (e.g. 2023-02-30)
    // Date.parse('YYYY-MM-DD') parses as UTC
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return false;
    }

    // Check if the date string matches the date object (handles overflow like 2023-02-30 -> 2023-03-02)
    const [year, month, day] = dateString.split('-').map(Number);

    // Use UTC methods because YYYY-MM-DD is parsed as UTC midnight
    if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
        return false;
    }

    return true;
}
