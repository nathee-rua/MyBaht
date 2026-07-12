const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      search(fullPath);
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.json'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('GoogleGenAI') || content.includes('generative-ai')) {
        console.log("Match:", fullPath);
      }
    }
  }
}

try {
  search('.next');
} catch (e) {
  console.error(e.message);
}
