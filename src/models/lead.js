const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
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
    phone: {
      type: String,
      trim: true
    },
    company: {
      type: String,
      trim: true
    },
    jobTitle: {
      type: String,
      trim: true
    },
    linkedinUrl: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    },
    industry: {
      type: String,
      trim: true
    },
    companySize: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001+', 'Unknown'],
      default: 'Unknown'
    },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost', 'Archived'],
      default: 'New'
    },
    source: {
      type: String,
      enum: ['Email', 'Cold Call', 'LinkedIn', 'Website', 'Referral', 'Event', 'Other'],
      required: true
    },
    tags: {
      type: [String],
      default: []
    },
    notes: {
      type: String,
      trim: true
    },
    lastContactedDate: {
      type: Date
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// Compound index for preventing duplicate leads
leadSchema.index({ email: 1, company: 1 }, { unique: true });

// Text index for searching
leadSchema.index({
  firstName: 'text',
  lastName: 'text',
  email: 'text',
  company: 'text',
  jobTitle: 'text',
  notes: 'text'
});

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead; 