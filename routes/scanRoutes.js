require("dotenv").config(); // Load environment variables from .env file
const express = require("express");
const { DocumentProcessorServiceClient } =
  require("@google-cloud/documentai").v1;
const Identification = require("../models/Identification");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Set up multer to save uploaded files to a specific directory
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

const extractDataFromText = (text) => {
  const namePattern = /Nombre\s*\/\s*Name\s*(.*)/i;
  const surnamePattern = /Apellido\s*\/\s*Surname\s*(.*)/i;
  const idNumberPattern = /Document\s*:\s*([^\s:]+)/i;
  const nationalityPattern = /Nacionalidad\s*\/\s*Nationality\s*(.*)/i;

  const nameMatch = text.match(namePattern);
  const surnameMatch = text.match(surnamePattern);
  const idNumberMatch = text.match(idNumberPattern);
  const nationalityMatch = text.match(nationalityPattern);

  const name = nameMatch ? nameMatch[1].trim() : null;
  const surname = surnameMatch ? surnameMatch[1].trim() : null;
  const idNumber = idNumberMatch ? idNumberMatch[1].trim() : null;
  const nationality = nationalityMatch
    ? nationalityMatch[1].trim().split("\n")[0]
    : null;

  return { name, surname, idNumber, nationality };
};

const validateData = (data) => {
  return data.name && data.idNumber && data.nationality;
};

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
        return res
          .status(400)
          .json({ message: "Fraud signals detected", fraudSignals });
      } else {
        console.log("No fraud signals detected.");
      }

      const document = result.document.text;

      console.log("Extracted text:", document);

      const extractedData = extractDataFromText(document);

      console.log("extractedData", extractedData);

      // Find existing identification record for the user
      let existingIdentification = await Identification.findOne({
        userID: userId,
      });

      if (existingIdentification) {
        // Update only if fields are not already present
        if (cameraType === "FRONT") {
          existingIdentification.governmentIDFrontPhoto = imageUrl.path;
          existingIdentification.governmentIDFrontCompleteExtractedText =
            document;
        } else if (cameraType === "BACK") {
          existingIdentification.governmentIDBackPhoto = imageUrl.path;
          existingIdentification.governmentIDBackCompleteExtractedText =
            document;
        }

        existingIdentification.name =
          existingIdentification.name || extractedData.name;
        existingIdentification.surname =
          existingIdentification.surname || extractedData.surname;
        existingIdentification.idNumber =
          existingIdentification.idNumber || extractedData.idNumber;
        existingIdentification.nationality =
          existingIdentification.nationality || extractedData.nationality;
      } else {
        existingIdentification = new Identification({
          userID: userId,
          ...extractedData,
          governmentIDFrontPhoto: cameraType === "FRONT" ? imageUrl.path : "",
          governmentIDBackPhoto: cameraType === "BACK" ? imageUrl.path : "",
          governmentIDFrontCompleteExtractedText:
            cameraType === "FRONT" ? document : "",
          governmentIDBackCompleteExtractedText:
            cameraType === "BACK" ? document : "",
        });
      }

      if (!validateData(extractedData)) {
        return res.status(400).json({ message: "Extracted data is not valid" });
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
