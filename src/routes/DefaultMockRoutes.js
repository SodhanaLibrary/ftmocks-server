const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { processHAR } = require('../utils/MockGenerator');


const getDefaultMocks = async (req, res) => {
    const defaultPath = process.env.MOCK_DIR+'/'+process.env.MOCK_DEFAULT_FILE;
  
    try {
      if(!fs.existsSync(defaultPath)) {
        await fs.appendFile(defaultPath, '[]', () => {
          console.log('default file created successfully')
        })
      }
      const defaultData = fs.readFileSync(defaultPath, 'utf8');
      let parsedData = JSON.parse(defaultData);
      
      // Read and attach mock data for each entry in parsedData
      parsedData = parsedData.map(entry => {
        const mockFilePath = entry.path;
        try {
          const mockData = fs.readFileSync(mockFilePath, 'utf8');
          return {
            ...entry,
            mockData: JSON.parse(mockData)
          };
        } catch (error) {
          console.error(`Error reading mock data for ${entry.path}:`, error);
          return entry; // Return the original entry if there's an error
        }
      });
      res.status(200).json(parsedData);
    } catch (error) {
      console.error(`Error reading or parsing ${process.env.MOCK_DEFAULT_FILE}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  const deleteDefaultMock = async (req, res) => {
    const mockId = req.params.id;
    const defaultPath = process.env.MOCK_DIR+'/'+process.env.MOCK_DEFAULT_FILE;
  
    try {
      // Read and parse the process.env.MOCK_DEFAULT_FILE file
      let defaultData = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
  
      // Find the index of the mock to be deleted
      const mockIndex = defaultData.findIndex(mock => mock.id === mockId);
  
      if (mockIndex === -1) {
        return res.status(404).json({ error: 'Mock not found' });
      }
  
      // Get the file path of the mock to be deleted
      const mockFilePath = defaultData[mockIndex].path;
  
      // Remove the mock from the array
      defaultData.splice(mockIndex, 1);
  
      // Write the updated data back to process.env.MOCK_DEFAULT_FILE
      fs.writeFileSync(defaultPath, JSON.stringify(defaultData, null, 2));
  
      // Delete the associated mock file
      fs.unlinkSync(mockFilePath);
  
      res.status(200).json({ message: 'Mock deleted successfully' });
    } catch (error) {
      console.error('Error deleting mock:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  const updateDefaultMock = async (req, res) => {
    const { id } = req.params;
    const updatedMockData = req.body;
  
    try {
      const mockFilePath = path.join(process.env.MOCK_DIR, 'defaultMocks', `mock_${id}.json`);
      updatedMockData.id = id;
      fs.writeFileSync(mockFilePath, JSON.stringify(updatedMockData, null, 2));
      res.json(updatedMockData);
    } catch (error) {
      console.error('Error updating mock data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  const uploadDefaultHarMocs = async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No HAR file uploaded' });
    }
  
    try {
      const harFilePath = req.file.path;
      
      await processHAR(harFilePath, process.env.MOCK_DIR, process.env.MOCK_DEFAULT_FILE);
  
      // Clean up the uploaded file
      fs.unlinkSync(harFilePath);
  
      res.status(200).json({ message: 'HAR file processed successfully' });
    } catch (error) {
      console.error('Error processing HAR file:', error);
      res.status(500).json({ error: 'Failed to process HAR file' });
    }
  };

  const recordMockData = async (req, res) => {
    const mockData = req.body;
    let  mockDataSummary = [];
    
    try {
      mockData.id = uuidv4();
      const mockDir = path.join(process.env.MOCK_DIR, 'recordMocks');
      const mockListFilePath = path.join(mockDir, `_mock_list.json`);
      const mockFilePath = path.join(mockDir, `mock_${mockData.id}.json`);
      if (!fs.existsSync(mockDir)){
        fs.mkdirSync(mockDir);
      }
      if(!fs.existsSync(mockListFilePath)) {
        await fs.appendFile(mockListFilePath, '[]', () => {
          console.log('list file created successfully')
        });
        mockDataSummary = [];
      } else {
        mockDataSummary = JSON.parse(fs.readFileSync(mockListFilePath, 'utf8'));
      }
      mockDataSummary.push([{
          "fileName": `mock_${mockData.id}.json`,
          "method": mockData.method,
          "path": mockFilePath,
          "url": mockData.url,
          "id": mockData.id
      }]);
      fs.writeFileSync(mockFilePath, JSON.stringify(mockData, null, 2));
      fs.writeFileSync(mockListFilePath, JSON.stringify(mockDataSummary, null, 2));
      res.json(mockData);
    } catch (error) {
      console.error('Error updating mock data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }



module.exports = {
    getDefaultMocks,
    deleteDefaultMock,
    updateDefaultMock,
    uploadDefaultHarMocs,
    recordMockData
};