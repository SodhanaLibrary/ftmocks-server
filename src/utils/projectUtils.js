const fs = require('fs');
const path = require('path');

const addUrlToProject = async (url) => {
  const projectsFile = path.resolve('projects.json');

  try {
    // Read projects.json
    let projects = [];
    if (fs.existsSync(projectsFile)) {
      const data = fs.readFileSync(projectsFile, 'utf8');
      projects = JSON.parse(data);
    }

    // Ensure urls array exists
    if (!Array.isArray(projects[0].urls)) {
      projects[0].urls = [];
    }
    // Remove the url if it already exists
    projects[0].urls = projects[0].urls.filter((u) => u !== url);
    // Add the url to the top
    projects[0].urls.unshift(url);

    // Write back to projects.json
    fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 2));
  } catch (err) {
    // Optionally handle error, or rethrow
    throw err;
  }
};

const getLatestProjectUrls = () => {
  const projectsFile = path.resolve('projects.json');
  const projects = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
  return projects[0].urls;
};

module.exports = {
  addUrlToProject,
  getLatestProjectUrls,
};
