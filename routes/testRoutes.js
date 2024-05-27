const express = require("express");
const {
  ComputerVisionClient,
} = require("@azure/cognitiveservices-computervision");
const { CognitiveServicesCredentials } = require("@azure/ms-rest-azure-js");
const Test = require("../models/Test");
const User = require("../models/User");
const upload = require("../utils/multerConfig");
const { isAuthenticated } = require("./middleware/authMiddleware");

const router = express.Router();

// Azure Computer Vision setup
const key = process.env.AZURE_COMPUTER_VISION_KEY;
const endpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT;
const credentials = new CognitiveServicesCredentials(key);
const client = new ComputerVisionClient(credentials, endpoint);

// Route to upload test photo
router.post(
  "/upload-test",
  isAuthenticated,
  upload.single("testPhoto"),
  async (req, res) => {
    try {
      const userID = req.body.userID;
      const testPhoto = req.file.path;

      // Analyze the test photo using Azure Computer Vision
      const imageAnalysis = await client.analyzeImageInStream(testPhoto, {
        visualFeatures: ["Description"],
      });

      // Determine test result based on image analysis (placeholder logic)
      let testResult = "negative";
      if (
        imageAnalysis.description.captions.some((caption) =>
          caption.text.includes("SCD")
        )
      ) {
        testResult = "SCD";
      } else if (
        imageAnalysis.description.captions.some((caption) =>
          caption.text.includes("trait")
        )
      ) {
        testResult = "trait";
      }

      // Save test result to the database
      const test = new Test({
        userID,
        testPhoto,
        testResult,
      });
      await test.save();

      console.log("Test photo uploaded and analyzed successfully:", test);
      res.json({
        message: "Test photo uploaded and analyzed successfully.",
        testResult,
      });
    } catch (error) {
      console.error("Error uploading and analyzing test photo:", error.message);
      console.error(error.stack);
      res.status(500).send(error.message);
    }
  }
);

module.exports = router;
