const express = require('express');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const Test = require('../models/Test');
const { isAuthenticated } = require('./middleware/authMiddleware');
const { mongoose } = require('mongoose');
const sharp = require('sharp');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

const determineTestResult = (detectedText) => {
  const text = detectedText.toLowerCase();
  if (text.includes('positive')) {
    return 'Positive';
  } else if (text.includes('negative')) {
    return 'Negative';
  } else if (text.includes('invalid')) {
    return 'Invalid';
  } else {
    return 'Uncertain';
  }
};

router.post('/tests/upload-test', upload.single('testPhoto'), async (req, res) => {
  try {
    const userID = req.body.userID;
    const testPhoto = req.file.path;

    if (!testPhoto) {
      return res.status(400).json({ message: 'Test photo is required' });
    }

    const imageBuffer = fs.readFileSync(testPhoto);
    const imageBase64 = imageBuffer.toString('base64');

    const auth = new GoogleAuth({
      keyFilename: '/home/lsp20xx/test-app/credentials/google-document-ai.json',
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    console.log('Project ID:', projectId); // Verificar el Project ID
    const accessToken = await client.getAccessToken();

    const endpoint = 'europe-west4-aiplatform.googleapis.com';
    const endpointId = '2982064650528489472'; // Usando el ID del endpoint de la imagen
    const location = 'europe-west4';

    const url = `https://${endpoint}/v1/projects/${projectId}/locations/${location}/endpoints/${endpointId}:predict`;
    console.log('Request URL:', url); // Verificar la URL del endpoint

    const payload = {
      instances: [
        {
          content: imageBase64,
        },
      ],
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
    });

    const predictions = response.data.predictions;
    console.log('Predictions:', predictions);

    res.json({
      message: 'Test photo uploaded and analyzed successfully.',
      predictions,
    });
  } catch (error) {
    console.error('Error processing the image:', error.response ? error.response.data : error.message);
    res.status(500).send(`Error processing the image: ${error.message}`);
  }
});

router.post('/create-test', isAuthenticated, upload.single('testPhoto1'), async (req, res) => {
  const { institutionId, userOfInstitutionId, testResult } = req.body;
  const testPhoto1 = req.file;

  if (!institutionId || !userOfInstitutionId || !testPhoto1) {
    return res.status(400).json({ message: 'institutionId, userOfInstitutionId and testPhoto1 are required' });
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(userOfInstitutionId)) {
      return res.status(400).json({ message: 'Invalid userOfInstitutionId' });
    }
    
    const userID = new mongoose.Types.ObjectId(userOfInstitutionId);

    const newTest = new Test({
      userID,
      testPhoto1: testPhoto1.path, // Asegúrate de que el archivo se guarde correctamente
      testResult,
      institutionId,
    });
    
    await newTest.save();

    // Redimensionar y comprimir la imagen usando sharp desde el buffer
    const resizedImageBuffer = await sharp(testPhoto1.buffer)
      .resize(1024) // Cambia el tamaño según tus necesidades
      .jpeg({ quality: 80 }) // Ajusta la calidad según tus necesidades
      .toBuffer();

    const imageBase64 = resizedImageBuffer.toString('base64');

    // Configurar Google Auth
    const auth = new GoogleAuth({
      keyFilename: '/home/lsp20xx/test-app/credentials/google-document-ai.json',
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    const accessToken = await client.getAccessToken();

    // Configurar la solicitud al endpoint de Google AI
    const endpoint = 'europe-west4-aiplatform.googleapis.com';
    const endpointId = '2982064650528489472'; // Usando el ID del endpoint de la imagen
    const location = 'europe-west4';

    const url = `https://${endpoint}/v1/projects/${projectId}/locations/${location}/endpoints/${endpointId}:predict`;

    const payload = {
      instances: [
        {
          content: imageBase64,
        },
      ],
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
    });

    const predictions = response.data.predictions;

    res.status(201).json({
      message: 'Test created and analyzed successfully.',
      test: newTest,
      predictions,
    });
  } catch (error) {
    console.error('Error creating and analyzing test:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: `Error creating and analyzing test: ${error.message}` });
  }
});

router.get('/get-user-tests/:userID', isAuthenticated, async (req, res) => {
  const { userID } = req.params;

  try {
    const tests = await Test.find({ userID }).populate('userID');
    res.status(200).json(tests);
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ message: 'Error fetching tests' });
  }
});

router.get('/get-test-by-test-id/:id', isAuthenticated, async (req, res) => {
  const { id } = req.params;

  try {
    const test = await Test.findById(id).populate('userID');
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    res.status(200).json(test);
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({ message: 'Error fetching test' });
  }
});

router.put('/update-test-by-test-id/:id', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { testPhoto1, testPhoto2, testResult, resultSent } = req.body;

  try {
    const test = await Test.findById(id);
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    if (testPhoto1) test.testPhoto1 = testPhoto1;
    if (testPhoto2) test.testPhoto2 = testPhoto2;
    if (testResult) test.testResult = testResult;
    if (resultSent !== undefined) test.resultSent = resultSent;

    await test.save();
    res.status(200).json(test);
  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({ message: 'Error updating test' });
  }
});

router.delete('/delete-test-by-test-id/:id', isAuthenticated, async (req, res) => {
  const { id } = req.params;

  try {
    const test = await Test.findByIdAndDelete(id);
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    res.status(200).json({ message: 'Test deleted successfully' });
  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({ message: 'Error deleting test' });
  }
});

module.exports = router;
