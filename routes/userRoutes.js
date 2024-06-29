const express = require("express");
const path = require("path");
const ParentalConsent = require("../models/ParentalConsent");
const upload = require("../utils/multerConfig");
const { isAuthenticated } = require("./middleware/authMiddleware");
const Identification = require("../models/Identification");
const User = require("../models/User");
const getNextSequenceValue = require("../utils/getNextSequenceValue");
const { sendEmail } = require("../services/emailService");
const Test = require("../models/Test");
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

router.post('/update-terms', isAuthenticated, async (req, res) => {
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

router.post('/create-user-of-institution', async (req, res) => {
  const { institutionId } = req.body;

  try {
    // Crear un nuevo usuario
    const accountNumber = await getNextSequenceValue("User");
    const newUser = new User({ accountStatus: 'PENDING', role: 'USER', accountNumber });
    await newUser.save();

    // Asociar el nuevo usuario con la institución
    const institution = await User.findByIdAndUpdate(institutionId, {
      $push: { institutionUsers: newUser._id }
    });

    // Verificar si la institución fue encontrada y actualizada correctamente
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    res.json({ userId: newUser._id });
  } catch (error) {
    console.error('Error creating institutional user:', error);
    res.status(500).send('Error creating institutional user');
  }
});

router.get("/institution-users/:userId", isAuthenticated, async (req, res) => {
  const { userId } = req.params;

  try {
    // Encuentra al usuario por ID y verifica si es una institución
    const user = await User.findById(userId).populate("institutionUsers");

    console.log("userid", user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isInstitution) {
      return res.status(403).json({ message: "User is not an institution" });
    }

    // Obtiene los usuarios asociados a la institución
    const institutionUsers = await User.find({
      _id: { $in: user.institutionUsers },
    }).lean();
    console.log("institutionUsers", institutionUsers);

    // Busca los detalles de identificación para cada usuario institucional
    const userIds = institutionUsers.map((u) => u._id);
    const identifications = await Identification.find({
      userID: { $in: userIds },
    }).lean();

    // Busca los tests para cada usuario institucional
    const tests = await Test.find({
      userID: { $in: userIds },
    }).lean();

    // Combina los datos del usuario con los detalles de identificación y los tests
    const institutionUsersWithDetails = institutionUsers.map((institutionUser) => {
      const identification = identifications.find(
        (id) => id.userID.toString() === institutionUser._id.toString()
      );

      const userTests = tests.filter(
        (test) => test.userID.toString() === institutionUser._id.toString()
      );

      // Elimina la propiedad userID del objeto identification para evitar duplicación
      const { userID, ...identificationDetails } = identification || {};

      return {
        ...institutionUser,
        ...identificationDetails,
        tests: userTests, // Agrega los tests del usuario
      };
    });

    res.json({ institutionUsers: institutionUsersWithDetails });
  } catch (error) {
    console.error("Error retrieving institution users:", error);
    res.status(500).send("Error retrieving institution users");
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
router.delete("/institution-users/:institutionId/:userId", isAuthenticated, async (req, res) => {
  const { institutionId, userId } = req.params;

  try {
    // Verificar si la institución existe
    const institution = await User.findById(institutionId);
    console.log("institution", institution);

    if (!institution) {
      return res.status(404).json({ message: "Institution not found" });
    }

    if (!institution.isInstitution) {
      return res.status(403).json({ message: "User is not an institution" });
    }

    // Eliminar el usuario de la lista de institutionUsers de la institución
    const updatedInstitution = await User.findByIdAndUpdate(
      institutionId,
      { $pull: { institutionUsers: userId } },
      { new: true }
    );

    if (!updatedInstitution) {
      return res.status(500).json({ message: "Failed to update institution" });
    }

    // También eliminar el usuario si es necesario
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "User removed from institution successfully", institution: updatedInstitution });
  } catch (error) {
    console.error("Error removing user from institution:", error);
    res.status(500).send("Error removing user from institution");
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
    console.log("llega a enviar el email")
    // Send email notification
    await sendEmail(email, '[ELOHEH] User Registration', 'You have successfully registered on ELOHEH app.');
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
