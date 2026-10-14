# สารบัญไฟล์โค้ดอธิบายการทำงานแต่ละหน้า (Annotated Code Files)

โฟลเดอร์นี้รวบรวมไฟล์โค้ด JavaScript ที่ใช้ควบคุมการทำงานของแต่ละหน้าเว็บในระบบ โดยใส่ **คอมเมนต์ภาษาไทยอธิบายอย่างละเอียดในทุกคำสั่ง ฟังก์ชัน สูตรคำนวณ และตัวแปร** เพื่อให้อ่านเข้าใจง่าย เหมาะสำหรับใช้เปิดดูโค้ดจริงระหว่างสอบหรือทบทวนความเข้าใจ

| ลำดับ | ชื่อไฟล์ | หน้าที่ / หน้าเว็บ | เส้นทาง URL |
| :---: | :--- | :--- | :--- |
| 1 | [01_login_staff.js](file:///c:/Users/ASUS/OneDrive/Desktop/Clover%20Project/explained_code/01_login_staff.js) | หน้าเข้าสู่ระบบสำหรับพนักงานและผู้ดูแลระบบ | `/login` |
| 2 | [02_login_member.js](file:///c:/Users/ASUS/OneDrive/Desktop/Clover%20Project/explained_code/02_login_member.js) | หน้าเข้าสู่ระบบสำหรับสมาชิกเจ้าของสวนยาง (บัตร ปชช. 13 หลัก + วันเกิด) | `/member/login` |
| 3 | [03_members.js](file:///c:/Users/ASUS/OneDrive/Desktop/Clover%20Project/explained_code/03_members.js) | หน้าดู/ค้นหา/เพิ่ม/แก้ไข/ระงับ/ลบ สมาชิกชาวสวนยาง | `/members` |
| 4 | [04_employees.js](file:///c:/Users/ASUS/OneDrive/Desktop/Clover%20Project/explained_code/04_employees.js) | หน้าดู/ค้นหา/เพิ่ม/แก้ไข/ระงับ/ลบ ลูกจ้างกรีดยาง | `/employees` |
| 5 | [05_contracts.js](file:///c:/Users/ASUS/OneDrive/Desktop/Clover%20Project/explained_code/05_contracts.js) | หน้าจับคู่สมาชิก-ลูกจ้าง (MePair) และตัดแบ่งสัดส่วนรายได้ | `/contracts` |
| 6 | [06_purchases.js](file:///c:/Users/ASUS/OneDrive/Desktop/Clover%20Project/explained_code/06_purchases.js) | **[หน้าสำคัญ]** รับซื้อน้ำยางสด คำนวณ DRC % แบ่งเงิน และพิมพ์ใบเสร็จ | `/purchases` |
| 7 | [07_withdrawals.js](file:///c:/Users/ASUS/OneDrive/Desktop/Clover%20Project/explained_code/07_withdrawals.js) | หน้าเบิกเงินสะสมในกระเป๋า (Wallet) ของสมาชิก และประวัติการเบิก | `/withdrawals` |
| 8 | [08_reference_price.js](file:///c:/Users/ASUS/OneDrive/Desktop/Clover%20Project/explained_code/08_reference_price.js) | หน้าราคากลางรับซื้อน้ำยางพาราประจำวัน และประวัติการปรับราคา | `/reference-price` |
| 9 | [09_dividends.js](file:///c:/Users/ASUS/OneDrive/Desktop/Clover%20Project/explained_code/09_dividends.js) | หน้าจำลองคำนวณและบันทึกจ่ายเงินปันผลประจำปี | `/dividends` |
| 10 | [10_purchase_summary.js](file:///c:/Users/ASUS/OneDrive/Desktop/Clover%20Project/explained_code/10_purchase_summary.js) | หน้ารายงานสรุปการ์ด 8 ใบ กราฟแนวโน้ม และส่งออกเป็น Excel | `/performance/purchase-summary` |
| 11 | [11_users.js](file:///c:/Users/ASUS/OneDrive/Desktop/Clover%20Project/explained_code/11_users.js) | หน้าจัดการบัญชีเจ้าหน้าที่ กำหนดสิทธิ์ ADMIN/STAFF | `/users` |
| 12 | [12_audit_log.js](file:///c:/Users/ASUS/OneDrive/Desktop/Clover%20Project/explained_code/12_audit_log.js) | หน้าตรวจสอบประวัติกิจกรรมการใช้งานระบบ Audit Log | `/audit-log` |
| 13 | [13_member_dashboard.js](file:///c:/Users/ASUS/OneDrive/Desktop/Clover%20Project/explained_code/13_member_dashboard.js) | หน้าแรกสมาชิก: ยอดกระเป๋าเงิน ลูกจ้างที่ผูกสัญญา และยอดขาย | `/member/dashboard` |
| 14 | [14_member_finance.js](file:///c:/Users/ASUS/OneDrive/Desktop/Clover%20Project/explained_code/14_member_finance.js) | หน้า Statement การเงินสมาชิก (ขาย/เบิก/ปันผล) และกราฟรายได้ | `/member/finance` |
| 15 | [15_member_sales.js](file:///c:/Users/ASUS/OneDrive/Desktop/Clover%20Project/explained_code/15_member_sales.js) | หน้าประวัติการส่งน้ำยางของสมาชิก กราฟผลผลิต และดูใบเสร็จ | `/member/sales` |

