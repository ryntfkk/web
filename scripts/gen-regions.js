// Regenerate src/data/regions/* from cahyadsn/wilayah SQL dump.
//
//   curl -sSL -o wilayah.sql https://raw.githubusercontent.com/cahyadsn/wilayah/master/db/wilayah.sql
//   node scripts/gen-regions.js wilayah.sql
//
// Levels by code depth (dots): 0=province, 1=regency, 2=district, 3=village(ignored).
const fs = require('fs');
const path = require('path');

const sqlPath = process.argv[2];
if (!sqlPath) { console.error('usage: node scripts/gen-regions.js <wilayah.sql>'); process.exit(1); }
const OUT = path.join(__dirname, '..', 'src', 'data', 'regions');

const SQL = fs.readFileSync(sqlPath, 'utf8');
const re = /\('([0-9.]+)','((?:[^']|'')*)'\)/g;
const provinces = [];
const regenciesByProv = {};
const districtsByProv = {};

let m;
while ((m = re.exec(SQL)) !== null) {
  const code = m[1];
  const name = m[2].replace(/''/g, "'");
  const depth = (code.match(/\./g) || []).length;
  if (depth === 0) {
    provinces.push({ code, name });
  } else if (depth === 1) {
    const prov = code.slice(0, 2);
    (regenciesByProv[prov] ||= []).push({ code, name });
  } else if (depth === 2) {
    const prov = code.slice(0, 2);
    const reg = code.slice(0, 5);
    ((districtsByProv[prov] ||= {})[reg] ||= []).push({ code, name });
  }
}

fs.mkdirSync(path.join(OUT, 'districts'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'provinces.json'), JSON.stringify(provinces));
fs.writeFileSync(path.join(OUT, 'regencies.json'), JSON.stringify(regenciesByProv));
for (const prov of Object.keys(districtsByProv)) {
  fs.writeFileSync(path.join(OUT, 'districts', prov + '.json'), JSON.stringify(districtsByProv[prov]));
}

const regCount = Object.values(regenciesByProv).reduce((a, b) => a + b.length, 0);
const distCount = Object.values(districtsByProv).reduce((a, mm) => a + Object.values(mm).reduce((x, y) => x + y.length, 0), 0);
console.log(`provinces=${provinces.length} regencies=${regCount} districts=${distCount}`);
