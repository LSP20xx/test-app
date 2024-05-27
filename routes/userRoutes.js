const express = require("express");
const path = require("path");
const ParentalConsent = require("../models/ParentalConsent");
const upload = require("../utils/multerConfig");
const { isAuthenticated } = require("./middleware/authMiddleware");
const router = express.Router();

// Route to render the form for uploading parental consent
router.get("/upload-consent", isAuthenticated, (req, res) => {
  res.render("upload-consent");
});

// Route to handle the upload of parental consent documents
router.post(
  "/upload-consent",
  isAuthenticated,
  upload.single("consentDocument"),
  async (req, res) => {
    try {
      const { childID, parentUserID, consentGiven } = req.body;
      const consentDocument = req.file.path;

      const parentalConsent = new ParentalConsent({
        childID,
        parentUserID,
        consentGiven: consentGiven === "true", // Convert string to boolean
        consentDocument,
      });

      await parentalConsent.save();
      console.log(
        "Parental consent document uploaded successfully:",
        parentalConsent
      );
      res.send("Parental consent document uploaded successfully.");
    } catch (error) {
      console.error(
        "Error uploading parental consent document:",
        error.message
      );
      console.error(error.stack);
      res.status(500).send(error.message);
    }
  }
);

// Route to render the user profile page
router.get("/profile", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.render("user-profile", { user });
  } catch (error) {
    console.error("Error fetching user profile:", error.message);
    console.error(error.stack);
    res.status(500).send("Error fetching user profile");
  }
});

// Route to handle user profile updates
router.post(
  "/profile",
  isAuthenticated,
  upload.fields([
    { name: "biometricData", maxCount: 1 },
    { name: "governmentIDPhoto", maxCount: 1 },
    { name: "selfiePhoto", maxCount: 1 },
    { name: "testPhoto", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { firstName, lastName, email, dateOfBirth, gender } = req.body;
      const updateData = {
        firstName,
        lastName,
        email,
        dateOfBirth,
        gender,
      };

      if (req.files["biometricData"]) {
        updateData.biometricData = req.files["biometricData"][0].path;
      }
      if (req.files["governmentIDPhoto"]) {
        updateData.governmentIDPhoto = req.files["governmentIDPhoto"][0].path;
      }
      if (req.files["selfiePhoto"]) {
        updateData.selfiePhoto = req.files["selfiePhoto"][0].path;
      }
      if (req.files["testPhoto"]) {
        updateData.testPhoto = req.files["testPhoto"][0].path;
      }

      const user = await User.findByIdAndUpdate(
        req.session.userId,
        updateData,
        { new: true }
      );
      if (!user) {
        return res.status(404).send("User not found");
      }
      console.log("User profile updated successfully:", user);
      res.send("User profile updated successfully");
    } catch (error) {
      console.error("Error updating user profile:", error.message);
      console.error(error.stack);
      res.status(500).send("Error updating user profile");
    }
  }
);

module.exports = router;
