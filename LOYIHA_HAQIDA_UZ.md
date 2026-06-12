# 🌾 AgroVerse — Loyiha haqida to'liq ma'lumot

**AgroVerse** — fermer mahsulotlari uchun onlayn marketplace. Fermerlar o'z mahsulotlarini sotadi, xaridorlar esa to'g'ridan-to'g'ri fermerdan sotib oladi.

**Stack:** Python FastAPI + Vanilla JavaScript + PostgreSQL

---

## 👥 1. FOYDALANUVCHI ROLLARI

| Rol | Kim | Nima qila oladi |
|-----|-----|-----------------|
| **Fermer** | Sotuvchi | Mahsulot qo'shadi, buyurtmalarni boshqaradi, tarifni tanlaydi |
| **Xaridor** | Sotib oluvchi | Mahsulot ko'radi, savatga qo'shadi, buyurtma beradi |
| **Admin** | Boshqaruvchi | Hamma narsani nazorat qiladi, bloklaydi, moderatsiya qiladi |

---

## 🔐 2. AUTENTIFIKATSIYA

- **Ro'yxatdan o'tish** — ism, telefon, parol, rol, email
- **Kirish** — telefon + parol
- Parollar **bcrypt** bilan shifrlangan (passlib emas, to'g'ridan-to'g'ri `bcrypt` 4.2.0)
- Kirgandan keyin **JWT token** beriladi
- Google kirish — interfeys bor (logika keyinroq)

**Admin kirish:** telefon → `админ123`, parol → `127845`

---

## 🚫 3. BLOKLASH TIZIMI

- Admin foydalanuvchini **sabab bilan** bloklashi mumkin
- Bloklangan foydalanuvchi:
  - Darhol saytdan chiqariladi (15 soniyada heartbeat tekshiruvi)
  - **Blok ekrani** ko'rsatiladi (sababi bilan)
  - Qayta kira olmaydi (login 403 qaytaradi)
- Admin blokni **yechishi** mumkin

---

## 🛒 4. MAHSULOTLAR

**Fermer:**
- Yangi mahsulot qo'shish (nom, narx, kategoriya, tavsif, miqdor, rasm)
- Rasmsiz ham qo'shish mumkin
- Tahrirlash va o'chirish

**Hamma:**
- Mahsulotlar ro'yxati — "Bozor" bo'limi
- Kategoriya bo'yicha filtrlash va qidirish
- Mahsulot tafsilotlari sahifasi

> Yangi mahsulotlar **pending** holatda qo'shiladi — admin tasdiqlashi kerak.

---

## 📦 5. BUYURTMALAR

**Xaridor:**
- Savatga qo'shish → buyurtma berish
- Buyurtmalar tarixi
- Bekor qilish

**Fermer:**
- Kelgan buyurtmalar
- Holat boshqaruvi: `to'landi → tayyor → bajarildi / bekor qilindi`

---

## 💰 6. HAMYON VA BONUSLAR

**Hamyon:**
- Balansni ko'rish
- Pul kiritish (deposit) va yechish (withdraw)
- Tranzaksiyalar tarixi

**Bonus ballari:**
| Holat | Ball |
|-------|------|
| Fermer: mahsulot qo'shdi | +10 |
| Fermer: muvaffaqiyatli sotdi | +5 |
| Xaridor: sharh qoldirdi | +3 |
| Xaridor: birinchi buyurtma | +20 |
| Do'st taklif qildi | +15 |

**Qoidalar:**
- 1 ball = $0.01 chegirma
- Ballarni tarif oshirishga ishlatish mumkin
- Ballar yonib ketmaydi
- Buyurtma summasidan maksimum 20% ballar bilan to'lash mumkin

---

## 📊 7. TARIFLAR (Fermerlar uchun)

