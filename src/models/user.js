const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false // Don't return password by default
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'sales_rep'],
      default: 'sales_rep'
    },
    department: {
      type: String,
      default: 'Sales'
    },
    profilePicture: {
      type: String
    },
    active: {
      type: Boolean,
      default: true
    },
    // Track API credentials for each outreach platform
    integrations: {
      instantly: {
        apiKey: String,
        accountEmail: String,
        enabled: {
          type: Boolean,
          default: false
        }
      },
      salesfinity: {
        apiKey: String,
        accountId: String,
        enabled: {
          type: Boolean,
          default: false
        }
      },
      linkedin: {
        email: String,
        enabled: {
          type: Boolean,
          default: false
        }
      }
    },
    lastLoginAt: Date,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only run this function if password was modified
  if (!this.isModified('password')) return next();
  
  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Update passwordChangedAt property
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  
  // Subtract 1 second to ensure the JWT is created after the password has been changed
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Check if password is correct
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Check if user changed password after JWT was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 