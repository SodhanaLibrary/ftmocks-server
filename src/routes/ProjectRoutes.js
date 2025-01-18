const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const getRecordedProjects = async (req, res) => {
  const defaultPath = 'projects.json';

  try {
    const defaultData = fs.readFileSync(defaultPath, 'utf8');
    let parsedData = JSON.parse(defaultData);
    
    res.status(200).json(parsedData);
  } catch (error) {
    console.error(`Error reading or parsing default.json:`, error);
    res.status(200).json([]);
  }
};

const switchProject = async (req, res) => {
    const project_env_file = req.body.env_file;
    if(fs.existsSync(project_env_file)) {
        const result = require("dotenv").config({path: project_env_file});
        process.env.MOCK_DIR = result.parsed.MOCK_DIR;
        console.log(process.env.MOCK_DIR);
        if(!path.isAbsolute(process.env.MOCK_DIR)) {
            process.env.MOCK_DIR = path.resolve(path.dirname(project_env_file), process.env.MOCK_DIR);
            console.log('absolute path MOCK_DIR', process.env.MOCK_DIR );
        }
        res.status(200).json({message: 'env file loaded successfully'});
    } else {
        console.error(`Error reading or env file:`, project_env_file);
        res.status(404).json('File not found');
    }
};

module.exports = {
    getRecordedProjects,
    switchProject
};
