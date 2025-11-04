import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Login route
router.post('/login', (req, res) => {
  const { email } = req.body;

  // Check if email is provided
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Create a demo user object (you would normally authenticate against a database)
  const user = {
    id: 'demo-id',
    email,
    role: 'DISTRIBUTOR',
  };

  // Generate JWT token with a secret (either from environment variable or default to "devsecret")
  const token = jwt.sign(user, process.env.JWT_SECRET || 'TuIeYA9rhGKIR5crjoKI9ttxyzRJkWtM', { expiresIn: '1h' });

  // Send the response with the access token and user data
  return res.json({
    accessToken: token,
    user,
  });
});

export default router;
