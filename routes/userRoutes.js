const express = require("express");
const path = require("path");
const ParentalConsent = require("../models/ParentalConsent");
const upload = require("../utils/multerConfig");
const { isAuthenticated } = require("./middleware/authMiddleware");
const Identification = require("../models/Identification");
const User = require("../models/User");
const getNextSequenceValue = require("../utils/getNextSequenceValue");
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

router.post('/update-terms',   isAuthenticated,
  async (req, res) => {
  const { institutionId, userId } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send('User not found');
    }

    user.termsAndConditionsAccepted = true;
    await user.save();

    await User.findByIdAndUpdate(institutionId, {
      $push: { institutionUsers: user._id }
    });
    res.send('User updated successfully');
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).send('Error updating user');
  }
});


router.post('/create-institutional-user', async (req, res) => {
  const { institutionId } = req.body;

  try {
    // Create new user
    const accountNumber = await getNextSequenceValue("User");
    const newUser = new User({ accountStatus: 'PENDING', role: 'USER', accountNumber});
    await newUser.save();

    // Associate new user with institution
    await User.findByIdAndUpdate(institutionId, {
      $push: { institutionUsers: newUser._id }
    });

    res.json({ userId: newUser._id });
  } catch (error) {
    console.error('Error creating institutional user:', error);
    res.status(500).send('Error creating institutional user');
  }
});

router.get("/get-identification/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const identification = await Identification.findOne({ userID: userId });

    if (!identification) {
      return res.status(404).json({ message: "Identification not found" });
    }

    res.json({ identification });
  } catch (error) {
    console.error("Error retrieving identification data:", error);
    res.status(500).send("Error retrieving identification data");
  }
});

router.post('/update-identification', isAuthenticated, async (req, res) => {
  const { userId, name, surname, idNumber, nationality, dateOfBirth } = req.body;

  try {
    const identification = await Identification.findOne({ userID: userId });

    if (!identification) {
      return res.status(404).json({ message: 'Identification not found' });
    }

    identification.name = name;
    identification.surname = surname;
    identification.idNumber = idNumber;
    identification.nationality = nationality;
    identification.dateOfBirth = dateOfBirth;

    await identification.save();

    console.log("updated")

    res.json({ message: 'Identification updated successfully' });
  } catch (error) {
    console.error('Error updating identification:', error);
    res.status(500).json({ message: 'Error updating identification' });
  }
});


router.post('/update-email', isAuthenticated, async (req, res) => {
  const { userId, email } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send('User not found');
    }

    user.email = email;
    await user.save();

    res.json({ email: user.email });
  } catch (error) {
    console.error('Error updating email:', error);
    res.status(500).send('Error updating email');
  }
});


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
