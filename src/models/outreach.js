const mongoose = require('mongoose');

const outreachSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true
    },
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign'
    },
    sequence: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sequence'
    },
    type: {
      type: String,
      enum: ['Email', 'Call', 'LinkedIn', 'Other'],
      required: true
    },
    channel: {
      type: String,
      enum: ['Instantly', 'Personal Email', 'Salesfinity', 'LinkedIn', 'Other'],
      required: true
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Sent', 'Delivered', 'Opened', 'Clicked', 'Replied', 'Bounced', 'Failed', 'Completed'],
      default: 'Scheduled'
    },
    scheduledAt: {
      type: Date
    },
    sentAt: {
      type: Date
    },
    // For email outreach
    email: {
      subject: String,
      body: String,
      fromEmail: String,
      fromName: String,
      openedAt: Date,
      clickedAt: Date,
      repliedAt: Date,
      bounceReason: String,
      links: [String],
      attachments: [String]
    },
    // For call outreach
    call: {
      duration: Number, // in seconds
      notes: String,
      recordingUrl: String,
      dialedNumber: String,
      outcome: {
        type: String,
        enum: ['Answered', 'Voicemail', 'No Answer', 'Busy', 'Wrong Number', 'Not Interested', 'Interested', 'Meeting Scheduled']
      }
    },
    // For LinkedIn outreach
    linkedin: {
      messageType: {
        type: String,
        enum: ['Connection Request', 'Direct Message', 'InMail', 'Comment', 'Post Engagement']
      },
      message: String,
      connectionStatus: {
        type: String,
        enum: ['Pending', 'Accepted', 'Ignored', 'N/A']
      }
    },
    // For all types
    response: {
      received: {
        type: Boolean,
        default: false
      },
      responseText: String,
      responseDate: Date,
      sentiment: {
        type: String,
        enum: ['Positive', 'Neutral', 'Negative', 'N/A'],
        default: 'N/A'
      },
      nextSteps: String
    },
    // Follow-up outreach tasks
    followUps: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outreach'
    }],
    parentOutreach: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outreach'
    },
    followUpCount: {
      type: Number,
      default: 0
    },
    notes: {
      type: String
    },
    // Integration-specific data
    externalIds: {
      instantlyId: String,
      salesfinityId: String,
      linkedinActivityId: String
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// Index for efficient querying
outreachSchema.index({ lead: 1, campaign: 1, type: 1 });
outreachSchema.index({ status: 1, scheduledAt: 1 });
outreachSchema.index({ performedBy: 1 });

const Outreach = mongoose.model('Outreach', outreachSchema);

module.exports = Outreach; 