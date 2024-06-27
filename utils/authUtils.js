// Import the jwt token library
import jwt from "jsonwebtoken";
// Import the user model
import UserModel from "../models/users.js";
// Import dotenv to load environment variables from a .env file
import dotenv from "dotenv";

// Load environment variables from the .env file
dotenv.config();

// Destructure the JWT_SECRET variable from the environment variables
const { JWT_SECRET } = process.env;

// Determine if the environment is production
const isProduction = process.env.NODE_ENV === "production";

// Check if JWT_SECRET is defined
if (!JWT_SECRET) {
  // Throw an error if JWT_SECRET is not set
  throw new Error("Invalid env variable: JWT_SECRET");
} else {
  // Log that JWT_SECRET is loaded
  console.log("JWT_SECRET loaded");
}

// Function to generate a JWT token for a user
export const generateAuthToken = (_id) => {
  // Sign a new JWT with the user ID and secret, set to expire in 7 days
  return jwt.sign({ _id }, JWT_SECRET, { expiresIn: "7d" });
};

// Function to set authentication cookies in the response
export const setAuthCookies = (res, value) => {
  // Set the auth-token cookie with the provided value and options
  res.cookie("auth-token", value, {
    // Make the cookie accessible only by the web server
    httpOnly: true,
    // Use secure cookies in production
    secure: isProduction,
    // Set same-site attribute based on environment
    sameSite: isProduction ? "strict" : "lax",
    // Set the cookie to expire in 7 days or immediately if value is null
    maxAge: value ? 7 * 24 * 60 * 60 * 1000 : 0,
  });
};

// Middleware to check if the user is authorized
export const isUserAuthorized = async (req, res, next) => {
  // Get the auth-token cookie from the request
  const token = req.cookies["auth-token"];

  // If the token exists
  if (token) {
    try {
      // Verify the token using the JWT_SECRET
      const data = jwt.verify(token, JWT_SECRET);
      // If the data is not a string
      if (typeof data !== "string") {
        // Find the user by ID from the token data
        const user = await UserModel.findById(data._id).catch((error) => {
          // Log any errors that occur while finding the user
          console.error("Error finding user:", error);
          return null;
        });

        // If the user is found
        if (user) {
          // Attach the user and token to the request object
          req.user = user;
          req.token = token;
          // Call the next middleware function
          return next();
        }
      }
    } catch (error) {
      // Log any errors that occur during token verification

      console.error("Token verification error:", error);
    }
  }
  // Respond with a 401 status and an error message if authorization fails
  return res.status(401).json({ success: false, error: "Unauthorized" });
};