const jwt = require("jsonwebtoken");

const generateAuthToken = (user) => {
  const token = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "3d" }
  );
  return token;
};

module.exports = generateAuthToken;
