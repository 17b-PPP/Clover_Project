// =============================================================================
// server/lib/validate.js
// -----------------------------------------------------------------------------
// ฟังก์ชันตรวจสอบความถูกต้องของข้อมูลที่ส่งมาจากฟอร์ม
// =============================================================================

// เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลักพอดี
export function isValidIdCardNumber(value) {
  return /^[0-9]{13}$/.test(value);
}

// เบอร์โทรต้องเป็นตัวเลข 10 หลักพอดี
export function isValidPhone(value) {
  return /^[0-9]{10}$/.test(value);
}

// สร้างข้อความเตือนข้อมูลซ้ำ โดยรายงานทุกช่องที่ซ้ำพร้อมกันในครั้งเดียว
// (ถ้าซ้ำทั้งเลขบัตรและเบอร์โทร ผู้ใช้จะเห็นคำเตือนทั้งสองอย่างพร้อมกัน)
// คืนค่า null ถ้าไม่มีอะไรซ้ำ
export function duplicateFieldsMessage(idCardDuplicate, phoneDuplicate) {
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

// แปลงวันที่ "YYYY-MM-DD" (ค่าจาก <input type="date">) เป็นตัวเลข DDMMYYYY
// ใช้เป็นรหัสผ่านเริ่มต้นของผู้ใช้งานใหม่ เช่น "2000-01-01" → "01012000"
export function dateToDdmmyyyy(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}${month}${year}`;
}
