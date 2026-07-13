const { execSync } = require('child_process');
try {
  const stdout = execSync('cmd.exe /c "npx vercel logs dpl_BrqYTzqFEDN9w44zpFQMVoL5xK84 --limit 100 --expand"', { encoding: 'utf8' });
  console.log(stdout);
} catch (err) {
  console.error("Exec error:", err);
}
