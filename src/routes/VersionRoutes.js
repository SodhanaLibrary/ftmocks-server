const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const logger = require('../utils/Logger');

const getLatestVersions = async (req, res) => {
  try {
    logger.info('Getting latest versions');

    const packageJsonPath = path.join(__dirname, '../../package.json');
    logger.debug('Reading package.json', { packageJsonPath });

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const localVersion = packageJson.version;

    logger.debug('Retrieved local version', { localVersion });

    logger.debug('Executing git command to get remote package.json');
    const remotePackageJson = execSync(
      'git show origin/main:package.json'
    ).toString();
    const remoteVersion = JSON.parse(remotePackageJson).version;

    logger.debug('Retrieved remote version', { remoteVersion });

    const versionComparison = {
      localVersion,
      remoteVersion,
      isUpToDate: localVersion === remoteVersion,
      needsUpdate: localVersion !== remoteVersion,
    };

    logger.info('Version comparison completed', versionComparison);

    res.status(200).json({
      localVersion,
      remoteVersion,
    });
  } catch (error) {
    logger.error('Error getting latest versions', {
      error: error.message,
      stack: error.stack,
      command: 'git show origin/main:package.json',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateLatestVersions = async (req, res) => {
  try {
    logger.info('Updating to latest version');

    logger.debug('Executing git pull command');
    const gitCommand = 'git pull origin main';

    logger.debug('Git pull command details', {
      command: gitCommand,
      stdio: 'inherit',
    });

    execSync(gitCommand, { stdio: 'inherit' });

    logger.info('Git pull completed successfully');

    // Verify the update by checking the new version
    try {
      const packageJsonPath = path.join(__dirname, '../../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const updatedVersion = packageJson.version;

      logger.info('Version update verification', {
        updatedVersion,
        updateStatus: 'success',
      });

      res.status(200).json({
        status: 'success',
        message: 'Updated successfully',
        version: updatedVersion,
      });
    } catch (verificationError) {
      logger.warn('Could not verify updated version', {
        error: verificationError.message,
      });

      res.status(200).json({
        status: 'success',
        message: 'Updated successfully',
        note: 'Version verification failed',
      });
    }
  } catch (error) {
    logger.error('Error updating to latest version', {
      error: error.message,
      stack: error.stack,
      command: 'git pull origin main',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getLatestVersions,
  updateLatestVersions,
};
