const crypto = require('crypto');
const fs = require('fs');
const dotenvContent = fs.readFileSync('.env.local', 'utf8');
const envKeyMatch = dotenvContent.match(/ENCRYPTION_KEY="?([^"\n]+)"?/);
process.env.ENCRYPTION_KEY = envKeyMatch ? envKeyMatch[1].trim() : undefined;


const encrypted = "6257da427c970674cc590b2f9a9a1e31:4fac2e3e63c3ac367c63d1cdbf044ff4467caaaddcfaff424ff0464021ec683096f8bcca2d56b0552ef230f2467114e48f39b7d6413f17011b0fd3d2b26d820f";

function getEncryptionKey() {
  const rawKey = 'f5a7d6e4b8c2d1e0f9a8b7c6d5e4f3a2';
  console.log("Raw Key:", rawKey);
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }
  return crypto.createHash('sha256').update(rawKey).digest();
}

function decrypt(text) {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return null;
  }
}

const key = decrypt(encrypted);
console.log("Decrypted Key:", key);
