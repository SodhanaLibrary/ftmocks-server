const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const getLatestVersions = async (req, res) => {
  try {
    console.log(path.join(__dirname, '../../package.json'));
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
    const localVersion = packageJson.version;
    const remotePackageJson = execSync('git show origin/main:package.json').toString();
    const remoteVersion = JSON.parse(remotePackageJson).version;

    res.status(200).json({
        localVersion,
        remoteVersion,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateLatestVersions = async (req, res) => {
  try {
    execSync('git pull origin main', { stdio: 'inherit' });
    res.status(200).json({
        status: 'success',
        message: 'Updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getLatestVersions,
  updateLatestVersions
};
