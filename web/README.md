# our-crm — Web UI

Frontend CRM (Svelte) untuk backend Go di parent repo. Dibangun sebagai SPA
ringan: dark/light mode, dua bahasa (ID/EN), aksen hijau neon, dan komponen
berkualitas (dropdown, form, calendar) di atas primitives headless.

## Stack

- SvelteKit 2 (SPA, `adapter-static` + fallback `index.html`) + Svelte 5 runes
- Tailwind CSS 4 — token tema di `src/app.css` (CSS variables, tanpa config JS)
- bits-ui — komponen headless accessible (Select, DropdownMenu, Dialog, Popover, Calendar, Switch)
- @lucide/svelte — ikon, tree-shakeable per ikon
- svelte-i18n — terjemahan `src/lib/i18n/{id,en}.json`
- Font self-hosted via @fontsource-variable (Sora, IBM Plex Sans, JetBrains Mono)

## Menjalankan

```powershell
cd web
npm install
npm run dev        # http://localhost:5173
```

Proxy dev: `/api` diteruskan ke `http://localhost:3001` (backend Go, lihat
`internal/config`). Jalankan backend di terminal terpisah: `go run ./cmd/server`.

## Build

```powershell
npm run build      # output statis di build/
npm run preview
```

Hasil `build/` bisa dilayani oleh server apa pun (mis. Go `http.FileServer`);
arahkan semua path non-API ke `index.html` karena SPA.

## Struktur

```
src/
  app.css                  token desain (tema terang/gelap, warna neon, font)
  app.html                 script anti-flash tema
  lib/
    api.ts                 client fetch /api/v1 (token JWT disimpan di localStorage)
    theme.svelte.ts        state tema (light/dark/system, persist)
    i18n/                  svelte-i18n + kamus id/en
    mock.ts                data contoh UI (ganti dengan api() saat integrasi)
    navigation.ts          konfigurasi menu sidebar
    components/ui/         Button, Input, Textarea, Field, Select, DatePicker,
                           Card, Badge, EmptyState
    components/layout/     Sidebar, Topbar
  routes/                  /, /conversations, /campaigns, /tickets,
                           /contacts, /reports, /settings
```

## Catatan

- Tema & bahasa tersimpan di `localStorage` (`crm.theme`, `crm.locale`).
- Data di halaman saat ini masih contoh (`lib/mock.ts`) — siap disambungkan ke
  endpoint `/api/v1` yang sudah ada (auth, contacts, campaigns, dsb).
