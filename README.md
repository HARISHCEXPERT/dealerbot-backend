# BotSaathi Backend — Supabase + Vercel Edition

Full-feature backend ke saath:
- 🗄️ Supabase Postgres (MongoDB hata diya)
- 🔐 JWT auth + bcrypt passwords + OTP password reset
- 👥 Multi-user (admin / client roles)
- 🤝 Human handoff queue
- 📊 Enhanced analytics (daily charts + CRM status)
- 🤖 WhatsApp bot (Gemini AI)
- 🚀 Vercel serverless ready (also works on Render/Railway)

---

## 🔧 Setup

### 1. Supabase project banao
1. https://app.supabase.com → New project
2. **SQL Editor** → paste `supabase/schema.sql` → Run
   - Tables ban jayengi
   - Default admin user bhi seed ho jayega: **`admin@botsaathi.com` / `admin123`** (login ke baad turant password change karna!)
3. **Settings → API** → ye 2 copy karo:
   - `Project URL`         → env `SUPABASE_URL`
   - `service_role` key    → env `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ `service_role` key sirf backend mein. Frontend mein **kabhi nahi**.

### 2. Local run
```bash
cp .env.example .env
# .env mein SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + JWT_SECRET set karo
npm install
npm run seed       # (optional) Hero bikes seed
npm run dev        # http://localhost:5000
```

---

## ☁️ Deploy on Vercel

1. Is folder ko ek GitHub repo mein push karo
2. https://vercel.com → New Project → repo select karo
3. **Framework Preset:** Other
4. **Root Directory:** `./` (yahi folder)
5. **Build Command:** *(blank — Vercel auto-detects from vercel.json)*
6. **Environment Variables** tab mein add karo:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `GEMINI_API_KEY`
   - `FRONTEND_URL` ← apna Vercel frontend URL (`https://botsaathi-frontend.vercel.app`)
   - `BACKEND_URL` ← apna khud ka URL (after first deploy: `https://your-backend.vercel.app`)
   - Meta + SMTP env vars (optional)
7. Deploy

✅ Backend live: `https://<your-backend>.vercel.app`
Test: `GET https://<your-backend>.vercel.app/` → `{ status: "BotSaathi API running 🚀" }`

> **Note:** Vercel serverless functions short-lived hote hain (10s default).
> `node-cron` (expiry job) Vercel pe nahi chalega — uske liye Vercel Cron Jobs ya
> Supabase pg_cron use kar. Local/Render/Railway pe automatic.

### Alternate: Render / Railway deploy
- Build cmd: `npm install`
- Start cmd: `npm start`
- Same env vars
- Cron bhi chalega

---

## 📡 API endpoints

### Public
| Method | Path                              | Body                                  |
| ------ | --------------------------------- | ------------------------------------- |
| POST   | `/api/auth/login`                 | `{email, password}` → `{user, token}` |
| POST   | `/api/auth/forgot-password`       | `{email}`                             |
| POST   | `/api/auth/reset-password`        | `{email, otp, newPassword}`           |
| GET    | `/webhook`                        | Meta verify                           |
| POST   | `/webhook`                        | Meta receive                          |

### Authenticated (Bearer token)
| Method | Path                              | Notes                                 |
| ------ | --------------------------------- | ------------------------------------- |
| GET    | `/api/auth/me`                    | Current user                          |
| GET    | `/api/clients`                    | All clients (filtered by role)        |
| GET    | `/api/leads`                      | Leads (filtered by role)              |
| GET    | `/api/leads/stats`                | Total + hot/warm/cold + daily + status|
| PUT    | `/api/lead/:id`                   | Update status/notes/followUp          |
| DELETE | `/api/lead/:id`                   | Delete lead                           |
| GET    | `/api/handoffs`                   | All handoffs                          |
| POST   | `/api/webhook/simulate`           | Bot tester                            |
| POST   | `/api/webhook/reset`              | Reset conversation                    |

### Admin only
| Method | Path                              |
| ------ | --------------------------------- |
| GET    | `/api/auth/users`                 |
| POST   | `/api/auth/create-user`           |
| DELETE | `/api/auth/user/:id`              |
| POST   | `/api/auth/admin-reset`           |
| POST   | `/api/client`                     |
| PUT    | `/api/client/:id`                 |
| DELETE | `/api/client/:id`                 |
| PUT    | `/api/handoff/:id/resolve`        |
| DELETE | `/api/handoff/:id`                |

---

## 🔑 Default admin login

Schema seed ke baad:
- Email: `admin@botsaathi.com`
- Password: `admin123`

**Login karte hi password change karo** (Users page → reset).

---

## 🆔 ID format

Mongo `_id` (ObjectId) → Supabase `id` (UUID).
Response mein **dono fields** (`id` + `_id`) milte hain — frontend nahi toot raha.

---

## 🐛 Common issues

- **`{error: "No token"}`** — login karke `Authorization: Bearer <token>` bhej raha hai? Frontend `api.js` automatic add karta hai.
- **CORS error** — `FRONTEND_URL` env var set karo
- **Login fail** — admin user seed nahi hua? `schema.sql` dubara run karo
- **OTP nahi mil raha email pe** — `SMTP_*` env vars set karo. Warna OTP server console mein log hota hai (dev mein chalega)
- **Cron not running on Vercel** — Vercel serverless hai, long-running jobs nahi chalte. Render/Railway use karo OR Supabase pg_cron set karo.
