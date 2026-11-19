ปรับแก้ไขล่าสุด

## สายน้ำร่วมบน Cloudflare

กระทงที่เลือกแชร์จะส่งเฉพาะแบบกระทงกับคำอธิษฐานไปยัง D1 เมื่อเปิดเว็บจะเห็นกระทงล่าสุดสูงสุด 6 ใบ จากนั้นเบราว์เซอร์ที่เปิดหน้านี้อยู่จะทยอยอ่านรายการถัดไปทุก 30 วินาที ปิดเครื่องหมายแชร์เพื่อลอยเฉพาะจอได้ สถิติของฉันยังนับเฉพาะเบราว์เซอร์นี้

### Cloudflare Pages

1. สร้างฐาน D1 ชื่อ `kkc-krathong` ในบัญชีเดียวกับเว็บ
2. เปิดโปรเจกต์ Pages เดิม เลือก Settings → Bindings → Add → D1 database ตั้ง Variable name เป็น `DB` แล้วเลือกฐานที่สร้าง
3. Deploy จาก Git อีกครั้ง โดยให้ไดเรกทอรีที่เผยแพร่มี index.html, _worker.js และ _routes.json อยู่ด้วยกัน ตารางและดัชนีสร้างอัตโนมัติเมื่อมีคำขอ API ครั้งแรก
4. เปิด `/api/floats` บนโดเมนเว็บ ควรเห็น JSON ที่มีฟิลด์ `floats` ลองเปิดคนละเบราว์เซอร์ ลอยกระทงพร้อมติ๊กแชร์ แล้วรอรอบดึงข้อมูลบนอีกจอ

### ถ้าโปรเจกต์เป็น Worker ที่เสิร์ฟ Static Assets

ใช้ `_worker.js` เป็น main ของ Worker เดิม ตั้ง static assets binding เป็น `ASSETS` และ D1 binding เป็น `DB` ให้เส้นทาง `/api/*` เข้า Worker ก่อน static assets ตัวอย่างส่วนที่จะรวมกับ Wrangler configuration ของโปรเจกต์ (แทน ID ด้วยค่าจาก D1 และคงชื่อ Worker เดิม)

```toml
main = "_worker.js"

[assets]
directory = "./public"
binding = "ASSETS"
run_worker_first = ["/api/*"]

[[d1_databases]]
binding = "DB"
database_name = "kkc-krathong"
database_id = "<D1 database ID>"
```

หากใช้ตัวอย่างนี้ ให้ใช้ build command `mkdir -p public && cp -R index.html count.html festival.css festival.js img scr public/` แล้ว deploy Worker จาก repo เดียวกัน
