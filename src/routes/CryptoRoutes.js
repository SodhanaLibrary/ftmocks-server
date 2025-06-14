const { encryptVal, decryptVal } = require('../utils/Crypto');

const encrypt = async (req, res) => {
  const { key, value, password } = req.body;

  if (!key || !value || !password) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const success = encryptVal(key, value, password);

  if (success) {
    res.status(200).json({ message: 'Value encrypted successfully' });
  } else {
    res.status(500).json({ error: 'Error encrypting value' });
  }
};

const decrypt = async (req, res) => {
  const { key, password } = req.body;

  if (!key || !password) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const decrypted = decryptVal(key, password);

  if (decrypted) {
    res.status(200).json({ value: decrypted });
  } else {
    res.status(500).json({ error: 'Error decrypting value' });
  }
};

const listKeys = async (req, res) => {
  try {
    const vaultPath = path.join(__dirname, '../utils/vault.json');

    if (!fs.existsSync(vaultPath)) {
      return res.status(200).json({ keys: [] });
    }

    const vaultContent = fs.readFileSync(vaultPath, 'utf8');
    const vault = JSON.parse(vaultContent);

    res.status(200).json({ keys: Object.keys(vault) });
  } catch (error) {
    res.status(500).json({ error: 'Error listing keys' });
  }
};

module.exports = {
  encrypt,
  decrypt,
  listKeys,
};
