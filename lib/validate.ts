export function isValidIdCardNumber(value: string): boolean {
  return /^[0-9]{13}$/.test(value);
}

export function isValidPhone(value: string): boolean {
  return /^[0-9]{10}$/.test(value);
}

// Reports every duplicate field at once instead of stopping at the first
// one checked, so a form that duplicates both idCardNumber and phone shows
// both warnings together.
export function duplicateFieldsMessage(
  idCardDuplicate: boolean,
  phoneDuplicate: boolean
): string | null {
  if (idCardDuplicate && phoneDuplicate) {
    return "เลขบัตรประชาชนและเบอร์โทรนี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบและแก้ไข";
  }
  if (idCardDuplicate) {
    return "เลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบและแก้ไข";
  }
  if (phoneDuplicate) {
    return "เบอร์โทรนี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบและแก้ไข";
  }
  return null;
}

// Converts a "YYYY-MM-DD" date string (as produced by <input type="date">)
// into the DDMMYYYY digit string used as the default password.
export function dateToDdmmyyyy(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}${month}${year}`;
}
