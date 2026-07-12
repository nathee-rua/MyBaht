const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === '.next') continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      search(fullPath);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.json'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('GoogleGenAI') || content.includes('generative-ai')) {
        console.log("Match:", fullPath);
      }
    }
  }
}

search('src');