| Parametr | Standart ($5/oy) | Normal ($15/oy) | Premium ($50+/oy) |
|----------|-----------------|-----------------|-------------------|
| Mahsulotlar | 5 ta | 30 ta | Cheksiz |
| Rasm | 3 ta | 10 ta | Cheksiz |
| AI | Asosiy | Kengaytirilgan | To'liq |
| Analitika | Yo'q | Asosiy | Batafsil |
| Qidiruv | Oddiy | Yuqori | TOP |
| Komissiya | 10% | 7% | 5% |
| Qo'llab-quvvatlash | FAQ | Email | Shaxsiy menejer |

> Hozir tariflar faqat ko'rsatish uchun (real limit logikasi keyinroq).

---

## 🤖 8. AI YORDAMCHI

- Saytda AI chat-interfeysi mavjud (modal oyna orqali)
- Backend AI endpointlari: talab prognozi, narx tahlili, ekish maslahati, sotish maslahati, risklar tahlili
- Hozir chat = chiroyli interfeys (to'liq AI logikasi keyinroq ulanadi)

---

## 🛠️ 9. ADMIN PANEL

Admin nima qila oladi:
- **Statistika:** foydalanuvchilar, mahsulotlar, buyurtmalar soni
- **Foydalanuvchilar:** ro'yxat, bloklash (sabab bilan), blokdan chiqarish, o'chirish
- **Moderatsiya:** pending mahsulotlarni ko'rish, tasdiqlash, rad etish
- **Hisobotlar:** buyurtmalar va daromad hisoboti

**Admin API endpointlari:**
```
GET  /api/admin/users
PATCH /api/admin/users/:id/block
PATCH /api/admin/users/:id/unblock
GET  /api/products/pending
PATCH /api/products/:id/approve
PATCH /api/products/:id/reject
GET  /api/reports/orders
GET  /api/reports/revenue
```

> `/api/logistics/*` endpointlari **yo'q**, yaratmang.

---

## 🌐 10. KO'P TILLILIK

Sayt 3 tilda ishlaydi:
- 🇺🇿 **O'zbek** — asosiy (default)
- 🇷🇺 **Rus**
- 🇬🇧 **Ingliz**

Til navbar dan o'zgartiriladi (`js/i18n.js` + `window.t(key)` funksiyasi).

---

## 🎨 11. DIZAYN

- **Asosiy rang:** `#10B981` (yashil)
- **Orqa fon:** oq `#FFFFFF`
- **Matn:** `#111827`
- **Shrift:** Unbounded (sarlavhalar) + Inter (matn)
- Mikroanimatsiyalar, hover effektlar, gradientlar
- **Mobil moslashuvchan** (burger menyu, adaptiv layout)
- Ikonkalar: Flaticon UICons CDN

---

## 🗂️ 12. SAYT TUZILMASI

**Fermer navigatsiyasi:**
`Bosh sahifa` · `Bozor` · `Mahsulot qo'shish` · `Hamyon` · `Profil`

**Xaridor navigatsiyasi:**
`Bosh sahifa` · `Bozor` · `Buyurtmalarim` · `Savat` · `Hamyon` · `Profil`

- AI yordamchi = modal oyna (alohida sahifa emas)
- Tariflar sahifasi = profildan yoki to'g'ridan-to'g'ri `#/tariffs`
- Fermer mahsulotlari = Profilida ko'rinadi (bosh sahifada emas)

---

## ⚙️ 13. TEXNIK MA'LUMOT

- **Backend ishga tushirish:** `uvicorn app.main:app` (ildizdagi `main.py` emas!)
- **Parol shifrlash:** `bcrypt` 4.2.0 (passlivsiz, to'g'ridan-to'g'ri `bcrypt.hashpw/checkpw`)
- **Ma'lumotlar bazasi:** PostgreSQL (pgAdmin orqali ko'rish mumkin)
- **Jadvallar:** birinchi ishga tushirishda `create_all` orqali avtomatik yaratiladi
- **Launcherlar:** `START.ps1` va `ЗАПУСК.bat`

---

## ✅ XULOSA

AgroVerse — to'liq ishlaydigan fermer marketplace:
3 rol · Autentifikatsiya · Bloklash · Mahsulotlar · Buyurtmalar  
Hamyon · Bonuslar · Tariflar · AI interfeysi · Admin panel  
3 til · Mobil dizayn
