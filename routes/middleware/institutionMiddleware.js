const User = require("../../models/User");

const isInstitution = async (req, res, next) => {
    try {
      const userId = req.userId;
      const user = await User.findById(userId);
  
      if (user && user.role === "INSTITUTION") {
        next();
      } else {
        res.status(403).json({ message: "Access forbidden: Institutions only" });
      }
    } catch (error) {
      console.error("Institution verification error:", error.message);
      res.status(500).json({ message: error.message });
    }
  };

  module.exports = {
    isInstitution
}