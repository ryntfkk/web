# Data Wilayah Indonesia

Sumber: [cahyadsn/wilayah](https://github.com/cahyadsn/wilayah) — Kode Wilayah
Administrasi sesuai **Kepmendagri No 300.2.2-2138 Tahun 2025** (MIT License).

Regenerate dengan `scripts/gen-regions.js` (lihat commit) dari `db/wilayah.sql`.

Struktur:
- `provinces.json` — `[{ code, name }]` (38 provinsi)
- `regencies.json` — `{ [provinceCode]: [{ code, name }] }` (514 kota/kabupaten)
- `districts/{provinceCode}.json` — `{ [regencyCode]: [{ code, name }] }` (7.285 kecamatan, lazy-load per provinsi)

Kode memakai format bertitik: provinsi `33`, kota `33.74`, kecamatan `33.74.01`.
Nilai yang disimpan ke DB adalah **nama** (mis. `"Kota Semarang"`, `"Tembalang"`).
