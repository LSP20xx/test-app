require("dotenv").config(); // Load environment variables from .env file
const express = require("express");
const { DocumentProcessorServiceClient } = require("@google-cloud/documentai").v1;
const Identification = require("../models/Identification");
const multer = require("multer");
const fs = require("fs");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

const client = new DocumentProcessorServiceClient({
  apiEndpoint: "eu-documentai.googleapis.com",
});

const extractDataFromEntities = (entities) => {
  const data = {};
  entities.forEach(entity => {
    switch (entity.type) {
      case 'name':
        data.name = toPascalCaseWithSpace(entity.mentionText);
        break;
      case 'surname':
        data.surname = toPascalCaseWithSpace(entity.mentionText);
        break;
      case 'document':
        data.idNumber = entity.mentionText;
        break;
      case 'nationality':
        data.nationality = toPascalCaseWithSpace(entity.mentionText);
        break;
      case 'dateOfBirth':
        const { year, month, day } = entity.normalizedValue.dateValue;
        data.dateOfBirth = new Date(year, month - 1, day);
        break;
      default:
        break;
    }
  });
  return data;
};

const validateData = (data) => {
  return data.name && data.idNumber && data.nationality;
};

function toPascalCaseWithSpace(str) {
  if (!str) {
    return '';
  }
  return str
    .toLowerCase()               
    .split(/[\s_]+/)             
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) 
    .join(' ');                  
}

router.post("/scan-id", upload.single("imageUrl"), async (req, res) => {
  const { userId, cameraType } = req.body;
  const imageUrl = req.file;

  console.log("userId", userId);
  console.log("cameraType", cameraType);
  console.log("imageUrl", imageUrl);

  try {
    if (!imageUrl) {
      return res.status(400).json({ message: "Image URL is required" });
    }

    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/tiff",
      "image/gif",
      "image/bmp",
      "application/pdf",
    ];
    if (!allowedMimeTypes.includes(imageUrl.mimetype)) {
      return res.status(400).json({ message: "Invalid image format" });
    }

    const projectId = process.env.GOOGLE_DOCUMENT_AI_PROJECT_ID;
    const location = "eu";
    const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCCESOR_ID;

    if (!projectId || !processorId) {
      return res.status(500).json({
        message: "Missing environment variables for project ID or processor ID",
      });
    }

    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
    const imageBuffer = fs.readFileSync(imageUrl.path);
    const encodedImage = imageBuffer.toString("base64");

    const request = {
      name,
      rawDocument: {
        content: encodedImage,
        mimeType: imageUrl.mimetype,
      },
    };

    console.log("Request details: ", {
      name: request.name,
      contentLength: request.rawDocument.content.length,
      mimeType: request.rawDocument.mimeType,
    });

    try {
      const [result] = await client.processDocument(request);
      console.log("result", result);
      console.log("result.document.entities", result.document?.entities);

      if (result.document.error) {
        return res.status(500).json({
          message: `Document processing error: ${result.document.error.message}`,
        });
      }

      // Check for fraud signals if present
      let fraudSignals = null;
      if (result.document.fraudSignals) {
        fraudSignals = result.document.fraudSignals;
        console.log("Fraud signals detected:", fraudSignals);
        return res.status(400).json({ message: "Fraud signals detected", fraudSignals });
      } else {
        console.log("No fraud signals detected.");
      }

      const entities = result.document.entities;
      const extractedData = extractDataFromEntities(entities);

      console.log("extractedData", extractedData);

      // Find existing identification record for the user
      let existingIdentification = await Identification.findOne({ userID: userId });

      if (existingIdentification) {
        // Update only if fields are not already present
        if (cameraType === "FRONT") {
          existingIdentification.governmentIDFrontPhoto = imageUrl.path;
          existingIdentification.governmentIDFrontCompleteExtractedText = result.document.text;
          existingIdentification.name = toPascalCaseWithSpace(existingIdentification.name) || extractedData.name;
          existingIdentification.surname = toPascalCaseWithSpace(existingIdentification.surname) || extractedData.surname;
          existingIdentification.idNumber = existingIdentification.idNumber || extractedData.idNumber;
          existingIdentification.nationality = toPascalCaseWithSpace(existingIdentification.nationality) || extractedData.nationality;
          existingIdentification.dateOfBirth = existingIdentification.dateOfBirth || extractedData.dateOfBirth;

          if (!validateData(extractedData)) {
            return res.status(400).json({ message: "Extracted data is not valid" });
          }
        } else if (cameraType === "BACK") {
          existingIdentification.governmentIDBackPhoto = imageUrl.path;
          existingIdentification.governmentIDBackCompleteExtractedText = result.document.text;
        }
      } else {
        existingIdentification = new Identification({
          userID: userId,
          ...extractedData,
          governmentIDFrontPhoto: cameraType === "FRONT" ? imageUrl.path : "",
          governmentIDBackPhoto: cameraType === "BACK" ? imageUrl.path : "",
          governmentIDFrontCompleteExtractedText: cameraType === "FRONT" ? result.document.text : "",
          governmentIDBackCompleteExtractedText: cameraType === "BACK" ? result.document.text : "",
        });

        if (cameraType === "FRONT" && !validateData(extractedData)) {
          return res.status(400).json({ message: "Extracted data is not valid" });
        }
      }

      await existingIdentification.save();

      res.json({
        message: "Document scanned and stored successfully",
        data: extractedData,
        fraudSignals,
      });
    } catch (error) {
      console.error("API Error details:", error);
      res.status(500).send(`Error processing the document: ${error.message}`);
    }
  } catch (error) {
    console.error("General Error details:", error);
    res.status(500).send("Error scanning the ID document");
  }
});

module.exports = router;
