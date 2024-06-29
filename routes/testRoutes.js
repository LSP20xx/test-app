// const express = require("express");
// const {
//   ComputerVisionClient,
// } = require("@azure/cognitiveservices-computervision");
// const { CognitiveServicesCredentials } = require("@azure/ms-rest-azure-js");
// const Test = require("../models/Test");
// const User = require("../models/User");
// const upload = require("../utils/multerConfig");
// const { isAuthenticated } = require("./middleware/authMiddleware");

// const router = express.Router();

// // Azure Computer Vision setup
// const key = process.env.AZURE_COMPUTER_VISION_KEY;
// const endpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT;
// const credentials = new CognitiveServicesCredentials(key);
// const client = new ComputerVisionClient(credentials, endpoint);

// // Route to upload test photo
// router.post(
//   "/upload-test",
//   isAuthenticated,
//   upload.single("testPhoto"),
//   async (req, res) => {
//     try {
//       const userID = req.body.userID;
//       const testPhoto = req.file.path;

//       // Analyze the test photo using Azure Computer Vision
//       const imageAnalysis = await client.analyzeImageInStream(testPhoto, {
//         visualFeatures: ["Description"],
//       });

//       // Determine test result based on image analysis (placeholder logic)
//       let testResult = "negative";
//       if (
//         imageAnalysis.description.captions.some((caption) =>
//           caption.text.includes("SCD")
//         )
//       ) {
//         testResult = "SCD";
//       } else if (
//         imageAnalysis.description.captions.some((caption) =>
//           caption.text.includes("trait")
//         )
//       ) {
//         testResult = "trait";
//       }

//       // Save test result to the database
//       const test = new Test({
//         userID,
//         testPhoto,
//         testResult,
//       });
//       await test.save();

//       console.log("Test photo uploaded and analyzed successfully:", test);
//       res.json({
//         message: "Test photo uploaded and analyzed successfully.",
//         testResult,
//       });
//     } catch (error) {
//       console.error("Error uploading and analyzing test photo:", error.message);
//       console.error(error.stack);
//       res.status(500).send(error.message);
//     }
//   }
// );

// module.exports = router;

const express = require('express');
const router = express.Router();
const Test = require('../models/Test');
const { isAuthenticated } = require('./middleware/authMiddleware');

// Create a new test
router.post('/create-test', isAuthenticated, async (req, res) => {
  const { userID, testPhoto1, testPhoto2, testResult } = req.body;

  if (!userID || !testPhoto1) {
    return res.status(400).json({ message: 'userID and testPhoto1 are required' });
  }

  try {
    const newTest = new Test({ userID, testPhoto1, testPhoto2, testResult });
    await newTest.save();
    console.log("test creado")
    res.status(201).json(newTest);
  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({ message: 'Error creating test' });
  }
});

// Get all tests for a specific user
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

// Get a single test by ID
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

// Update a test by ID
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

// Delete a test by ID
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