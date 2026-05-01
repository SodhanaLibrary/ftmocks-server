const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('./Logger');

// Default salt for PBKDF2 (override with CRYPTO_SALT in production).
const STATIC_SALT = 'salt_for_encryption';

const encryptVal = (keyName, value, password) => {
  try {
    logger.info('Encrypting value for vault', {
      keyName,
      valueLength: value.toString().length,
      hasPassword: !!password,
    });

    // Allow an environment salt override; ensure we work with it as a Buffer.
    const saltSource = process.env.CRYPTO_SALT || STATIC_SALT;
    const saltBuffer = Buffer.from(saltSource, 'utf8');

    logger.debug('Using salt for encryption', {
      saltSource: saltSource === STATIC_SALT ? 'STATIC_SALT' : 'CRYPTO_SALT',
      saltLength: saltBuffer.length,
    });

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

    logger.debug('Generated encryption components', {
      keyLength: encKey.length,
      ivLength: iv.length,
    });

    // Encrypt the value (convert to string if necessary)
    const cipher = crypto.createCipheriv('aes-256-gcm', encKey, iv);
    let encrypted = cipher.update(value.toString(), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    logger.debug('Encryption completed', {
      encryptedLength: encrypted.length,
      authTagLength: authTag.length,
    });

    // Combine salt, IV, authTag, and ciphertext into one Buffer then encode in base64
    const encryptedData = Buffer.concat([
      saltBuffer,
      iv,
      authTag,
      Buffer.from(encrypted, 'hex'),
    ]).toString('base64');

    // Read existing vault or create new one
    const vaultPath = path.join(process.env.MOCK_DIR, 'vault.json');
    let vault = {};

    logger.debug('Reading vault file', { vaultPath });

    if (fs.existsSync(vaultPath)) {
      const vaultContent = fs.readFileSync(vaultPath, 'utf8');
      vault = JSON.parse(vaultContent);
      logger.debug('Loaded existing vault', {
        existingKeys: Object.keys(vault).length,
      });
    } else {
      logger.info('Vault file does not exist, creating new vault', {
        vaultPath,
      });
    }

    // Add new encrypted value using the provided keyName
    const existingKey = vault[keyName];
    vault[keyName] = encryptedData;

    logger.debug('Updated vault with encrypted value', {
      keyName,
      wasExistingKey: !!existingKey,
      totalKeys: Object.keys(vault).length,
    });

    // Save back to vault.json
    fs.writeFileSync(vaultPath, JSON.stringify(vault, null, 2));

    logger.info('Value encrypted and saved to vault successfully', {
      keyName,
      vaultPath,
      encryptedDataLength: encryptedData.length,
    });

    return true;
  } catch (error) {
    logger.error('Error encrypting value', {
      keyName,
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
};

const decryptVal = (keyName, password) => {
  try {
    logger.info('Decrypting value from vault', {
      keyName,
      hasPassword: !!password,
    });

    // Read from vault.json
    const vaultPath = path.join(process.env.MOCK_DIR, 'vault.json');

    logger.debug('Reading vault file for decryption', { vaultPath });

    if (!fs.existsSync(vaultPath)) {
      logger.warn('Vault file not found for decryption', { vaultPath });
      throw new Error('Vault file not found');
    }

    const vaultContent = fs.readFileSync(vaultPath, 'utf8');
    const vault = JSON.parse(vaultContent);

    logger.debug('Loaded vault for decryption', {
      totalKeys: Object.keys(vault).length,
    });

    if (!vault[keyName]) {
      logger.warn('Key not found in vault', {
        keyName,
        availableKeys: Object.keys(vault),
      });
      throw new Error('Key not found in vault');
    }

    // Get encrypted data and decode from base64
    const encryptedData = Buffer.from(vault[keyName], 'base64');

    logger.debug('Decoded encrypted data from base64', {
      keyName,
      encryptedDataLength: encryptedData.length,
    });

    // Determine expected salt length (same as when encrypting)
    const saltSource = process.env.CRYPTO_SALT || STATIC_SALT;
    const saltLength = Buffer.from(saltSource, 'utf8').length;

    logger.debug('Using salt for decryption', {
      saltSource: saltSource === STATIC_SALT ? 'STATIC_SALT' : 'CRYPTO_SALT',
      saltLength,
    });

    // Extract the components in order
    const salt = encryptedData.slice(0, saltLength);
    const iv = encryptedData.slice(saltLength, saltLength + 12);
    const authTag = encryptedData.slice(saltLength + 12, saltLength + 12 + 16);
    const ciphertext = encryptedData.slice(saltLength + 12 + 16);

    logger.debug('Extracted encryption components', {
      saltLength: salt.length,
      ivLength: iv.length,
      authTagLength: authTag.length,
      ciphertextLength: ciphertext.length,
    });

    // Derive the key for decryption using the extracted salt
    const decKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

    // Decrypt using AES-256-GCM
    const decipher = crypto.createDecipheriv('aes-256-gcm', decKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    logger.info('Value decrypted successfully', {
      keyName,
      decryptedLength: decrypted.length,
    });

    return decrypted;
  } catch (error) {
    logger.error('Error decrypting value', {
      keyName,
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
};

module.exports = {
  encryptVal,
  decryptVal,
};
