// Import the Mongoose library for MongoDB
import mongoose from 'mongoose';

// Import the bcrypt library for hashing passwords
import bcrypt from 'bcryptjs';

// Destructure the Schema constructor from mongoose
const { Schema } = mongoose;

// Destructure the hash function from bcrypt
const { hash } = bcrypt;

// Define the UserSchema using the Schema constructor
const UserSchema = new Schema(
  {
    // Define the email field with type String, uniqueness, and validation
    email: {
      type: String,
      unique: true,
      required: [true, 'Email is required'],
      match: [
        /^\w+(\.\w+)*@\w+([\-]?\w+)*(\.\w{2,3})+$/,
        'Invalid email address',
      ],
    },
    // Define the name field with type String and validation
    name: {
      type: String,
      required: [true, 'Name is required'],
      minLength: [4, 'Name should be at least 4 characters'],
      maxLength: [30, 'Name should be less than 30 characters'],
    },
    // Define the password field with type String and conditional validation
    password: {
      type: String,
      required: function() {
        return this.authProvider === 'local'; // Only required for local auth
      },
      select: false,
      minLength: [6, 'Password should be at least 6 characters'],
      maxLength: [30, 'Password should be less than 30 characters'],
      validate: {
        validator: function(value) {
          // Skip validation if using Google auth
          return this.authProvider === 'google' || (value && value.length >= 6);
        },
        message: 'Password validation failed'
      }
    },
    // Add auth provider field
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
      required: true
    },
    // Added Google ID field
    googleId: {
      type: String,
      sparse: true,
      unique: true,
      validate: {
        validator: function(value) {
          // Required if auth provider is Google
          return this.authProvider !== 'google' || (value && value.length > 0);
        },
        message: 'Google ID is required for Google authentication'
      }
    },
    // Add a field for profile picture link
    profilePictureLink: {
      type: String,
      default:
        'https://res.cloudinary.com/dttomxwev/image/upload/v1731113780/quisplf7viuudtptaund',
    },
    // Add the bio field with type String and a maximum length
    bio: {
      type: String,
      maxLength: [500, 'Bio should be less than 500 characters'],
      default: null,
    },
    // Add the artistType field with type String to specify the type of artist
    artistType: {
      type: String,
      maxLength: [50, 'Artist type should be less than 50 characters'],
      default: null,
    },
    views: {
      type: Number,
      default: 0,
    },
    accountType: {
      type: String,
      enum: {
        values: ['artist', 'art-lover'],
        message:
          '{VALUE} is not a valid account type. Choose either "artist" or "art-lover".',
      },
      default: null,
    }
  },
  {
    timestamps: true,
    versionKey: '__v',
  }
);

// Middleware to hash the password before saving if it's modified
UserSchema.pre('save', async function (next) {
  // Only hash password for local auth and if password is modified
  if (this.authProvider === 'google' || !this.isModified('password')) {
    return next();
  }
  try {
    this.password = await hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

// Increment the views count by 1
UserSchema.methods.incrementViews = async function () {
  this.views = this.views + 1;
  await this.save();
};

// Static method to create a user with Google authentication
UserSchema.statics.createGoogleUser = async function(userData) {
  const user = new this({
    ...userData,
    authProvider: 'google',
    password: undefined // Explicitly set password as undefined for Google users
  });
  return user.save({ validateBeforeSave: true });
};

// Static method to find or create Google user
UserSchema.statics.findOrCreateGoogleUser = async function(userData) {
  try {
    // First try to find by Google ID
    let user = await this.findOne({ googleId: userData.googleId });
    
    // If not found, try to find by email
    if (!user) {
      user = await this.findOne({ email: userData.email });
      
      // If user exists but with different auth provider, throw error
      if (user && user.authProvider !== 'google') {
        throw new Error('Email already exists with different authentication method');
      }
      
      // If no user exists, create new one
      if (!user) {
        user = await this.createGoogleUser(userData);
      }
    }
    
    return user;
  } catch (error) {
    throw error;
  }
};

// Create the User model using the UserSchema, or retrieve it if it already exists
const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);

// Example usage in a route/controller (ensure this part is outside the schema definition)
async function incrementUserViews(userId) {
    const user = await UserModel.findById(userId); // Find the user by ID
    if (user) {
      await user.incrementViews(); // Increment views count
    }
  }
  
export default UserModel;