const express = require("express");
const User = require("../models/User");
const bcrypt = require("bcrypt");
// const BiometricData = require("../models/BiometricData");
const Identification = require("../models/Identification");
const upload = require("../utils/multerConfig");
// const { FaceClient } = require("@azure/cognitiveservices-face");
// const { CognitiveServicesCredentials } = require("@azure/ms-rest-azure-js");
const { isAuthenticated } = require("./middleware/authMiddleware");
const router = express.Router();

// Azure Face API setup
// const faceKey = process.env.AZURE_FACE_API_KEY;
// const faceEndpoint = process.env.AZURE_FACE_API_ENDPOINT;
// const faceCredentials = new CognitiveServicesCredentials(faceKey);
// const faceClient = new FaceClient(faceCredentials, faceEndpoint);

router.get("/auth/register", (req, res) => {
  res.render("register");
});

router.post("/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const accountStatus = "PENDING"; // Default status when registering
    // Hashing the password before creating the user
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      passwordHash,
      accountStatus,
    });

    console.log("User registered successfully");

    // Redirect to the biometric data submission page or directly call the route
    res.redirect(`/auth/biometrics?userId=${user._id}`);
  } catch (error) {
    console.error("Registration error:", error.message);
    console.error(error.stack);
    res.status(500).send(error.message);
  }
});

router.get("/auth/login", (req, res) => {
  res.render("login");
});

router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      console.log("Login attempt failed: User not found");
      return res.status(400).send("User not found");
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (isMatch) {
      req.session.userId = user._id;
      console.log("User logged in successfully");
      return res.redirect("/");
    } else {
      console.log("Login attempt failed: Password is incorrect");
      return res.status(400).send("Password is incorrect");
    }
  } catch (error) {
    console.error("Login error:", error.message);
    console.error(error.stack);
    return res.status(500).send(error.message);
  }
});

router.get("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error during session destruction:", err.message);
      console.error(err.stack);
      return res.status(500).send("Error logging out");
    }
    console.log("User logged out successfully");
    res.redirect("/auth/login");
  });
});

// router.post("/auth/biometrics", isAuthenticated, async (req, res) => {
//   try {
//     const { userId, faceScanData, fingerprintData } = req.body;

//     // Analyze face scan using Azure Face API
//     const faceScanBuffer = Buffer.from(faceScanData, "base64");
//     const detectedFaces = await faceClient.face.detectWithStream(
//       faceScanBuffer,
//       {
//         returnFaceId: true,
//         detectionModel: "detection_03",
//       }
//     );

//     if (detectedFaces.length === 0) {
//       console.log("No faces detected.");
//       return res
//         .status(400)
//         .send("No faces detected in the provided face scan.");
//     }

//     const biometricData = new BiometricData({
//       userID: userId,
//       faceScanData: faceScanBuffer,
//       fingerprintData: Buffer.from(fingerprintData, "base64"),
//     });

//     await biometricData.save();
//     console.log("Biometric data received and saved:", biometricData);

//     res.send("Biometric data submission is successful.");
//   } catch (error) {
//     console.error("Biometric data submission error:", error.message);
//     console.error(error.stack);
//     res.status(500).send(error.message);
//   }
// });

// Route to render the form for uploading identification documents
router.get("/auth/upload-id", isAuthenticated, (req, res) => {
  res.render("upload-id");
});

// Route to handle the upload of identification documents
router.post(
  "/auth/upload-id",
  isAuthenticated,
  upload.fields([{ name: "governmentIDPhoto" }, { name: "selfiePhoto" }]),
  async (req, res) => {
    try {
      const { userId } = req.body;
      const governmentIDPhoto = req.files["governmentIDPhoto"][0].path;
      const selfiePhoto = req.files["selfiePhoto"][0].path;

      const identification = new Identification({
        userID: userId,
        governmentIDPhoto,
        selfiePhoto,
      });

      await identification.save();
      console.log(
        "Identification documents uploaded successfully:",
        identification
      );
      res.send("Identification documents uploaded successfully.");
    } catch (error) {
      console.error("Error uploading identification documents:", error.message);
      console.error(error.stack);
      res.status(500).send(error.message);
    }
  }
);

module.exports = router;
