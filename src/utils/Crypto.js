const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Data to encrypt
const data = 'My secret message';
const password = 'my_secure_password';

// Use a static salt (for demonstration) – make sure its length is what you expect.
// Here we choose a salt string that we will convert to a Buffer.
const STATIC_SALT = 'salt_for_encryption'; // adjust to desired length (here 20 characters)
const saltBuffer = Buffer.from(STATIC_SALT, 'utf8');

// Derive a key using PBKDF2 (both sides must use the same salt)
const key = crypto.pbkdf2Sync(password, saltBuffer, 100000, 32, 'sha256');

// Generate a random IV (initialization vector; 12 bytes for GCM)
const iv = crypto.randomBytes(12);

// Encrypt the data using AES-256-GCM
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
let encrypted = cipher.update(data, 'utf8', 'hex');
encrypted += cipher.final('hex');
const authTag = cipher.getAuthTag();

// Combine salt, IV, authTag, and encrypted data into one Buffer
const encryptedData = Buffer.concat([
  saltBuffer, // salt used (Buffer)
  iv, // IV (12 bytes)
  authTag, // Auth tag (16 bytes)
  Buffer.from(encrypted, 'hex'), // Encrypted ciphertext
]).toString('base64');
console.log(`Encrypted Data: ${encryptedData}`);

// Decrypt the data
const decoded = Buffer.from(encryptedData, 'base64');
// Use the saltBuffer length to extract the salt back
const saltLength = saltBuffer.length;
const saltDec = decoded.slice(0, saltLength);
const ivDec = decoded.slice(saltLength, saltLength + 12);
const authTagDec = decoded.slice(saltLength + 12, saltLength + 12 + 16);
const ciphertext = decoded.slice(saltLength + 12 + 16);

// Derive the key again using the same salt for decryption
const keyDec = crypto.pbkdf2Sync(password, saltDec, 100000, 32, 'sha256');

// Decrypt using AES-256-GCM
const decipher = crypto.createDecipheriv('aes-256-gcm', keyDec, ivDec);
decipher.setAuthTag(authTagDec);
let decrypted = decipher.update(ciphertext, undefined, 'utf8');
decrypted += decipher.final('utf8');

console.log(`Decrypted Data: ${decrypted}`);

// ==================================================
// Helper functions for vault encryption/decryption
// ==================================================

const encryptVal = (keyName, value, password) => {
  try {
    // Allow an environment salt override; ensure we work with it as a Buffer.
    const saltSource = process.env.CRYPTO_SALT || STATIC_SALT;
    const saltBuffer = Buffer.from(saltSource, 'utf8');

    // Derive a key using PBKDF2
    const encKey = crypto.pbkdf2Sync(
      password,
      saltBuffer,
      100000,
      32,
      'sha256'
    );

    // Generate a random IV (12 bytes for GCM)
    const iv = crypto.randomBytes(12);

    // Encrypt the value (convert to string if necessary)
    const cipher = crypto.createCipheriv('aes-256-gcm', encKey, iv);
    let encrypted = cipher.update(value.toString(), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Combine salt, IV, authTag, and ciphertext into one Buffer then encode in base64
    const encryptedData = Buffer.concat([
      saltBuffer,
      iv,
      authTag,
      Buffer.from(encrypted, 'hex'),
    ]).toString('base64');

    // Read existing vault or create new one
    const vaultPath = path.join(__dirname, 'vault.json');
    let vault = {};

    if (fs.existsSync(vaultPath)) {
      const vaultContent = fs.readFileSync(vaultPath, 'utf8');
      vault = JSON.parse(vaultContent);
    }

    // Add new encrypted value using the provided keyName
    vault[keyName] = encryptedData;

    // Save back to vault.json
    fs.writeFileSync(vaultPath, JSON.stringify(vault, null, 2));

    return true;
  } catch (error) {
    console.error('Error encrypting value:', error);
    return false;
  }
};

const decryptVal = (keyName, password) => {
  try {
    // Read from vault.json
    const vaultPath = path.join(__dirname, 'vault.json');
    if (!fs.existsSync(vaultPath)) {
      throw new Error('Vault file not found');
    }

    const vaultContent = fs.readFileSync(vaultPath, 'utf8');
    const vault = JSON.parse(vaultContent);

    if (!vault[keyName]) {
      throw new Error('Key not found in vault');
    }

    // Get encrypted data and decode from base64
    const encryptedData = Buffer.from(vault[keyName], 'base64');

    // Determine expected salt length (same as when encrypting)
    const saltSource = process.env.CRYPTO_SALT || STATIC_SALT;
    const saltLength = Buffer.from(saltSource, 'utf8').length;

    // Extract the components in order
    const salt = encryptedData.slice(0, saltLength);
    const iv = encryptedData.slice(saltLength, saltLength + 12);
    const authTag = encryptedData.slice(saltLength + 12, saltLength + 12 + 16);
    const ciphertext = encryptedData.slice(saltLength + 12 + 16);

    // Derive the key for decryption using the extracted salt
    const decKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

    // Decrypt using AES-256-GCM
    const decipher = crypto.createDecipheriv('aes-256-gcm', decKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Error decrypting value:', error);
    return null;
  }
};

// Example usage of the vault functions
if (encryptVal('exampleKey', 'My vault secret', password)) {
  console.log('Value encrypted and saved successfully.');
  const vaultDecrypted = decryptVal('exampleKey', password);
  console.log(`Vault decrypted value: ${vaultDecrypted}`);
}
