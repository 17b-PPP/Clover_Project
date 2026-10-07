// =============================================================================
// public/js/components/postal-code-lookup.js
// -----------------------------------------------------------------------------
// ค้นหาอำเภอ/จังหวัดจากรหัสไปรษณีย์ (ใช้ในฟอร์มสมาชิก/ลูกจ้าง)
//
// ทุกครั้งที่รหัสไปรษณีย์เปลี่ยน ให้เรียก update(รหัส)
//   - ถ้าเป็นตัวเลข 5 หลัก จะเรียก GET /api/postal-code/<รหัส>
//   - เมื่อได้ผลลัพธ์ (และรหัสยังไม่ถูกเปลี่ยนไประหว่างรอ) จะเรียก onMatches(ผลลัพธ์)
//     ผลลัพธ์ = [{ amphoe, province }, ...]
// =============================================================================

export function createPostalCodeLookup(onMatches) {
  let currentCode = null;
  let requestId = 0;

  return {
    // แจ้งรหัสไปรษณีย์ล่าสุด (ถ้าเหมือนเดิมจะไม่ค้นหาซ้ำ)
    update(postalCode) {
      if (postalCode === currentCode) return;
      currentCode = postalCode;
      const id = ++requestId; // คำขอที่ใหม่กว่าจะทำให้คำขอเก่าถูกยกเลิก
      if (!/^[0-9]{5}$/.test(postalCode)) return;
      fetch(`/api/postal-code/${postalCode}`)
        .then((res) => res.json())
        .then((data) => {
          if (id === requestId) onMatches(data);
        });
    },

    // ล้างสถานะ (ใช้ตอนเปิดฟอร์มใหม่)
    reset() {
      currentCode = null;
      requestId++;
    },
  };
}
