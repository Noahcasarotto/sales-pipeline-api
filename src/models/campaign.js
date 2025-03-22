const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ['Email', 'Call', 'LinkedIn', 'Mixed'],
      required: [true, 'Campaign type is required']
    },
    status: {
      type: String,
      enum: ['Draft', 'Active', 'Paused', 'Completed', 'Archived'],
      default: 'Draft'
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    goal: {
      type: String,
      trim: true
    },
    targetAudience: {
      type: String,
      trim: true
    },
    // For filtering leads
    filters: {
      industries: [String],
      companySizes: [String],
      jobTitles: [String],
      locations: [String],
      tags: [String],
      customFilters: mongoose.Schema.Types.Mixed
    },
    // Metrics and stats
    metrics: {
      totalLeads: {
        type: Number,
        default: 0
      },
      emailsOpened: {
        type: Number,
        default: 0
      },
      emailsReplied: {
        type: Number,
        default: 0
      },
      callsAnswered: {
        type: Number,
        default: 0
      },
      meetings: {
        type: Number,
        default: 0
      },
      deals: {
        type: Number,
        default: 0
      },
      revenue: {
        type: Number,
        default: 0
      }
    },
    // Reference to all leads in this campaign
    leads: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead'
    }],
    // Reference to all sequences in this campaign
    sequences: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sequence'
    }],
    // Team members assigned to this campaign
    team: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign; 