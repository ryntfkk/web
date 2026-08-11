const fs = require('fs');
const path = require('path');

const files = [
  'src/app/profile/security/page.tsx',
  'src/app/profile/page.tsx',
  'src/app/profile/notifications/page.tsx',
  'src/app/profile/addresses/page.tsx',
  'src/app/profile/addresses/new/page.tsx',
  'src/app/profile/addresses/edit/[id]/page.tsx',
  'src/app/profile/account/page.tsx',
  'src/app/orders/[id]/review/Client.tsx',
  'src/app/orders/[id]/dispute/Client.tsx',
  'src/app/orders/[id]/additional-fee/Client.tsx'
];

for (const file of files) {
  const fullPath = path.join('C:\\Users\\ryntf\\PROJECT\\web', file);
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${file}`);
    continue;
  }
  let content = fs.readFileSync(fullPath, 'utf8');

  // Add import if not present
  if (!content.includes('import PageContainer')) {
    content = content.replace(/(import .* from '.*?';\r?\n)/, "$1import PageContainer from '@/components/layout/PageContainer';\n");
  }

  // Replace <div className="max-w-lg mx-auto px-4 py-6...">
  const divRegex = /<div\s+className="([^"]*max-w-lg\s+mx-auto[^"]*)"\s*>/g;
  content = content.replace(divRegex, (match, classes) => {
    // Remove max-w-lg, mx-auto, px-4, sm:px-6, py-6
    let newClasses = classes
      .replace('max-w-lg', '')
      .replace('mx-auto', '')
      .replace('px-4', '')
      .replace('sm:px-6', '')
      .replace('py-6', '')
      .trim();
    // collapse multiple spaces
    newClasses = newClasses.replace(/\s+/g, ' ');
    if (newClasses) {
      return `<PageContainer className="${newClasses}">`;
    }
    return `<PageContainer>`;
  });

  // Also replace the closing tag. Wait, since we are using regex to find the opening tag, we need to manually find the closing tag.
  // Oh, that's risky if there are multiple divs. 
  // It's safer to just replace `<div className="...">` with `<PageContainer className="...">` and THEN manually replace `</div>` with `</PageContainer>`.
  // Wait, if there are multiple `</div>`, how do we know which one?
  // Let's just do it manually with multi_replace_file_content for the 9 files, it's safer.
}
