export function isValidIdCardNumber(value: string): boolean {
  return /^[0-9]{13}$/.test(value);
}

export function isValidPhone(value: string): boolean {
  return /^[0-9]{10}$/.test(value);
}

// Converts a "YYYY-MM-DD" date string (as produced by <input type="date">)
// into the DDMMYYYY digit string used as the default password.
export function dateToDdmmyyyy(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}${month}${year}`;
}
