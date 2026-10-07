// =============================================================================
// server/lib/auth.js
// -----------------------------------------------------------------------------
// ฟังก์ชันเข้ารหัสและตรวจสอบรหัสผ่านของผู้ใช้งาน (Staff/Admin)
//
// รูปแบบที่เก็บในฐานข้อมูล:  "<salt>:<hash>"
//   - salt  = ค่าสุ่ม 16 ไบต์ (เลขฐาน 16)
//   - hash  = ผลลัพธ์ของ scrypt(รหัสผ่าน, salt) ยาว 64 ไบต์ (เลขฐาน 16)
// =============================================================================

import crypto from "node:crypto";

const KEY_LENGTH = 64;

// เข้ารหัสรหัสผ่านก่อนบันทึกลงฐานข้อมูล (สุ่ม salt ใหม่ทุกครั้ง)
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

// ตรวจว่ารหัสผ่านที่กรอกมาตรงกับค่าที่เก็บไว้หรือไม่
// ใช้ timingSafeEqual เพื่อไม่ให้เวลาในการเปรียบเทียบบอกใบ้ผู้โจมตีได้
export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  const candidateBuf = Buffer.from(candidate, "hex");
  const hashBuf = Buffer.from(hash, "hex");
  return (
    candidateBuf.length === hashBuf.length &&
    crypto.timingSafeEqual(candidateBuf, hashBuf)
  );
}
