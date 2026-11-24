
const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username !== process.env.STAFF_USERNAME ||
    password !== process.env.STAFF_PASSWORD
  ) {
    return res.status(401).json({
      success: false,
      message: "Incorrect username or password."
    });
  }

  const token = jwt.sign(
    {
      username,
      role: "staff"
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({
    success: true,
    message: "Staff login successful.",
    token
  });
});

module.exports = router;
