// Import the Express framework
import express from "express";

// Import bcryptjs for password hashing and comparison
import bcrypt from "bcryptjs";

// Import the Mongoose library for MongoDB
import mongoose from "mongoose";

// Destructure the compare function from bcrypt
const { compare } = bcrypt;

// Import the user model
import UserModel from "../../models/users.js";

// Import utility functions for authentication
import { setAuthCookies, generateAuthToken } from "../../utils/authUtils.js";

import { isUserAuthorized } from "../../utils/authUtils.js";

// Import dotenv
import dotenv from "dotenv";
// Load environment variables from the .env file
dotenv.config();

import cloudinary from 'cloudinary';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD,
  api_key: process.env.CLOUDINARY_API,
  api_secret: process.env.CLOUDINARY_SECRET
});

// Create a new Express router
const router = express.Router();

// Route for user signup
router.post("/signup", async (request, response) => {
  try {
    const { name, email, password } = request.body;

    const userExists = await UserModel.findOne({ email });

    if (userExists) {
      return response
        .status(409)
        .json({ success: false, error: "User already exists" });
    }

    const newUser = await UserModel.create({
      name,
      email,
      password,
    });

    console.log("New user created successfully");

    response.status(200).json({ success: true, message: "Signup successful" });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      for (let field in error.errors) {
        const message = error.errors[field].message;
        return response.status(400).json({ success: false, message });
      }
    }

    console.error(error);
    response
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
});

// Route for user login
router.post("/login", async (request, response) => {
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      return response
        .status(400)
        .json({ success: false, error: "Email and password are required" });
    }

    const user = await UserModel.findOne({ email }).select("+password");

    if (!user) {
      return response
        .status(404)
        .json({ success: false, error: "User not found" });
    }

    const isPasswordCorrect = await compare(password, user.password);

    if (!isPasswordCorrect) {
      return response
        .status(401)
        .json({ success: false, error: "Incorrect password" });
    }

    const authToken = generateAuthToken(user._id);

    setAuthCookies(response, authToken);

    response.status(200).json({
      success: true,
      message: "Login successful",
      token: authToken,
      user: { user },
    });
  } catch (error) {
    console.error(error);
    response
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
});

// Route for user logout
router.post("/logout", (request, response) => {
  try {
    setAuthCookies(response, "");

    response
      .status(200)
      .json({ success: true, message: "User logged out successfully" });
  } catch (error) {
    console.error(error);
    response
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
});

// Route to get all users' profile pictures, bio, and artist type
router.get("/all-profile-pictures", async (request, response) => {
  try {
    // Find all users and select the necessary fields: name, email, profilePictureLink, bio, and artistType
    const users = await UserModel.find(
      {},
      { name: 1, email: 1, profilePictureLink: 1, bio: 1, artistType: 1 }
    );

    // Check if any users exist in the database
    if (!users || users.length === 0) {
      return response.status(404).json({ success: false, error: "No users found" });
    }

    // Filter out users who do not have a profile picture link (optional)
    const usersWithProfilePictures = users.filter(user => user.profilePictureLink);

    // Respond with the list of users and their profile picture links, bio, and artist type
    response.status(200).json({
      success: true,
      users: usersWithProfilePictures,
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Route for adding/updating profile picture
router.post("/profile-picture", async (request, response) => {
  try {
    const { userId, profilePictureLink } = request.body;

    if (!userId || !profilePictureLink) {
      return response
        .status(400)
        .json({ success: false, error: "User ID and profile picture link are required" });
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return response
        .status(404)
        .json({ success: false, error: "User not found" });
    }

    // Update the user's profile picture link
    user.profilePictureLink = profilePictureLink;
    await user.save();

    response.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      user,
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Route to get the user's profile picture based on userId
router.get("/profile-picture/:userId", async (request, response) => {
  try {
    const { userId } = request.params;

    // Find the user by their userId
    const user = await UserModel.findById(userId);

    if (!user) {
      return response.status(404).json({ success: false, error: "User not found" });
    }

    // Check if the user has a profile picture link
    if (!user.profilePictureLink) {
      return response.status(404).json({ success: false, error: "Profile picture not found" });
    }

    // Respond with the profile picture link
    response.status(200).json({
      success: true,
      profilePictureLink: user.profilePictureLink,
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Route for updating profile picture
router.put("/profile-picture", async (request, response) => {
  try {
    const { userId, profilePictureLink } = request.body;

    // Check if userId and profilePictureLink are provided
    if (!userId || !profilePictureLink) {
      return response.status(400).json({
        success: false,
        error: "User ID and profile picture link are required",
      });
    }

    // Find the user by userId
    const user = await UserModel.findById(userId);

    if (!user) {
      return response.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Update the user's profile picture link
    user.profilePictureLink = profilePictureLink;
    await user.save();

    response.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      user,
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
});

// Route for deleting profile picture
router.post('/delete-profile-picture', async (req, res) => {
  const { public_id } = req.body;
  console.log(`DELETING`, public_id)

  try {
    cloudinary.v2.api
      .delete_resources([`artists/${public_id}`],
      { type: 'upload', resource_type: 'image'})
      .then(console.log);
    // const result = await cloudinary.uploader.destroy(public_id);
    // console.log(`RESULT`, result)
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete image', error });
  }
});

// Endpoint to set or update the user's bio
router.put("/set-bio", isUserAuthorized, async (request, response) => {
  try {
    const { bio } = request.body;
    const userId = request.user._id; // Retrieve the authenticated user's ID

    // Check if the bio is provided
    if (!bio) {
      return response.status(400).json({
        success: false,
        error: "Bio is required",
      });
    }

    // Find the user by userId and update the bio
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { bio },
      { new: true }
    );

    if (!user) {
      return response.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    response.status(200).json({
      success: true,
      message: "Bio updated successfully",
      bio: user.bio,
    });
  } catch (error) {
    console.error("Error updating bio:", error);
    response.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
});


// Endpoint to set or update the user's artist type
router.put("/set-artist-type", async (request, response) => {
  try {
    const { userId, artistType } = request.body;

    // Check if userId and artistType are provided
    if (!userId || !artistType) {
      return response.status(400).json({
        success: false,
        error: "User ID and artist type are required",
      });
    }

    // Find the user by userId
    const user = await UserModel.findById(userId);

    if (!user) {
      return response.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Update the user's artist type
    user.artistType = artistType;
    await user.save();

    response.status(200).json({
      success: true,
      message: "Artist type updated successfully",
      user,
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
});



// Export the router
export default router;
