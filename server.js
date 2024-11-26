// Import the Express framework
import express from 'express';

// Import the Mongoose library for MongoDB
import mongoose from 'mongoose';

// Import cookie-parser middleware for parsing cookies
import cookieParser from 'cookie-parser';

// Import morgan for loggin requests
import morgan from 'morgan';

// Import authentication routes
import authRoutes from './routes/userAuthRoutes/userAuthRoutes.js';

// Import image handling routes
import imageRoutes from './routes/imageRoutes/imageRoutes.js';

// Import googleAuthRoutes
import googleAuthRoutes from './routes/googleAuthRoutes.js'; 

// Import the MongoDB connection URL from config file
import { MONGO_URL } from './config/config.js';

// Import body-parser
import bodyParser from 'body-parser';

// Import cors
import cors from 'cors';

// Import dotenv
import dotenv from 'dotenv';

// Load corsOrigin
const corsOrigin = process.env.CORS_ORIGIN;

// Create an Express application
const app = express();

// Middleware to parse JSON bodies in incoming requests
app.use(express.json());

// Middleware to parse cookies in incoming requests
app.use(cookieParser());

// Middleware to allow cross-origin requests
app.use(
  cors({
    // Allow requests from this origin
    origin: corsOrigin,
    // Allow cookies to be sent and received
    credentials: true,
  })
);

// Define a custom log format for Morgan
const customFormat =
  '[:date[clf]] :method :url :status :res[content-length] - :response-time ms';

// Use Morgan middleware to log HTTP requests with the defined custom format
// app.use(morgan(customFormat));

// Use Google authentication routes for root path
app.use('/', googleAuthRoutes);
// Use user authentication routes for root path
app.use('/', authRoutes);

// Use image routes for root path
app.use('/', imageRoutes);

// Middleware to parse URL-encoded bodies in incoming requests
app.use(bodyParser.urlencoded({ extended: false }));

// Middleware to parse JSON bodies in incoming requests
app.use(bodyParser.json());

// Define the server port number
const PORT = 4000;

// Connect to MongoDB using Mongoose
mongoose
  // Connect to MongoDB using the provided URL
  .connect(MONGO_URL)
  // Log successful connection
  .then(() => console.log('connection successful'))
  // Handle connection errors
  .catch((error) => {
    // Log the error
    console.log('error connecting to mongodb', error);
    // Exit the process with an error code
    process.exit(1);
  });

// Default server route
// request = request, response = response
app.get('/', (request, response) => {
  // Send a JSON response indicating the server is running
  response.send({ status: 'Server is running' });
});

// Start the server and listen on the defined port
app.listen(PORT, () => {
  // Log the server's URL
  console.log(`Server running at http://localhost:${PORT}`);
});
