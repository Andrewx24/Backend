import express from 'express';
import jwt from 'jsonwebtoken';
import UserModel from '../models/users.js';

const router = express.Router();

const handleGoogleAuth = async (req, res, isSignUp) => {
  console.log('Google auth request received:', {
    type: isSignUp ? 'signup' : 'login',
    body: req.body
  });

  try {
    const { googleId, email, name } = req.body;

    if (!googleId || !email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    let user = await UserModel.findOne({ email });

    // Handle existing user during signup
    if (isSignUp && user) {
      // User exists - generate token and return success
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'your-fallback-secret',
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Welcome back',
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          googleId: user.googleId,
          accountType: user.accountType
        },
        existingUser: true
      });
    }

    // Handle signup for new user
    if (isSignUp) {
      user = new UserModel({
        email,
        name,
        googleId,
        authProvider: 'google'
      });
      await user.save();
      console.log('New Google user created:', { email: user.email, id: user._id });
    }
    // Handle login case where user doesn't exist
    else if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please sign up first.'
      });
    }

    // Generate token and send response
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-fallback-secret',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        googleId: user.googleId,
        accountType: user.accountType
      }
    });

  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Authentication failed'
    });
  }
};

// Define routes
router.post('/auth/google/login', async (req, res) => {
  console.log('Google login endpoint hit');
  await handleGoogleAuth(req, res, false);
});

router.post('/auth/google/signup', async (req, res) => {
  console.log('Google signup endpoint hit');
  await handleGoogleAuth(req, res, true);
});

// Test route
router.get('/auth/google/test', (req, res) => {
  res.json({ message: 'Google auth routes working' });
});

export default router;