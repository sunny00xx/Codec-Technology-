const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(
    (process.env.ENCRYPTION_KEY || 'your-32-char-encryption-key-here!').padEnd(32, '0').slice(0, 32)
);

const encrypt = (buffer) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Prepend iv + authTag to encrypted data
    return Buffer.concat([iv, authTag, encrypted]);
};

const decrypt = (buffer) => {
    const iv = buffer.slice(0, 12);
    const authTag = buffer.slice(12, 28);
    const encrypted = buffer.slice(28);
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
};

module.exports = { encrypt, decrypt };
