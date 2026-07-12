const { execSync } = require('child_process');
try {
  const stdout = execSync('cmd.exe /c "npx vercel logs --environment production --limit 100 --json"', { encoding: 'utf8' });
  const lines = stdout.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const log = JSON.parse(line);
      const msg = log.lambda && log.lambda.message;
      if (msg) {
        console.log(`${log.created} | ${msg.trim()}`);
      }
    } catch (e) {
    }
  }
} catch (err) {
  console.error("Exec error:", err);
}
