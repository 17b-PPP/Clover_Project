// =============================================================================
// public/js/core/image.js
// -----------------------------------------------------------------------------
// ย่อขนาดรูปถ่ายก่อนส่งไปเก็บที่เซิร์ฟเวอร์
//
// รูปจากกล้องมือถือมีขนาดใหญ่มาก ถ้าเก็บเป็น base64 ตรง ๆ จะทำให้ข้อมูลสมาชิก/ลูกจ้าง
// ทุกครั้งที่โหลดหนักขึ้น จึงย่อด้านที่ยาวที่สุดให้ไม่เกิน 480px และบีบอัดเป็น JPEG
// ผลลัพธ์เป็น data URL (ข้อความ "data:image/jpeg;base64,...") ที่ใช้เป็น src ของ <img> ได้เลย
// =============================================================================

// file         = ไฟล์รูปจาก <input type="file">
// maxDimension = ความยาวด้านที่ยาวที่สุดหลังย่อ (พิกเซล)
// quality      = คุณภาพ JPEG (0–1)
export function resizeImageToDataUrl(file, maxDimension = 480, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพได้"));
      img.onload = () => {
        // คำนวณสัดส่วนการย่อ (ไม่ขยายรูปที่เล็กอยู่แล้ว)
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        // วาดรูปลง canvas ขนาดใหม่ แล้วแปลงเป็น JPEG
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
