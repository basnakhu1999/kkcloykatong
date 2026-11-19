ปรับแก้ไขล่าสุด

## สายน้ำร่วมบน Cloudflare

กระทงที่เลือกแชร์จะส่งเฉพาะแบบกระทงกับคำอธิษฐานไปยัง D1 เมื่อเปิดเว็บจะเห็นกระทงล่าสุดสูงสุด 6 ใบ จากนั้นเบราว์เซอร์ที่เปิดหน้านี้อยู่จะทยอยอ่านรายการถัดไปทุก 30 วินาที ปิดเครื่องหมายแชร์เพื่อลอยเฉพาะจอได้ สถิติของฉันยังนับเฉพาะเบราว์เซอร์นี้

### Cloudflare Pages

1. สร้างฐาน D1 ชื่อ `kkc-krathong` ในบัญชีเดียวกับเว็บ
2. เปิดโปรเจกต์ Pages เดิม เลือก Settings → Bindings → Add → D1 database ตั้ง Variable name เป็น `DB` แล้วเลือกฐานที่สร้าง
3. Deploy จาก Git อีกครั้ง โดยให้ไดเรกทอรีที่เผยแพร่มี index.html, _worker.js และ _routes.json อยู่ด้วยกัน ตารางและดัชนีสร้างอัตโนมัติเมื่อมีคำขอ API ครั้งแรก
4. เปิด `/api/floats` บนโดเมนเว็บ ควรเห็น JSON ที่มีฟิลด์ `floats` ลองเปิดคนละเบราว์เซอร์ ลอยกระทงพร้อมติ๊กแชร์ แล้วรอรอบดึงข้อมูลบนอีกจอ

### Worker เดิมที่ขึ้นว่า “only has static assets”

ไฟล์ `wrangler.json` ที่ราก repo กำหนดให้ deploy ทั้ง `_worker.js`, ไฟล์เว็บ และ D1 binding ชื่อ `DB` โดยใช้ฐานชื่อ `kkc-krathong`

1. เปิด Worker เดิม → Settings → Build เชื่อม repo นี้ เลือก production branch `main` และ root ที่ราก repo
2. เว้น Build command ว่าง ใช้ Deploy command `npx wrangler@4 deploy` ถ้า Worker เดิมชื่ออื่น ให้ต่อท้ายด้วย `--name ชื่อจริงของ-worker`
3. Deploy คอมมิตล่าสุด เมื่อ Wrangler มีสิทธิ์เข้าถึง D1 จะผูกฐานให้ตอน deploy หากบัญชีใช้ฐานชื่ออื่นอยู่ ให้ระบุ database_name และ database_id ของฐานนั้นใน wrangler.json ก่อน
4. เปิด `/api/floats` บนโดเมน Worker หากได้ JSON ที่มีรายการ `floats` แปลว่า API อ่าน D1 สำเร็จ ระบบสร้างตารางครั้งแรกให้เอง
