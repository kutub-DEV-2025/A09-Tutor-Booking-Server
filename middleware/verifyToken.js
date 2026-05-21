const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token =
    req.cookies?.token ||
    (authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null);

  if (!token) {
    return res.status(401).send({
      success: false,
      message: "Unauthorized Access",
    });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized Access",
      });
    }

    req.user = decoded;
    next();
  });
};

module.exports = verifyToken;