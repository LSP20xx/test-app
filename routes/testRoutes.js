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
// Configuración de multer para almacenar en memoria

const memoryStorage = multer.memoryStorage();
const memoryUpload = multer({ storage: memoryStorage });

// Configuración de multer para almacenar en disco
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: diskStorage });
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

// router.post('/tests/upload-test', upload.single('testPhoto'), async (req, res) => {
//   try {
//     const userID = req.body.userID;
//     const testPhoto = req.file.path;

//     if (!testPhoto) {
//       return res.status(400).json({ message: 'Test photo is required' });
//     }

//     const imageBuffer = fs.readFileSync(testPhoto);
//     const imageBase64 = imageBuffer.toString('base64');

//     const auth = new GoogleAuth({
//       keyFilename: '/home/lsp20xx/test-app/credentials/google-document-ai.json',
//       scopes: 'https://www.googleapis.com/auth/cloud-platform',
//     });
//     const client = await auth.getClient();
//     const projectId = await auth.getProjectId();
//     console.log('Project ID:', projectId); // Verificar el Project ID
//     const accessToken = await client.getAccessToken();

//     const endpoint = 'europe-west4-aiplatform.googleapis.com';
//     const endpointId = '2982064650528489472'; // Usando el ID del endpoint de la imagen
//     const location = 'europe-west4';

//     const url = `https://${endpoint}/v1/projects/${projectId}/locations/${location}/endpoints/${endpointId}:predict`;
//     console.log('Request URL:', url); // Verificar la URL del endpoint

//     const payload = {
//       instances: [
//         {
//           content: imageBase64,
//         },
//       ],
//     };

//     const response = await axios.post(url, payload, {
//       headers: {
//         Authorization: `Bearer ${accessToken.token}`,
//         'Content-Type': 'application/json',
//       },
//     });

//     const predictions = response.data.predictions;
//     console.log('Predictions:', predictions);

//     res.json({
//       message: 'Test photo uploaded and analyzed successfully.',
//       predictions,
//     });
//   } catch (error) {
//     console.error('Error processing the image:', error.response ? error.response.data : error.message);
//     res.status(500).send(`Error processing the image: ${error.message}`);
//   }
// });

const expectedResults = {
  "C": "No Blood Samples",
  "C,HbA": "HbAA",
  "C,HbA,HbS": "HbAS",
  "C,HbS,HbS": "HbSS",
  "C,HbA,HbC": "HbAC",
  "C,HbS,HbC": "HbSC"
};

const resultDescriptions = {
  "No Blood Samples": "If both the quality control C line appear, it means that no blood samples have been detected.",
  "HbAA": "If both the quality control C line and hemoglobin A detection line appear, it means that only hemoglobin A has been detected, and the result is no Sickle Cell Disease.",
  "HbAS": "If both the quality control C line, hemoglobin A detection line and hemoglobin S detection line appear, it means that hemoglobin A and hemoglobin S have been detected, and the result is Sickle Cell Trait (HbAS).",
  "HbSS": "If both the quality control C line and hemoglobin S detection line appear, it means that only hemoglobin S has been detected, and the result is Sickle Cell Disease (HbSS).",
  "HbAC": "If the quality control C line, hemoglobin A detection line and hemoglobin C detection line appear, it means that hemoglobin A and hemoglobin C have been detected, and the result is Sickle-Hb C Trait (HbAC).",
  "HbSC": "If the quality control C line, hemoglobin S detection line and hemoglobin C detection line appear, it means that hemoglobin S and hemoglobin C have been detected, and the result is Sickle-Hb C Disease (HbSC)."
};

const invalidResults = [
  ["HbA"],
  ["HbA", "HbS"],
  ["HbS"],
  ["HbA", "HbC"],
  ["HbS", "HbC"],
  []
];

router.post('/create-test', isAuthenticated, upload.single('testPhoto1'), async (req, res) => {
  const { institutionId, userOfInstitutionId } = req.body;
  const testPhoto1 = req.file;

  console.log('Received request:', req.body);
  console.log('Received file:', testPhoto1);

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
      testPhoto1: testPhoto1.path,
      institutionId,
    });

    // Leer el archivo desde el disco
    const fileBuffer = fs.readFileSync(testPhoto1.path);

    // Redimensionar y comprimir la imagen usando sharp desde el buffer
    const resizedImageBuffer = await sharp(fileBuffer)
      .resize(1024)
      .jpeg({ quality: 80 })
      .toBuffer();

    // Convertir la imagen a Base64
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
    const endpointId = '6938054710708404224'; 
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

    console.log('Response data:', response.data);

    const predictions = response.data.predictions[0];
    console.log('predictions', predictions);

    // Filtrar las predicciones con una confianza mayor a 0.8
    const filteredPredictions = predictions.displayNames.map((name, index) => {
      return {
        displayName: name,
        confidence: predictions.confidences[index],
      };
    }).filter(prediction => prediction.confidence > 0.8);

    console.log('Filtered Predictions:', filteredPredictions);

    // Obtener los nombres de las predicciones
    const predictionNames = filteredPredictions.map(prediction => prediction.displayName).sort();

    // Convertir las predicciones a una cadena ordenada
    const predictionString = predictionNames.join(',');

    // Verificar si el resultado es inválido
    let isValid = !invalidResults.some(invalid => {
      invalid.sort();
      return invalid.join(',') === predictionString;
    });

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid test result detected' });
    }

    // Verificar si el resultado es válido
    let validResult = expectedResults[predictionString];

    if (!validResult) {
      return res.status(400).json({ message: 'Unexpected test result' });
    }

    // Almacenar los resultados filtrados en el documento de Test
    newTest.testResult = validResult; // Ahora solo se guarda el valor, no la descripción completa
    newTest.predictions = filteredPredictions;

    await newTest.save();

    console.log('New Test Saved:', newTest);

    res.status(201).json({
      message: 'Test created and analyzed successfully.',
      test: newTest,
      description: resultDescriptions[validResult] // Se incluye la descripción en la respuesta
    });
  } catch (error) {
    console.error('Error creating and analyzing test:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: `Error creating and analyzing test: ${error.message}` });
  }
});

router.get('/get-user-tests/:userID', async (req, res) => {
  const { userID } = req.params;

  try {
    const tests = await Test.find({ userID }).populate('userID');
    res.status(200).json(tests);
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ message: 'Error fetching tests' });
  }
});

router.get('/tests/:id', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving test' });
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
