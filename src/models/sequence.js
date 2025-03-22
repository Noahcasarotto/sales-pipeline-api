const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  order: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['Email', 'Call', 'LinkedIn', 'Task', 'Wait'],
    required: true
  },
  channel: {
    type: String,
    enum: ['Instantly', 'Personal Email', 'Salesfinity', 'LinkedIn', 'Manual', 'Other'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  // Delay before executing this step (in hours)
  delay: {
    type: Number,
    default: 0
  },
  // Only perform this step on these days of the week
  activeDays: {
    type: [String],
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  },
  // Only perform this step during these hours
  activeHours: {
    start: {
      type: Number,
      default: 9 // 9 AM
    },
    end: {
      type: Number,
      default: 17 // 5 PM
    }
  },
  // Content depends on the type of step
  content: {
    // For email steps
    email: {
      subject: String,
      body: String,
      fromName: String,
      fromEmail: String,
      attachments: [String]
    },
    // For call steps
    call: {
      script: String,
      voicemailScript: String,
      dialingInstructions: String
    },
    // For LinkedIn steps
    linkedin: {
      messageType: {
        type: String,
        enum: ['Connection Request', 'Direct Message', 'InMail', 'Comment', 'Post']
      },
      message: String
    },
    // For task steps
    task: {
      instructions: String,
      dueDate: Date
    }
  },
  // Conditions to trigger or skip this step
  conditions: {
    skipIfReplied: {
      type: Boolean,
      default: true
    },
    skipIfBounced: {
      type: Boolean,
      default: true
    },
    skipIfOpened: {
      type: Boolean,
      default: false
    },
    skipIfNoResponse: {
      type: Boolean,
      default: false
    },
    customCondition: String
  }
});

const sequenceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Sequence name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    primaryType: {
      type: String,
      enum: ['Email', 'Call', 'LinkedIn', 'Mixed'],
      required: true
    },
    status: {
      type: String,
      enum: ['Draft', 'Active', 'Paused', 'Archived'],
      default: 'Draft'
    },
    steps: [stepSchema],
    // Related to the campaign
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign'
    },
    // Team members who can use this sequence
    assignedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    // Metrics
    metrics: {
      totalLeads: {
        type: Number,
        default: 0
      },
      completionRate: {
        type: Number,
        default: 0
      },
      responseRate: {
        type: Number,
        default: 0
      },
      positiveResponseRate: {
        type: Number,
        default: 0
      },
      averageTimeToComplete: {
        type: Number,
        default: 0
      }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

const Sequence = mongoose.model('Sequence', sequenceSchema);

module.exports = Sequence; 