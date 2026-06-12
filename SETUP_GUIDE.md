# 🌾 AgroVerse — Qo'llanma / Руководство по запуску

---

## 🚀 Tez ishga tushirish (Windows)

### 1-usul: Bir tugma (tavsiya etiladi)
```
START.ps1 → sichqoncha o'ng tugma → PowerShell bilan ishga tushir
```
Yoki PowerShell'da:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\START.ps1
```
Brauzер avtomatik http://127.0.0.1:5500 da ochiladi.

### 2-usul: ЗАПУСК.bat
```
ЗАПУСК.bat → ikki marta bosing
```

---

## 📋 Talablar

| Dastur | Versiya | Havola |
|--------|---------|--------|
| **Python** | 3.10+ | https://python.org (PATH ga qo'shing!) |
| **PostgreSQL** | 14+ | https://postgresql.org |
| **pgAdmin** | ixtiyoriy | PostgreSQL bilan birga keladi |

---

## ⚙️ Ma'lumotlar bazasi sozlash (PostgreSQL)

pgAdmin yoki psql'da bir marta bajaring:

```sql
CREATE DATABASE agroverse;
CREATE USER agroverse_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE agroverse TO agroverse_user;
```

Keyin `agroverse back/.env` faylini yarating:
```env
DATABASE_URL=postgresql://agroverse_user:yourpassword@localhost:5432/agroverse
SECRET_KEY=supersecretkey123
```

Jadvallar birinchi ishga tushirishda **avtomatik** yaratiladi.

---

## 🔧 Qo'lda ishga tushirish

**Terminal 1 — Backend:**
```powershell
cd "agroverse back"
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**Terminal 2 — Frontend:**
```powershell
cd "agroverse front"
python -m http.server 5500
```

---

## 🔗 Manzillar

| Manzil | Tavsif |
|--------|--------|
| http://127.0.0.1:5500 | 🌐 Sayt |
| http://127.0.0.1:8000 | 🔧 Backend API |
| http://127.0.0.1:8000/docs | 📚 Swagger UI |

---

## 🐛 Muammolar va yechimlar

### "Connection refused" 8000 portida
→ Backend ishlamayapti. Terminal'da qayta ishga tushiring.

### CORS xatosi
→ Frontend `http://127.0.0.1:5500` da bo'lishi kerak (`localhost` emas).  
→ Ctrl+F5 bilan sahifani yangilang.

### 422 / 500 xatosi
→ `.env` fayl bor-yo'qligini tekshiring.  
→ PostgreSQL ishlamoqda-mi tekshiring.

### START.ps1 yopiladi
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 🔑 Admin kirish

Login maydoniga `админ123`, parolga `127845` kiriting → Admin panelga o'tiladi.

---

## ✅ Tekshirish

1. http://127.0.0.1:5500 oching
2. Ro'yxatdan o'ting (fermer yoki xaridor)
3. Login qiling
4. Asosiy sahifa, Bozor, Profil ishlashi kerak
