// =============================================================================
// public/js/components/debounced-lookup.js
// -----------------------------------------------------------------------------
// ค้นหาข้อมูลจากเซิร์ฟเวอร์ตามรหัสที่ผู้ใช้เลือก โดย "รอ 400 มิลลิวินาที" ก่อนค้นหา
// (ถ้ารหัสเปลี่ยนอีกระหว่างรอ จะยกเลิกการค้นหาเดิม)
//
// ใช้ใน:
//   - หน้ารับซื้อ: ค้นหาผู้ขาย   /api/purchases/lookup/<รหัส>   (แทน useSellerLookup)
//   - หน้าเบิกเงิน: ค้นหาสมาชิก /api/withdrawals/lookup/<รหัส> (แทน useMemberLookup)
//
// สถานะที่ส่งให้ onChange: { loading, error, data }
//   - ยังไม่มีรหัส        → { loading: false, error: null, data: null }
//   - กำลังรอผลของรหัสนี้  → { loading: true,  error: null, data: null }
//   - ได้ผลแล้ว           → { loading: false, error: ข้อความหรือ null, data: ข้อมูลหรือ null }
// =============================================================================

// buildUrl(code) = สร้าง URL สำหรับค้นหา
// onChange(state) = ถูกเรียกทุกครั้งที่สถานะเปลี่ยน
export function createDebouncedLookup(buildUrl, onChange, debounceDelay = 250) {
  let trimmed = "";
  // ผลการค้นหาล่าสุด (เก็บไว้แม้รหัสจะเปลี่ยน เหมือนของเดิม)
  let result = { code: "", error: null, data: null };
  let timer = null;
  let requestToken = 0;

  function currentState() {
    if (!trimmed) return { loading: false, error: null, data: null };
    if (result.code !== trimmed) return { loading: true, error: null, data: null };
    return { loading: false, error: result.error, data: result.data };
  }

  return {
    // แจ้งรหัสใหม่ (ช่องว่างหน้า/หลังถูกตัดออก)
    // immediate: true = ค้นหาทันทีไม่ต้องรอ debounce (เช่น เมื่อเลือกจาก dropdown หรือกด Enter)
    setCode(code, { immediate = false } = {}) {
      const next = (code || "").trim();
      if (next === trimmed) return;
      trimmed = next;

      // ยกเลิกการค้นหาที่ค้างอยู่
      clearTimeout(timer);
      const token = ++requestToken;

      if (!next) {
        result = { code: "", error: null, data: null };
        onChange(currentState());
        return;
      }

      const executeFetch = () => {
        fetch(buildUrl(next))
          .then(async (res) => {
            const body = await res.json();
            if (token !== requestToken) return;
            result = res.ok
              ? { code: next, error: null, data: body }
              : { code: next, error: body.error ?? "ไม่สามารถค้นหาข้อมูลได้", data: null };
            onChange(currentState());
          })
          .catch(() => {
            if (token !== requestToken) return;
            result = { code: next, error: "ไม่สามารถค้นหาข้อมูลได้", data: null };
            onChange(currentState());
          });
      };

      if (immediate) {
        executeFetch();
      } else {
        timer = setTimeout(executeFetch, debounceDelay);
      }

      onChange(currentState());
    },

    get state() {
      return currentState();
    },
  };
}
