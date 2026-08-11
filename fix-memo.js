const fs = require('fs');
const files = [
  'src/app/mitra/basecamp/page.tsx',
  'src/app/mitra/portfolio/page.tsx',
  'src/app/mitra/verification-status/page.tsx',
  'src/app/notifications/page.tsx',
  'src/app/orders/[id]/Client.tsx',
  'src/app/orders/[id]/review/Client.tsx',
  'src/app/orders/page.tsx',
  'src/app/profile/addresses/page.tsx',
  'src/app/profile/page.tsx',
  'src/app/profile/wallet/page.tsx'
];
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (!content.startsWith('"use no memo";')) {
    fs.writeFileSync(f, '"use no memo";\n' + content, 'utf8');
  }
});
