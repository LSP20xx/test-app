const express = require("express");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const BiometricData = require("../models/BiometricData");
const Identification = require("../models/Identification");
const upload = require("../utils/multerConfig");
const { FaceClient } = require("@azure/cognitiveservices-face");
const { CognitiveServicesCredentials } = require("@azure/ms-rest-azure-js");
const { isAuthenticated } = require("./middleware/authMiddleware");
const generateAuthToken = require("../utils/generateAuthToken");
const getNextSequenceValue = require("../utils/getNextSequenceValue");
const isAdmin = require("./middleware/adminMiddleware");

const router = express.Router();

// Azure Face API setup
// const faceKey = process.env.AZURE_FACE_API_KEY;
// const faceEndpoint = process.env.AZURE_FACE_API_ENDPOINT;
// const faceCredentials = new CognitiveServicesCredentials(faceKey);
// const faceClient = new FaceClient(faceCredentials, faceEndpoint);

router.post("/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.isInstitution) {
        if (existingUser.passwordHash) {
          return res.status(400).json({ message: "Institutional email cannot be re-registered" });
        } else {
          existingUser.passwordHash = await bcrypt.hash(password, 10);
          await existingUser.save();

          const token = generateAuthToken(existingUser);

          const userData = {
            userId: existingUser._id,
            email: existingUser.email,
            accountStatus: existingUser.accountStatus,
            role: existingUser.role,
            isPremiumUser: existingUser.isPremiumUser,
            isInstitution: existingUser.isInstitution,
            isVerified: existingUser.isVerified,
          };

          return res.status(200).json({ message: "Password set successfully", token, userData });
        }
      } else {
        return res.status(400).json({ message: "User already exists" });
      }
    }

    const accountNumber = await getNextSequenceValue("User");
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      passwordHash,
      accountStatus: "PENDING",
      accountNumber,
      role: "USER",
      isInstitution: email.endsWith('@institution.com'), // Suponiendo que el dominio de email indica una institución
    });

    await user.save();

    const token = generateAuthToken(user);

    console.log("User registered successfully");

    const userData = {
      userId: user._id,
      email: user.email,
      accountStatus: user.accountStatus,
      role: user.role,
      isPremiumUser: user.isPremiumUser,
      isInstitution: user.isInstitution,
      isVerified: user.isVerified,
    };

    return res.status(200).json({ message: "User registered successfully", token, userData });
  } catch (error) {
    console.error("Registration error:", error.message);
    console.error(error.stack);
    res.status(500).json({ message: error.message });
  }
});

router.post(
  "/auth/register-institution",
  isAuthenticated,
  isAdmin,
  async (req, res) => {
    try {
      const { email, institutionName } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      if (!institutionName) {
        return res.status(400).json({ message: "Institution name is required" });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "Institutional email cannot be re-registered" });
      }

      const accountNumber = await getNextSequenceValue("User");

      const user = new User({
        email,
        accountStatus: "ACTIVE",
        accountNumber,
        isInstitution: true,
        isVerified: true,
        role: "INSTITUTION",
        institutionName: institutionName
      });

      await user.save();

      const token = generateAuthToken(user);

      console.log("Institutional account created successfully");

      const userData = {
        userId: user._id,
        email: user.email,
        accountStatus: user.accountStatus,
        role: user.role,
        isPremiumUser: user.isPremiumUser,
        isInstitution: user.isInstitution,
        isVerified: user.isVerified,
        institutionName: user.institutionName,
      };

      return res.status(200).json({
        message: "Institutional account created successfully",
        token,
        userData,
      });
    } catch (error) {
      console.error("Registration error:", error.message);
      console.error(error.stack);
      res.status(500).json({ message: error.message });
    }
  }
);

router.post("/auth/register-admin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const accountNumber = -Math.floor(Math.random() * 1e8) - 1;

    const user = new User({
      email,
      passwordHash,
      role: "ADMIN",
      accountStatus: "ACTIVE",
      accountNumber,
      isVerified: true,
    });

    await user.save();

    const token = generateAuthToken(user);

    console.log("Admin user created successfully");

    return res.status(200).json({
      message: "Admin user created successfully",
      token,
      user,
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    console.error(error.stack);
    res.status(500).json({ message: error.message });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.log("Email or password not provided");
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }


    console.log(`Received login request for email: ${email}`);

    const user = await User.findOne({ email });

    if (!user) {
      console.log("Login attempt failed: User not found");
      return res.status(400).json({ message: "User not found" });
    }

    console.log(`User found: ${user.email}`);

    const isMatch = await bcrypt.compare(password, user.passwordHash);


    if (isMatch) {
      const token = generateAuthToken(user);
      console.log("User logged in successfully");

      const userData = {
        userId: user._id,
        email: user.email,
        accountStatus: user.accountStatus,
        role: user.role,
        isPremiumUser: user.isPremiumUser,
        isInstitution: user.isInstitution,
        isVerified: user.isVerified,
      };

      return res
        .status(200)
        .json({ message: "Login successful", token, userData });
    } else {
      console.log("Login attempt failed: Password is incorrect");
      return res.status(400).json({ message: "Password is incorrect" });
    }
  } catch (error) {
    console.error("Login error:", error.message);
    console.error(error.stack);
    return res.status(500).json({ message: error.message });
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

router.post("/auth/biometrics", isAuthenticated, async (req, res) => {
  try {
    const { userId, faceScanData } = req.body;

    // Analyze face scan using Azure Face API
    const faceScanBuffer = Buffer.from(faceScanData, "base64");
    const detectedFaceId = await faceApiDetect(faceScanBuffer);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isIdentical = await faceApiVerify(user.faceId, detectedFaceId);
    if (isIdentical) {
      res.status(200).json({ message: "Face verified successfully" });
    } else {
      res.status(401).json({ message: "Face verification failed" });
    }

    const biometricData = new BiometricData({
      userID: userId,
      faceScanData: faceScanBuffer,
    });

    await biometricData.save();
    console.log("Biometric data received and saved:", biometricData);

    res.status(200).send("Biometric data submission is successful.");
  } catch (error) {
    console.error("Biometric data submission error:", error.message);
    console.error(error.stack);
    res.status(500).send(error.message);
  }
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
