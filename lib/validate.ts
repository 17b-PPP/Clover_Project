export function isValidIdCardNumber(value: string): boolean {
  return /^[0-9]{13}$/.test(value);
}

export function isValidPhone(value: string): boolean {
  return /^[0-9]{10}$/.test(value);
}
