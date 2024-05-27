const express = require("express");
const router = express.Router();
const InformationResource = require("../models/InformationResource");
const { isAuthenticated } = require("./middleware/authMiddleware");

// Route to query resources by contentType or relatedCondition
router.get("/resources", isAuthenticated, async (req, res) => {
  try {
    const { contentType, relatedCondition } = req.query;
    const query = {};

    if (contentType) {
      query.contentType = contentType;
    }

    if (relatedCondition) {
      query.relatedConditions = relatedCondition;
    }

    const resources = await InformationResource.find(query);
    console.log(`Resources queried: ${resources.length} found`);
    res.render("information-resources", { resources });
  } catch (err) {
    console.error(`Error querying resources: ${err.message}`);
    console.error(err.stack);
    res.status(500).send("Server error");
  }
});

module.exports = router;
