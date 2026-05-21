const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

const createToken = ({ _id, email, name, photoURL }) => {
  return jwt.sign(
    {
      userId: _id?.toString?.() || null,
      email,
      name,
      photoURL,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
};

module.exports = (usersCollection) => {
  router.post("/register", async (req, res) => {
    try {
      const { name, email, password, photoURL } = req.body;

      if (!name || !email || !password) {
        return res.status(400).send({
          success: false,
          message: "Name, email, and password are required.",
        });
      }

      if (password.length < 6) {
        return res.status(400).send({
          success: false,
          message: "Password must be at least 6 characters long.",
        });
      }

      if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
        return res.status(400).send({
          success: false,
          message:
            "Password must include at least one uppercase and one lowercase letter.",
        });
      }

      const existingUser = await usersCollection.findOne({ email });

      if (existingUser) {
        return res.status(409).send({
          success: false,
          message: "A user with this email already exists.",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        name,
        email,
        password: hashedPassword,
        photoURL: photoURL || "",
        createdAt: new Date(),
      };

      await usersCollection.insertOne(newUser);

      res.send({
        success: true,
        message: "Registration successful. Please log in.",
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        success: false,
        message: "Failed to register user.",
      });
    }
  });

  router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).send({
          success: false,
          message: "Email and password are required.",
        });
      }

      const user = await usersCollection.findOne({ email });

      if (!user) {
        return res.status(401).send({
          success: false,
          message: "Invalid email or password.",
        });
      }

      const passwordValid = await bcrypt.compare(password, user.password);

      if (!passwordValid) {
        return res.status(401).send({
          success: false,
          message: "Invalid email or password.",
        });
      }

      const token = createToken(user);

      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.send({
        success: true,
        user: {
          email: user.email,
          name: user.name,
          photoURL: user.photoURL,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        success: false,
        message: "Failed to log in.",
      });
    }
  });

  router.post("/jwt", async (req, res) => {
    try {
      const user = req.body;

      if (!user || !user.email) {
        return res.status(400).send({
          success: false,
          message: "User email is required to generate token.",
        });
      }

      const token = createToken(user);

      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.send({
        success: true,
        token,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        success: false,
        message: "Failed to generate JWT.",
      });
    }
  });

  router.post("/signout", (req, res) => {
    res.clearCookie("token");
    res.send({ success: true, message: "Signed out successfully." });
  });

  router.get("/me", verifyToken, (req, res) => {
    res.send({ success: true, user: req.user });
  });

  return router;
};