import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // อนุญาตให้เปิด dev server จากเครื่องอื่นในวง LAN (มือถือ/แท็บเล็ต) ได้
  // ถ้า IP ของเครื่องนี้เปลี่ยน ให้แก้ค่าให้ตรงกับที่ `next dev` แสดงในบรรทัด "Network:"
  allowedDevOrigins: ["192.168.191.1"],
  // exceljs เป็นแพ็กเกจ Node ขนาดใหญ่ (ใช้ตอนสร้างไฟล์ Excel ของรายงานผลประกอบการ)
  // ให้ Next โหลดจาก node_modules ตอนรันแทนการ bundle เข้า route
  serverExternalPackages: ["exceljs"],
};

export default nextConfig;
