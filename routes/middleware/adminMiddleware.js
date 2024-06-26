const User = require("../../models/User");

const isAdmin = async (req, res, next) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    console.log("req.userId", req.userId);

    if (user && user.role === "ADMIN") {
      next();
    } else {
      res.status(403).json({ message: "Access forbidden: Admins only" });
    }
  } catch (error) {
    console.error("Admin verification error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = isAdmin;
