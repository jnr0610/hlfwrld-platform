require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key_here');
const AWS = require('aws-sdk');
const { Resend } = require('resend');
const jwt = require('jsonwebtoken');

const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// Hybrid session management with JWT tokens
const sessions = new Map(); // For short-term sessions (24 hours)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const generateSessionToken = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Generate JWT token for long-term sessions (90 days)
const generateJWTToken = (salonData) => {
  return jwt.sign(
    {
      salonId: salonData.salonId,
      salonName: salonData.salonName,
      email: salonData.email,
      type: 'salon'
    },
    JWT_SECRET,
    { expiresIn: '90d' } // 90 days
  );
};

// Verify JWT token
const verifyJWTToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Initialize Resend (much simpler than AWS SES)
let resend;
try {
  console.log('🔧 Resend API Key:', process.env.RESEND_API_KEY ? 'Present' : 'Missing');
  console.log('🔧 Email Service:', process.env.EMAIL_SERVICE);
  
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_your_resend_api_key_here') {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend configured successfully');
  } else {
    throw new Error('Resend API key not properly configured');
  }
} catch (error) {
  console.log('⚠️  Resend not configured - emails will use fallback mode');
  console.log('🔧 Error details:', error.message);
  resend = null;
}

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // To handle base64 images

// Serve static files from the organized folder structure
app.use('/Main-Pages', express.static(path.join(__dirname, '../Main Pages')));
app.use('/User-Authentication', express.static(path.join(__dirname, '../User Authentication')));
app.use('/Dashboards', express.static(path.join(__dirname, '../Dashboards')));
app.use('/Booking', express.static(path.join(__dirname, '../Booking')));
app.use('/Communication', express.static(path.join(__dirname, '../Communication')));
app.use('/Payment', express.static(path.join(__dirname, '../Payment')));
app.use('/Development', express.static(path.join(__dirname, '../Development')));
app.use('/Documentation', express.static(path.join(__dirname, '../Documentation')));
app.use('/Configuration', express.static(path.join(__dirname, '../Configuration')));

// Serve reset database page
app.get('/reset-database.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../reset-database.html'));
});

// Serve force database reset page
app.get('/force-db-reset.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../force-db-reset.html'));
});

// Function to initialize database tables
function initializeTables(database) {
  database.serialize(() => {
    // Create creators table with all required columns
    database.run(`CREATE TABLE IF NOT EXISTS creators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      zipCode TEXT NOT NULL,
      instagram TEXT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      state TEXT,
      influencerCode TEXT,
      stripeAccountId TEXT,
      totalEarnings REAL DEFAULT 0,
      isVerified BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

  database.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    influencerName TEXT,
    title TEXT,
    city TEXT,
    state TEXT,
    fee TEXT,
    serviceName TEXT,
    notes TEXT,
    frequency TEXT,
    coverPhoto TEXT,
    photos TEXT,
    code TEXT UNIQUE,
    salonName TEXT
  )`);
  
  // Columns now included in table creation above

  // influencerCode now included in table creation above
  
  database.run(`CREATE TABLE IF NOT EXISTS signups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    postCode TEXT
  )`);
  
  // Create profiles table for influencer profile data
  database.run(`CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    influencerName TEXT UNIQUE,
    profilePhoto TEXT,
    handle TEXT,
    bio TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Create messages table for influencer inbox system
  database.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    toInfluencer TEXT,
    postCode TEXT,
    message TEXT,
    senderType TEXT,
    senderEmail TEXT,
    senderName TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    isRead BOOLEAN DEFAULT FALSE,
    isReplied BOOLEAN DEFAULT FALSE
  )`);
  
  // Create contact_submissions table for contact form
  database.run(`CREATE TABLE IF NOT EXISTS contact_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Create salons table for salon accounts
  database.run(`CREATE TABLE IF NOT EXISTS salons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salonName TEXT NOT NULL,
    ownerName TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zipCode TEXT NOT NULL,
    influencerCode TEXT NOT NULL,
    password TEXT NOT NULL,
    isVerified BOOLEAN DEFAULT 0,
    stripeCustomerId TEXT,
    stripeSubscriptionId TEXT,
    subscriptionPlan TEXT DEFAULT 'professional',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Create service requests table for detailed booking requests
  database.run(`CREATE TABLE IF NOT EXISTS service_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serviceCode TEXT,
    influencerHandle TEXT,
    clientName TEXT,
    clientEmail TEXT,
    clientPhone TEXT,
    clientZipCode TEXT,
    selectedDates TEXT,
    preferredTime TEXT,
    status TEXT DEFAULT 'pending',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
  )`);
  
  // Create email logs table for tracking sent emails
  database.run(`CREATE TABLE IF NOT EXISTS email_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requestId INTEGER,
    recipientEmail TEXT,
    subject TEXT,
    body TEXT,
    messageId TEXT,
    status TEXT DEFAULT 'sent',
    sentAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create influencers table for Stripe Connect accounts
  database.run(`CREATE TABLE IF NOT EXISTS influencers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    fullName TEXT NOT NULL,
    bio TEXT,
    profileImage TEXT,
    stripeConnectAccountId TEXT,
    stripeConnectAccountStatus TEXT DEFAULT 'pending',
    commissionRate DECIMAL(5,2) DEFAULT 15.00,
    totalEarnings DECIMAL(10,2) DEFAULT 0.00,
    isVerified BOOLEAN DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create bookings table for commission tracking
  database.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requestId INTEGER NOT NULL,
    influencerId INTEGER NOT NULL,
    salonId INTEGER NOT NULL,
    clientName TEXT NOT NULL,
    clientEmail TEXT NOT NULL,
    serviceName TEXT NOT NULL,
    serviceFee DECIMAL(10,2) NOT NULL,
    commissionAmount DECIMAL(10,2) NOT NULL,
    stripePaymentIntentId TEXT,
    stripeTransferId TEXT,
    stripeSessionId TEXT,
    bookingStatus TEXT DEFAULT 'pending',
    appointmentDate TEXT,
    appointmentTime TEXT,
    refundReason TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requestId) REFERENCES service_requests (id),
    FOREIGN KEY (influencerId) REFERENCES influencers (id),
    FOREIGN KEY (salonId) REFERENCES salons (id)
  )`);
  });
}

// Initialize SQLite DB with reconnection handling
let db;

function initializeDatabase() {
  const dbPath = path.join(__dirname, 'Database', 'database.sqlite');
  
  // Close existing connection if any
  if (db) {
    try {
      db.close();
    } catch (e) {
      console.log('Previous DB connection closed');
    }
  }
  
  console.log('🔄 Initializing database connection...');
  
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ DB open error:', err.message);
      console.log('🔄 Attempting to recreate database...');
      
      // Try to delete and recreate the database file
      const fs = require('fs');
      try {
        if (fs.existsSync(dbPath)) {
          fs.unlinkSync(dbPath);
          console.log('🗑️ Removed corrupted database file');
        }
      } catch (deleteErr) {
        console.error('❌ Could not delete database file:', deleteErr.message);
      }
      
      // Create fresh database
      db = new sqlite3.Database(dbPath, (retryErr) => {
        if (retryErr) {
          console.error('❌ Failed to create fresh database:', retryErr.message);
          return;
        }
        console.log('✅ Fresh database created successfully');
        initializeTables(db);
      });
      return;
    }
    
    console.log('✅ Connected to SQLite database');
    initializeTables(db);
  });
  
  // Handle database errors
  db.on('error', (err) => {
    console.error('❌ Database error:', err.message);
    console.log('🔄 Attempting database reconnection...');
    setTimeout(() => initializeDatabase(), 1000);
  });
}

// Initialize database
initializeDatabase();

// Hybrid session validation middleware
const validateSession = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.sessionToken;

  if (!token) {
    return res.status(401).json({ error: 'Session token required' });
  }

  // First, try to validate as JWT token (long-term session)
  const jwtPayload = verifyJWTToken(token);
  if (jwtPayload) {
    req.session = {
      salonId: jwtPayload.salonId,
      salonName: jwtPayload.salonName,
      email: jwtPayload.email,
      type: jwtPayload.type,
      createdAt: Date.now() // JWT tokens are self-contained
    };
    return next();
  }

  // If not JWT, try short-term session
  const session = sessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  // Check if short-term session is expired (24 hours)
  if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expired' });
  }

  req.session = session;
  next();
};

// Helper to generate a unique 4-digit code
function generateCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Helper to generate a unique influencer code
function generateInfluencerCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Helper to check if influencer code is unique
function isUniqueInfluencerCode(code, callback) {
  db.get(
    `SELECT id FROM creators WHERE influencerCode = ?`,
    [code],
    (err, existing) => {
      if (err) {
        callback(err, false);
      } else {
        callback(null, !existing);
      }
    }
  );
}

// Email service functions
function formatTimeSlot(timeOption) {
  const date = new Date(timeOption.date);
  const formattedDate = date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
  
  // Convert 24-hour time to 12-hour format
  const [hours, minutes] = timeOption.time.split(':');
  const hour12 = parseInt(hours) > 12 ? parseInt(hours) - 12 : parseInt(hours);
  const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
  const displayHour = hour12 === 0 ? 12 : hour12;
  const formattedTime = `${displayHour}:${minutes} ${ampm}`;
  
  return `${formattedDate} at ${formattedTime}`;
}

function generateEmailTemplate(clientName, serviceName, timeOptions, salonName, requestId) {
  return `
<div style="color: black; font-family: Arial, sans-serif; line-height: 1.4;">
  <p style="color: black; margin: 0 0 10px 0;">Hi ${clientName},</p>
  <p style="color: black; margin: 0 0 10px 0;">Great news! You're off the waitlist for the ${serviceName} that ${salonName} also books.</p>
  <p style="color: black; margin: 0 0 15px 0;">Please click on the link below to view your available options, the salon location, and if desired book the appointment. These options will be held for you for 1 hour!</p>
</div>
  `.trim();
}

function generateReservationToken(requestId) {
  // Simple token generation - in production, use proper JWT or similar
  const timestamp = Date.now();
  const hash = Buffer.from(`${requestId}_${timestamp}_${process.env.SECRET_KEY || 'default_secret'}`).toString('base64');
  return hash.substring(0, 32);
}

function generateAppointmentConfirmationEmail(clientName, serviceName, appointmentDate, appointmentTime, salonName, appointmentLink) {
  return `
Hi ${clientName},

Your appointment has been confirmed! Here are your details:

Service: ${serviceName}
Date: ${appointmentDate}
Time: ${appointmentTime}
Location: ${salonName}

Manage your appointment:
${appointmentLink}

You can use this link to:
• View your appointment details
• Request changes if needed
• Contact us with questions

We're excited to see you!

Best regards,
${salonName || 'Your Salon Team'}

---
This message confirms your appointment booking. For urgent changes, please call us directly.
  `.trim();
}

function generateWaitlistConfirmationEmail(clientName, serviceName, creatorFirstName, influencerHandle, selectedDates, requestId) {
  const formattedDates = selectedDates.map(date => {
    const dateObj = new Date(date.date);
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    return `${formattedDate} (${date.time})`;
  }).join('\n• ');

  return `
Hi ${clientName},

Thank you for your interest in the "${serviceName}" that ${creatorFirstName} (@${influencerHandle}) also books.

Here are your waitlist confirmation details:
• Service: ${serviceName}
• Preferred dates:
  • ${formattedDates}

What happens next:
1. The salon will review your request
2. After approval, you will receive an email with location details
3. Review location details before confirming your booking
4. Complete payment to secure your appointment

We will keep you updated on the status of your request.

If you have any questions, please do not hesitate to reach out.

Best regards,
The Hlfwrld Team
www.hlfwrld.com
contact@hlfwrld.com

---
This is an automated confirmation of your service request. Please save this email for your records.
  `.trim();
}

function generateSalonBookingNotificationEmail(salonName, clientName, serviceName, appointmentDate, appointmentTime, paymentAmount, requestId) {
  const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return `
Hi ${salonName},

Great news! A new appointment has been booked and paid for. The client is ready to be assigned to a beauty service provider.

APPOINTMENT DETAILS:
• Service: ${serviceName}
• Client: ${clientName}
• Date: ${formattedDate}
• Time: ${appointmentTime}
• Amount Paid: $${paymentAmount}

NEXT STEPS:
Please assign this client to a beauty service provider who has an opening during the requested time slot. You can manage this appointment through your salon dashboard.

Dashboard Link: http://localhost:3000/Dashboards/salon-dashboard.html

The client has already completed payment, so you can proceed with scheduling the service provider immediately.

IMPORTANT: All client communication should be handled through the platform. Do not contact the client directly outside of our system.

Best regards,
The Hlfwrld Team
www.hlfwrld.com
contact@hlfwrld.com

---
Booking Reference: #${requestId}
  `.trim();
}

// Configure domain for URLs
const FRONTEND_DOMAIN = process.env.FRONTEND_DOMAIN || 'https://www.hlfwrld.com';

// Configure AWS SES
const ses = new AWS.SES({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

async function sendEmail(to, subject, body, requestId = null) {
  const emailService = process.env.EMAIL_SERVICE || 'resend';
  
  try {
    console.log(`📧 SENDING EMAIL VIA ${emailService.toUpperCase()}:`);
    console.log('To:', to);
    console.log('Subject:', subject);
    
    let result;
    let messageId;
    
    if (emailService === 'resend') {
      if (!resend) {
        throw new Error('Resend not configured - please set RESEND_API_KEY in environment variables');
      }
      
      // Use Resend for much simpler email sending
      result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
        to: [to],
        subject: subject,
        html: body.replace(/\n/g, '<br>'),
        text: body
      });
      
      messageId = result.id;
      console.log('📧 EMAIL SENT SUCCESSFULLY VIA RESEND:', messageId);
      
    } else if (emailService === 'ses') {
      // Use AWS SES (requires approval)
      const ses = new AWS.SES({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });
    
    const params = {
      Source: process.env.AWS_SES_FROM_EMAIL || 'noreply@yourdomain.com',
      Destination: {
        ToAddresses: [to]
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8'
        },
        Body: {
          Text: {
            Data: body,
            Charset: 'UTF-8'
          },
          Html: {
            Data: body.replace(/\n/g, '<br>'),
            Charset: 'UTF-8'
          }
        }
      },
      ConfigurationSetName: process.env.AWS_SES_CONFIGURATION_SET || undefined
    };
    
      result = await ses.sendEmail(params).promise();
      messageId = result.MessageId;
      console.log('📧 EMAIL SENT SUCCESSFULLY VIA AWS SES:', messageId);
    
    } else {
      throw new Error(`Unknown email service: ${emailService}`);
    }
    
    // Log email to database
    if (requestId) {
      db.run(
        `INSERT INTO email_logs (requestId, recipientEmail, subject, body, messageId)
         VALUES (?, ?, ?, ?, ?)`,
        [requestId, to, subject, body, messageId],
        function (err) {
          if (err) {
            console.error('❌ Error logging email:', err.message);
          } else {
            console.log('📝 Email logged successfully');
          }
        }
      );
    }
    
    return { success: true, messageId };
    
  } catch (error) {
    console.error(`❌ Error sending email via ${emailService.toUpperCase()}:`, error);
    
    // Fallback to console log for development
    console.log('📧 FALLBACK - EMAIL CONTENT:');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Body:', body);
    
    const messageId = `fallback_${Date.now()}`;
    
    // Log email to database even if email service fails
    if (requestId) {
      db.run(
        `INSERT INTO email_logs (requestId, recipientEmail, subject, body, messageId, status)
         VALUES (?, ?, ?, ?, ?, 'failed')`,
        [requestId, to, subject, body, messageId],
        function (err) {
          if (err) {
            console.error('❌ Error logging failed email:', err.message);
          } else {
            console.log('📝 Failed email logged successfully');
          }
        }
      );
    }
    
    return { success: false, messageId, error: error.message };
  }
}

// Create a new post
app.post('/posts', (req, res) => {
  const post = req.body;
  const code = generateCode();
  db.run(
    `INSERT INTO posts (influencerName, title, city, state, fee, serviceName, notes, frequency, coverPhoto, photos, code, salonName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      post.influencerName,
      post.title,
      post.city,
      post.state,
      post.fee,
      post.serviceName,
      post.notes,
      post.frequency,
      post.coverPhoto,
      JSON.stringify(post.photos || []),
      code,
      post.salonName
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, code });
    }
  );
});

// Get all posts for an influencer
app.get('/posts/:influencerName', (req, res) => {
  db.all(
    `SELECT * FROM posts WHERE influencerName = ? ORDER BY id DESC`,
    [req.params.influencerName],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      rows.forEach(r => r.photos = JSON.parse(r.photos || '[]'));
      res.json(rows);
    }
  );
});

// Get a post by code
app.get('/post-by-code/:code', (req, res) => {
  db.get(
    `SELECT * FROM posts WHERE code = ?`,
    [req.params.code],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Not found' });
      row.photos = JSON.parse(row.photos || '[]');
      res.json(row);
    }
  );
});

// Update a post
app.put('/posts/:id', (req, res) => {
  const post = req.body;
  console.log('PUT /posts/:id', req.params.id, post);
  db.run(
    `UPDATE posts SET influencerName=?, title=?, city=?, state=?, fee=?, serviceName=?, notes=?, frequency=?, coverPhoto=?, photos=?, salonName=? WHERE id=?`,
    [
      post.influencerName || '',
      post.title || '',
      post.city || '',
      post.state || '',
      post.fee || '',
      post.serviceName || '',
      post.notes || '',
      post.frequency || '',
      post.coverPhoto || null,
      JSON.stringify(post.photos || []),
      post.salonName || '',
      req.params.id
    ],
    function (err) {
      if (err) {
        console.error('Update error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log('Update result:', { updated: this.changes });
      res.json({ updated: this.changes });
    }
  );
});

// Delete a post
app.delete('/posts/:id', (req, res) => {
  db.run(`DELETE FROM posts WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Get signup count for a post code
app.get('/signup-count/:code', (req, res) => {
  db.get(
    `SELECT COUNT(*) as signupCount FROM signups WHERE postCode = ?`,
    [req.params.code],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ signupCount: row.signupCount });
    }
  );
});

// Profile management endpoints
// Get profile data
app.get('/profile/:influencerName', (req, res) => {
  // First get the profile data
  db.get(
    `SELECT * FROM profiles WHERE influencerName = ?`,
    [req.params.influencerName],
    (err, profileRow) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Then get the creator's name from the creators table
      db.get(
        `SELECT name FROM creators WHERE username = ?`,
        [req.params.influencerName],
        (err, creatorRow) => {
          if (err) return res.status(500).json({ error: err.message });
          
          if (!profileRow) {
            // Return default profile if none exists
            return res.json({
              influencerName: req.params.influencerName,
              profilePhoto: null,
              handle: '',
              bio: '',
              name: creatorRow ? creatorRow.name : ''
            });
          }
          
          // Combine profile data with creator name
          const profileData = {
            ...profileRow,
            name: creatorRow ? creatorRow.name : ''
          };
          
          res.json(profileData);
        }
      );
    }
  );
});

// Save/update profile data
app.post('/profile/:influencerName', (req, res) => {
  const { profilePhoto, handle, bio } = req.body;
  const influencerName = req.params.influencerName;
  
  console.log('💾 Saving profile for:', influencerName);
  
  db.run(
    `INSERT OR REPLACE INTO profiles (influencerName, profilePhoto, handle, bio, updatedAt)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [influencerName, profilePhoto, handle, bio],
    function (err) {
      if (err) {
        console.error('❌ Error saving profile:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log('✅ Profile saved successfully');
      res.json({ 
        success: true,
        influencerName,
        profilePhoto,
        handle,
        bio
      });
    }
  );
});

// Send message to influencer's inbox
app.post('/messages/send', (req, res) => {
  const { toInfluencer, postCode, message, senderType, senderEmail, senderName } = req.body;
  
  console.log('📨 New message for:', toInfluencer);
  
  db.run(
    `INSERT INTO messages (toInfluencer, postCode, message, senderType, senderEmail, senderName)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [toInfluencer, postCode, message, senderType, senderEmail, senderName],
    function (err) {
      if (err) {
        console.error('❌ Error saving message:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log('✅ Message saved to inbox');
      res.json({ 
        success: true,
        messageId: this.lastID
      });
    }
  );
});

// Get messages for influencer (inbox)
app.get('/messages/:influencerName', (req, res) => {
  const influencerName = req.params.influencerName;
  
  db.all(
    `SELECT * FROM messages WHERE toInfluencer = ? ORDER BY timestamp DESC`,
    [influencerName],
    (err, rows) => {
      if (err) {
        console.error('❌ Error fetching messages:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log(`📬 Found ${rows.length} messages for ${influencerName}`);
      res.json(rows);
    }
  );
});

// Mark message as read
app.put('/messages/:messageId/read', (req, res) => {
  const messageId = req.params.messageId;
  
  db.run(
    `UPDATE messages SET isRead = TRUE WHERE id = ?`,
    [messageId],
    function (err) {
      if (err) {
        console.error('❌ Error marking message as read:', err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    }
  );
});

// Get unread message count
app.get('/messages/:influencerName/unread-count', (req, res) => {
  const influencerName = req.params.influencerName;
  
  db.get(
    `SELECT COUNT(*) as count FROM messages WHERE toInfluencer = ? AND isRead = FALSE`,
    [influencerName],
    (err, row) => {
      if (err) {
        console.error('❌ Error counting unread messages:', err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ unreadCount: row.count });
    }
  );
});

// Create service request
app.post('/service-requests', async (req, res) => {
  const { serviceCode, influencerHandle, clientName, clientEmail, clientPhone, clientZipCode, selectedDates } = req.body;
  
  console.log('📅 New service request for:', influencerHandle);
  console.log('Selected dates:', selectedDates);
  
  db.run(
    `INSERT INTO service_requests (serviceCode, influencerHandle, clientName, clientEmail, clientPhone, clientZipCode, selectedDates, preferredTime)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [serviceCode, influencerHandle, clientName, clientEmail, clientPhone, clientZipCode, JSON.stringify(selectedDates), 'Individual per date'],
    async function (err) {
      if (err) {
        console.error('❌ Error saving service request:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      const requestId = this.lastID;
      console.log('✅ Service request saved with ID:', requestId);
      
      // Get service details and creator info for email
      db.get(
        `SELECT p.serviceName, p.fee, p.influencerName, c.name as creatorName
         FROM posts p 
         LEFT JOIN creators c ON p.influencerName = c.username
         WHERE p.code = ?`,
        [serviceCode],
        async (err, post) => {
          if (err) {
            console.error('❌ Error fetching service details:', err.message);
          } else {
            // Extract first name from creator's full name
            let creatorFirstName = 'Creator';
            if (post && post.creatorName) {
              creatorFirstName = post.creatorName.split(' ')[0]; // Get first name
            }
            
            // Send waitlist confirmation email
            const emailSubject = `Waitlist Confirmation`;
            const emailBody = generateWaitlistConfirmationEmail(clientName, post ? post.serviceName : 'Service', creatorFirstName, influencerHandle, selectedDates, requestId);
            
            try {
              await sendEmail(clientEmail, emailSubject, emailBody, requestId);
              console.log('📧 Waitlist confirmation email sent to:', clientEmail);
            } catch (emailError) {
              console.error('❌ Error sending waitlist confirmation email:', emailError);
            }
          }
        }
      );
      
      res.json({ 
        success: true,
        requestId: requestId
      });
    }
  );
});

// Get all service requests (admin view)
app.get('/service-requests/all', (req, res) => {
  db.all(
    `SELECT sr.*, p.amount as paymentAmount, p.status as paymentStatus, p.method as paymentMethod, p.completedAt as paymentDate
     FROM service_requests sr
     LEFT JOIN payments p ON sr.id = p.requestId
     ORDER BY sr.timestamp DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('❌ Error fetching all service requests:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log(`📋 Fetched ${rows.length} service requests`);
      res.json(rows);
    }
  );
});

// Get service requests for influencer
app.get('/service-requests/:influencerHandle', (req, res) => {
  const influencerHandle = req.params.influencerHandle;
  
  db.all(
    `SELECT sr.*, p.serviceName, p.fee, p2.amount as paymentAmount, p2.status as paymentStatus, p2.method as paymentMethod, p2.completedAt as paymentDate,
            r.selectedTimeSlot as confirmedAppointment
     FROM service_requests sr
     LEFT JOIN posts p ON sr.serviceCode = p.code
     LEFT JOIN payments p2 ON sr.id = p2.requestId
     LEFT JOIN reservations r ON sr.id = r.requestId AND r.status = 'confirmed'
     WHERE sr.influencerHandle = ? 
     ORDER BY sr.timestamp DESC`,
    [influencerHandle],
    (err, rows) => {
      if (err) {
        console.error('❌ Error fetching service requests:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      // Parse selectedDates JSON for each row
      const requests = rows.map(row => ({
        ...row,
        selectedDates: JSON.parse(row.selectedDates || '[]')
      }));
      
      console.log(`📋 Found ${requests.length} service requests for ${influencerHandle}`);
      res.json(requests);
    }
  );
});

// Get service requests for a specific salon
app.get('/service-requests/salon/:salonId', validateSession, (req, res) => {
  const salonId = req.params.salonId;
  
  console.log(`📋 Fetching service requests for salon: ${salonId}`);
  
  db.all(
    `SELECT sr.*, p.influencerName, p.serviceName, p.fee, p.city, p.state
     FROM service_requests sr
     JOIN posts p ON sr.serviceCode = p.code
     JOIN salons s ON p.code = s.influencerCode
     WHERE s.id = ?
     ORDER BY sr.timestamp DESC`,
    [salonId],
    (err, requests) => {
      if (err) {
        console.error('❌ Error fetching service requests for salon:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      // Parse selectedDates JSON for each row
      const parsedRequests = requests.map(row => ({
        ...row,
        selectedDates: JSON.parse(row.selectedDates || '[]')
      }));
      
      console.log(`📋 Found ${parsedRequests.length} service requests for salon ${salonId}`);
      res.json(parsedRequests);
    }
  );
});

// Get specific service request by ID with influencer information
app.get('/service-requests/id/:requestId', (req, res) => {
  const requestId = req.params.requestId;
  
  db.get(
    `SELECT sr.*, p.serviceName, p.fee, p.influencerName, p.coverPhoto, p2.amount as paymentAmount, p2.status as paymentStatus, p2.method as paymentMethod, p2.completedAt as paymentDate,
            r.selectedTimeSlot as confirmedAppointment, s.salonName, s.address, s.city, s.state, s.zipCode
     FROM service_requests sr
     LEFT JOIN posts p ON sr.serviceCode = p.code
     LEFT JOIN payments p2 ON sr.id = p2.requestId
     LEFT JOIN reservations r ON sr.id = r.requestId AND r.status = 'confirmed'
     LEFT JOIN salons s ON p.code = s.influencerCode
     WHERE sr.id = ?`,
    [requestId],
    (err, row) => {
      if (err) {
        console.error('❌ Error fetching service request:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Service request not found' });
      }
      
      // Parse selectedDates JSON
      const request = {
        ...row,
        selectedDates: JSON.parse(row.selectedDates || '[]')
      };
      
      console.log(`📋 Found service request ${requestId} for ${request.influencerName}`);
      res.json(request);
    }
  );
});

// Create Stripe checkout session
app.post('/create-checkout-session', async (req, res) => {
  const { requestId, selectedTimeSlot, serviceName, amount, clientEmail, clientName } = req.body;
  
  try {
    console.log('💳 Creating Stripe checkout session for request:', requestId);
    console.log('Amount:', amount, 'Service:', serviceName);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: serviceName,
              description: `Appointment booking for ${serviceName}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin}/booking-success.html?session_id={CHECKOUT_SESSION_ID}&requestId=${requestId}`,
      cancel_url: `${req.headers.origin}/appointment-system.html?request=${requestId}`,
      customer_email: clientEmail,
      metadata: {
        requestId: requestId,
        selectedTimeSlot: JSON.stringify(selectedTimeSlot),
        clientName: clientName,
        serviceName: serviceName
      }
    });
    
    console.log('✅ Stripe checkout session created:', session.id);
    res.json({ sessionId: session.id, url: session.url });
    
  } catch (error) {
    console.error('❌ Error creating Stripe checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle reschedule requests
app.post('/service-requests/:requestId/reschedule', async (req, res) => {
    try {
        const { requestId } = req.params;
        const { clientName, clientEmail, serviceName, preferredDates } = req.body;

        console.log('📅 Reschedule request received:', { requestId, clientName, preferredDates });

        // Update the service request status to indicate reschedule requested
        const updateQuery = `
            UPDATE service_requests 
            SET status = 'reschedule_requested',
                notes = COALESCE(notes, '') || ' | Reschedule requested: ' || ?
            WHERE id = ?
        `;
        
        const rescheduleDetails = JSON.stringify(preferredDates);
        await new Promise((resolve, reject) => {
            db.run(updateQuery, [rescheduleDetails, requestId], function(err) {
                if (err) {
                    console.error('❌ Database update error:', err);
                    reject(err);
                } else {
                    console.log('✅ Database updated successfully');
                    resolve(this);
                }
            });
        });

        // No email sent to client - they already know they submitted the reschedule request
        console.log('📅 Reschedule request processed - no email sent to client');

        res.json({ 
            success: true, 
            message: 'Reschedule request submitted successfully',
            requestId: requestId
        });

    } catch (error) {
        console.error('❌ Error handling reschedule request:', error);
        res.status(500).json({ error: 'Failed to process reschedule request' });
    }
});

// Duplicate webhook handler removed - using comprehensive one below

// Update service request status
app.put('/service-requests/:requestId/status', (req, res) => {
  const requestId = req.params.requestId;
  const { status } = req.body;
  
  db.run(
    `UPDATE service_requests SET status = ? WHERE id = ?`,
    [status, requestId],
    function (err) {
      if (err) {
        console.error('❌ Error updating service request:', err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    }
  );
});

// Salon responds with time options
app.post('/service-requests/:requestId/respond', async (req, res) => {
  const requestId = req.params.requestId;
  const { status, timeOptions, salonHandle } = req.body;
  
  console.log(`🏪 Salon ${salonHandle} responding to request ${requestId} with ${timeOptions.length} time options`);
  console.log('Time options:', timeOptions);
  
  // First, get the service request details for email
  db.get(
    `SELECT sr.*, p.serviceName, p.influencerName 
     FROM service_requests sr
     LEFT JOIN posts p ON sr.serviceCode = p.code
     WHERE sr.id = ?`,
    [requestId],
    async (err, request) => {
      if (err) {
        console.error('❌ Error fetching service request:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      if (!request) {
        return res.status(404).json({ error: 'Service request not found' });
      }
      
      // Update the status to 'responded'
      db.run(
        `UPDATE service_requests SET status = ? WHERE id = ?`,
        ['responded', requestId],
        function (err) {
          if (err) {
            console.error('❌ Error updating service request status:', err.message);
            return res.status(500).json({ error: err.message });
          }
          
          // Save time options to time_slots table for proper management
          const timeOptionsJson = JSON.stringify(timeOptions);
          
          // First, clear any existing time slots for this request
          db.run(
            `DELETE FROM time_slots WHERE requestId = ?`,
            [requestId],
            function (err) {
              if (err) {
                console.error('❌ Error clearing existing time slots:', err.message);
                return res.status(500).json({ error: err.message });
              }
              
              // Insert new time slots
              const insertPromises = timeOptions.map(timeOption => {
                return new Promise((resolve, reject) => {
                  const timeOptionString = JSON.stringify(timeOption);
                  db.run(
                    `INSERT INTO time_slots (requestId, timeOption, isAvailable) VALUES (?, ?, ?)`,
                    [requestId, timeOptionString, true],
                    function (err) {
                      if (err) reject(err);
                      else resolve();
                    }
                  );
                });
              });
              
              Promise.all(insertPromises).then(() => {
                console.log('✅ Time slots created successfully');
              }).catch((error) => {
                console.error('❌ Error creating time slots:', error);
                return res.status(500).json({ error: 'Failed to create time slots' });
              });
            }
          );
          
          // Also save to notes for backward compatibility
          db.run(
            `UPDATE service_requests SET notes = ? WHERE id = ?`,
            [`Salon time options: ${timeOptionsJson}`, requestId],
            async function (err) {
              if (err) {
                console.error('❌ Error saving time options to notes:', err.message);
                return res.status(500).json({ error: err.message });
              }
              
              // Send email notification to client
              try {
                const serviceName = request.serviceName || 'Service';
                const salonName = request.influencerName || salonHandle;
                const clientName = request.clientName || 'Valued Client';
                const clientEmail = request.clientEmail;
                
                if (clientEmail) {
                  const emailSubject = `HLFWRLD Waitlist Approval`;
                  const emailBody = generateEmailTemplate(clientName, serviceName, timeOptions, salonName, requestId);
                  
                  // Generate appointment management URL with a dynamic token
                  const clientToken = generateClientToken(requestId);
                  const appointmentManagementUrl = `https://www.hlfwrld.com/Booking/appointment-system.html?requestId=${requestId}&token=${clientToken}`;
                  
                            const emailWithLink = emailBody + `
          <div style="margin-top: 20px; text-align: center;">
            <a href="${appointmentManagementUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Book Appointment & Complete Payment
            </a>
          </div>
          <p style="margin: 12px 0; font-size: 14px; color: black; text-align: center;">
            Or copy and paste this link: ${appointmentManagementUrl}
          </p>
          <div style="margin-top: 20px; color: black;">
            <p style="color: black; margin: 0;">Best,<br>
            The Hlfwrld Team<br>
            contact@hlfwrld.com</p>
          </div>`;
                  
                  const emailResult = await sendEmail(clientEmail, emailSubject, emailWithLink, requestId);
                  console.log('📧 Email sent to client with appointment management link:', emailResult);
                  
                  // Create reservation with 1-hour expiration
                  const reservationToken = generateReservationToken(requestId);
                  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
                  
                  db.run(
                    `INSERT INTO reservations (requestId, token, expiresAt) VALUES (?, ?, ?)`,
                    [requestId, reservationToken, expiresAt.toISOString()],
                    function (err) {
                      if (err) {
                        console.error('❌ Error creating reservation:', err.message);
                      } else {
                        console.log('⏰ Reservation created with 1-hour expiration');
                      }
                    }
                  );
                } else {
                  console.log('⚠️ No client email found, skipping email notification');
                }
              } catch (emailError) {
                console.error('❌ Error sending email:', emailError);
                // Don't fail the request if email fails
              }
              
              res.json({ 
                success: true,
                message: 'Time options sent successfully and client notified',
                timeOptions: timeOptions
              });
            }
          );
        }
      );
    }
  );
});

// Create messages table
db.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversationId TEXT NOT NULL,
    senderId TEXT NOT NULL,
    senderType TEXT NOT NULL,
    recipientId TEXT NOT NULL,
    recipientType TEXT NOT NULL,
    messageText TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    read BOOLEAN DEFAULT FALSE,
    requestId INTEGER,
    FOREIGN KEY (requestId) REFERENCES service_requests (id)
  )
`);

// Create conversations table
db.run(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    requestId INTEGER NOT NULL,
    clientId TEXT NOT NULL,
    salonId TEXT NOT NULL,
    serviceName TEXT NOT NULL,
    serviceFee DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'active',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requestId) REFERENCES service_requests (id)
  )
`);

// Create notifications table
db.run(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    userType TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    actionUrl TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Get conversations for a user
app.get('/conversations/:userId/:userType', (req, res) => {
  const { userId, userType } = req.params;
  
  console.log(`📱 Loading conversations for ${userType}: ${userId}`);
  
  const query = `
    SELECT c.*, sr.clientName, sr.clientEmail, sr.clientPhone, sr.clientZipCode,
           sr.selectedDates, sr.status as requestStatus,
           (SELECT messageText FROM messages WHERE conversationId = c.id ORDER BY timestamp DESC LIMIT 1) as lastMessage,
           (SELECT timestamp FROM messages WHERE conversationId = c.id ORDER BY timestamp DESC LIMIT 1) as lastMessageTime,
           (SELECT COUNT(*) FROM messages WHERE conversationId = c.id AND recipientId = ? AND recipientType = ? AND read = FALSE) as unreadCount
    FROM conversations c
    JOIN service_requests sr ON c.requestId = sr.id
    WHERE (c.clientId = ? AND ? = 'client') OR (c.salonId = ? AND ? = 'salon')
    ORDER BY c.updatedAt DESC
  `;
  
  db.all(query, [userId, userType, userId, userType, userId, userType], (err, rows) => {
    if (err) {
      console.error('❌ Error loading conversations:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    console.log(`✅ Found ${rows.length} conversations`);
    res.json(rows);
  });
});

// Get messages for a conversation
app.get('/messages/:conversationId', (req, res) => {
  const conversationId = req.params.conversationId;
  
  console.log(`💬 Loading messages for conversation: ${conversationId}`);
  
  db.all(
    `SELECT * FROM messages WHERE conversationId = ? ORDER BY timestamp ASC`,
    [conversationId],
    (err, rows) => {
      if (err) {
        console.error('❌ Error loading messages:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      console.log(`✅ Found ${rows.length} messages`);
      res.json(rows);
    }
  );
});

// Send a message
app.post('/messages', (req, res) => {
  const { conversationId, senderId, senderType, recipientId, recipientType, messageText, requestId } = req.body;
  
  console.log(`📤 Sending message from ${senderType} ${senderId} to ${recipientType} ${recipientId}`);
  
  db.run(
    `INSERT INTO messages (conversationId, senderId, senderType, recipientId, recipientType, messageText, requestId)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [conversationId, senderId, senderType, recipientId, recipientType, messageText, requestId],
    function (err) {
      if (err) {
        console.error('❌ Error sending message:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      // Update conversation timestamp
      db.run(
        `UPDATE conversations SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [conversationId]
      );
      
      // Create notification for recipient
      const notificationTitle = senderType === 'salon' ? 'New message from salon' : 'New message from client';
      db.run(
        `INSERT INTO notifications (userId, userType, title, message, type, actionUrl)
         VALUES (?, ?, ?, ?, 'message', ?)`,
        [recipientId, recipientType, notificationTitle, messageText.substring(0, 100) + '...', `/messaging-system.html?type=${recipientType}&user=${recipientId}`]
      );
      
      console.log('✅ Message sent successfully');
      res.json({ success: true, messageId: this.lastID });
    }
  );
});

// Create or get conversation
app.post('/conversations', (req, res) => {
  const { requestId, clientId, salonId, serviceName, serviceFee } = req.body;
  
  const conversationId = `conv_${requestId}_${Date.now()}`;
  
  console.log(`🆕 Creating conversation for request ${requestId}`);
  
  db.run(
    `INSERT INTO conversations (id, requestId, clientId, salonId, serviceName, serviceFee)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [conversationId, requestId, clientId, salonId, serviceName, serviceFee],
    function (err) {
      if (err) {
        console.error('❌ Error creating conversation:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      console.log('✅ Conversation created successfully');
      res.json({ success: true, conversationId });
    }
  );
});

// Mark messages as read
app.put('/messages/:conversationId/read', (req, res) => {
  const conversationId = req.params.conversationId;
  const { userId, userType } = req.body;
  
  db.run(
    `UPDATE messages SET read = TRUE WHERE conversationId = ? AND recipientId = ? AND recipientType = ?`,
    [conversationId, userId, userType],
    function (err) {
      if (err) {
        console.error('❌ Error marking messages as read:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      console.log(`✅ Marked messages as read for ${userType} ${userId}`);
      res.json({ success: true });
    }
  );
});

// Get notifications for a user
app.get('/notifications/:userId/:userType', (req, res) => {
  const { userId, userType } = req.params;
  
  db.all(
    `SELECT * FROM notifications WHERE userId = ? AND userType = ? ORDER BY createdAt DESC LIMIT 50`,
    [userId, userType],
    (err, rows) => {
      if (err) {
        console.error('❌ Error loading notifications:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      res.json(rows);
    }
  );
});

  // Create payments table
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requestId INTEGER NOT NULL,
      transactionId TEXT UNIQUE NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      currency TEXT DEFAULT 'USD',
      method TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      processingFee DECIMAL(10,2) DEFAULT 0,
      platformFee DECIMAL(10,2) DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      completedAt DATETIME,
      FOREIGN KEY (requestId) REFERENCES service_requests (id)
    )
  `);

  // Create email logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requestId INTEGER,
      recipientEmail TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT DEFAULT 'sent',
      messageId TEXT,
      sentAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requestId) REFERENCES service_requests (id)
    )
  `);

  // Create reservations table for time-limited bookings
  db.run(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requestId INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      selectedTimeSlot TEXT,
      status TEXT DEFAULT 'pending',
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requestId) REFERENCES service_requests (id)
    )
  `);

  // Create time_slots table for proper time slot management and double booking prevention
  db.run(`
    CREATE TABLE IF NOT EXISTS time_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requestId INTEGER NOT NULL,
      timeOption TEXT NOT NULL,
      isAvailable BOOLEAN DEFAULT TRUE,
      reservedBy TEXT,
      reservedAt DATETIME,
      expiresAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requestId) REFERENCES service_requests (id)
    )
  `);

  // Note: salons table is already created above with influencerCode field

// Get email logs for a service request
app.get('/email-logs/:requestId', (req, res) => {
  const requestId = req.params.requestId;
  
  db.all(
    `SELECT * FROM email_logs WHERE requestId = ? ORDER BY sentAt DESC`,
    [requestId],
    (err, rows) => {
      if (err) {
        console.error('❌ Error fetching email logs:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      console.log(`📧 Found ${rows.length} email logs for request ${requestId}`);
      res.json(rows);
    }
  );
});

// Get reservation details
app.get('/reservations/:requestId', (req, res) => {
  const requestId = req.params.requestId;
  const token = req.query.token;
  
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  
  // Get reservation with service request details
  db.get(
    `SELECT r.*, sr.*, p.serviceName, p.salonName
     FROM reservations r
     JOIN service_requests sr ON r.requestId = sr.id
     LEFT JOIN posts p ON sr.serviceCode = p.code
     WHERE r.requestId = ? AND r.token = ?`,
    [requestId, token],
    (err, reservation) => {
      if (err) {
        console.error('❌ Error fetching reservation:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      if (!reservation) {
        return res.status(404).json({ error: 'Reservation not found' });
      }
      
      // Check if reservation is expired
      const now = new Date();
      const expiresAt = new Date(reservation.expiresAt);
      
      if (now > expiresAt) {
        return res.json({ 
          expired: true,
          message: 'Reservation has expired'
        });
      }
      
      // Parse time options from notes
      let timeOptions = [];
      try {
        const notesMatch = reservation.notes?.match(/Salon time options: (\[.*\])/);
        if (notesMatch) {
          timeOptions = JSON.parse(notesMatch[1]);
        }
      } catch (error) {
        console.error('Error parsing time options:', error);
      }
      
      console.log(`⏰ Found active reservation for request ${requestId}`);
      
      res.json({
        requestId: reservation.requestId,
        serviceName: reservation.serviceName,
        salonName: reservation.salonName,
        timeOptions: timeOptions,
        expiresAt: reservation.expiresAt,
        expired: false
      });
    }
  );
});

// Confirm reservation and create Stripe checkout
app.post('/reservations/:requestId/confirm', (req, res) => {
  const requestId = req.params.requestId;
  const { token, selectedTimeSlot } = req.body;
  
  if (!token || !selectedTimeSlot) {
    return res.status(400).json({ error: 'Token and selected time slot are required' });
  }
  
  // Verify reservation is still valid
  db.get(
    `SELECT r.*, sr.*, p.serviceName, p.fee, p.salonName
     FROM reservations r
     JOIN service_requests sr ON r.requestId = sr.id
     LEFT JOIN posts p ON sr.serviceCode = p.code
     WHERE r.requestId = ? AND r.token = ? AND r.status = 'pending'`,
    [requestId, token],
    (err, reservation) => {
      if (err) {
        console.error('❌ Error fetching reservation:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      if (!reservation) {
        return res.status(404).json({ error: 'Reservation not found or already confirmed' });
      }
      
      // Check if reservation is expired
      const now = new Date();
      const expiresAt = new Date(reservation.expiresAt);
      
      if (now > expiresAt) {
        return res.status(400).json({ error: 'Reservation has expired' });
      }
      
      // Generate client token for appointment management
      const clientToken = generateClientToken(requestId);
      
      // Update reservation with selected time slot and client token
      db.run(
        `UPDATE reservations SET selectedTimeSlot = ?, status = 'confirmed', clientToken = ? WHERE requestId = ? AND token = ?`,
        [JSON.stringify(selectedTimeSlot), clientToken, requestId, token],
        function (err) {
          if (err) {
            console.error('❌ Error updating reservation:', err.message);
            return res.status(500).json({ error: err.message });
          }
          
          // Create mock Stripe checkout URL (replace with actual Stripe integration)
          const checkoutUrl = createStripeCheckoutUrl(reservation, selectedTimeSlot);
          
                  // Generate appointment management link
        const appointmentLink = `http://${FRONTEND_DOMAIN}/appointment-system.html?request=${requestId}`;
          
          console.log(`✅ Reservation confirmed for request ${requestId}`);
          console.log(`💳 Stripe checkout URL: ${checkoutUrl}`);
          console.log(`🔗 Appointment management link: ${appointmentLink}`);
          
          res.json({
            success: true,
            checkoutUrl: checkoutUrl,
            appointmentLink: appointmentLink,
            clientToken: clientToken
          });
        }
      );
    }
  );
});

function createStripeCheckoutUrl(reservation, selectedTimeSlot) {
  // Mock Stripe checkout URL - replace with actual Stripe integration
  const baseUrl = 'https://checkout.stripe.com/pay/';
  const params = new URLSearchParams({
    'client_reference_id': reservation.requestId,
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][product_data][name]': reservation.serviceName,
    'line_items[0][price_data][unit_amount]': Math.round((reservation.fee || 50) * 100), // Convert to cents
    'line_items[0][quantity]': '1',
    'mode': 'payment',
    'success_url': `http://${FRONTEND_DOMAIN}/booking-success.html?session_id={CHECKOUT_SESSION_ID}`,
    'cancel_url': `http://${FRONTEND_DOMAIN}/reservation.html?requestId=${reservation.requestId}&token=${reservation.token}`
  });
  
  // For demo purposes, redirect to a mock checkout page
  return `http://${FRONTEND_DOMAIN}/mock-checkout.html?${params.toString()}`;
}

// Old salon signup endpoint removed - using /salon/signup instead

// Old salon login endpoint removed - using /salon/login instead

// Get available signup codes (for salons to see which codes they can use)
app.get('/posts/signup-codes', (req, res) => {
  db.all(
    `SELECT code, salonName, serviceName, city, state 
     FROM posts 
     WHERE salonName IS NOT NULL AND salonName != ''
     ORDER BY salonName`,
    [],
    (err, posts) => {
      if (err) {
        console.error('❌ Error fetching signup codes:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      console.log(`📋 Found ${posts.length} posts with salon names`);
      res.json(posts);
    }
  );
});

// Process payment confirmation
app.post('/payments/confirm', (req, res) => {
  const { requestId, transactionId, amount, method, status } = req.body;
  
  console.log(`💳 Processing payment confirmation:`);
  console.log(`Request ID: ${requestId}`);
  console.log(`Transaction ID: ${transactionId}`);
  console.log(`Amount: $${amount}`);
  console.log(`Method: ${method}`);
  
  db.run(
    `INSERT INTO payments (requestId, transactionId, amount, method, status, completedAt)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [requestId, transactionId, amount, method, status],
    function (err) {
      if (err) {
        console.error('❌ Error saving payment:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      // Update service request status to confirmed
      db.run(
        `UPDATE service_requests SET status = 'confirmed' WHERE id = ?`,
        [requestId]
      );
      
      console.log('✅ Payment confirmed and saved');
      res.json({ success: true, paymentId: this.lastID });
    }
  );
});

// Get payment details
app.get('/payments/:requestId', (req, res) => {
  const requestId = req.params.requestId;
  
  db.get(
    `SELECT * FROM payments WHERE requestId = ? ORDER BY createdAt DESC LIMIT 1`,
    [requestId],
    (err, row) => {
      if (err) {
        console.error('❌ Error loading payment:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      
      res.json(row);
    }
  );
});

// Process refund
app.post('/payments/:transactionId/refund', (req, res) => {
  const transactionId = req.params.transactionId;
  const { amount, reason } = req.body;
  
  console.log(`🔄 Processing refund for transaction: ${transactionId}`);
  console.log(`Refund amount: $${amount}`);
  console.log(`Reason: ${reason}`);
  
  db.run(
    `UPDATE payments SET status = 'refunded' WHERE transactionId = ?`,
    [transactionId],
    function (err) {
      if (err) {
        console.error('❌ Error processing refund:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      // In a real implementation, process actual refund with payment processor
      console.log('✅ Refund processed (mock)');
      res.json({ success: true, message: 'Refund processed successfully' });
    }
  );
});

// Send email notification (mock implementation)
app.post('/notifications/email', (req, res) => {
  const { to, subject, message, type } = req.body;
  
  console.log(`📧 Sending email notification:`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Message: ${message}`);
  console.log(`Type: ${type}`);
  
  // In a real implementation, you would integrate with an email service like:
  // - SendGrid
  // - AWS SES
  // - Nodemailer with SMTP
  
  // For now, we'll just log and return success
  console.log('✅ Email notification sent (mock)');
  res.json({ success: true, message: 'Email notification sent' });
});

// ===== APPOINTMENT MANAGEMENT SYSTEM =====

// Generate unique client token for appointment management
function generateClientToken(requestId) {
  return `client_${requestId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateSalonConfirmationToken(requestId) {
  return `salon_confirm_${requestId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get appointment details for client management
app.get('/appointments/:requestId', (req, res) => {
  const requestId = req.params.requestId;
  const clientToken = req.query.token;
  
  if (!clientToken) {
    return res.status(400).json({ error: 'Client token required' });
  }
  
  db.get(
    `SELECT sr.*, p.serviceName, p.fee, p.influencerName, p.coverPhoto, 
            p2.amount as paymentAmount, p2.status as paymentStatus, p2.method as paymentMethod, p2.completedAt as paymentDate,
            r.selectedTimeSlot as confirmedAppointment, r.clientToken
     FROM service_requests sr
     LEFT JOIN posts p ON sr.serviceCode = p.code
     LEFT JOIN payments p2 ON sr.id = p2.requestId
     LEFT JOIN reservations r ON sr.id = r.requestId AND r.status = 'confirmed'
     WHERE sr.id = ? AND r.clientToken = ?`,
    [requestId, clientToken],
    (err, row) => {
      if (err) {
        console.error('❌ Error fetching appointment:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Appointment not found or invalid token' });
      }
      
      // Parse confirmed appointment data
      const appointment = {
        ...row,
        confirmedAppointment: row.confirmedAppointment ? JSON.parse(row.confirmedAppointment) : null
      };
      
      console.log(`📅 Found appointment ${requestId} for client management`);
      res.json(appointment);
    }
  );
});

// Request appointment reschedule
app.post('/appointments/:requestId/reschedule', (req, res) => {
  const requestId = req.params.requestId;
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Client token required' });
  }
  
  // Verify the appointment exists and token is valid
  db.get(
    `SELECT sr.*, r.clientToken FROM service_requests sr
     LEFT JOIN reservations r ON sr.id = r.requestId AND r.status = 'confirmed'
     WHERE sr.id = ? AND r.clientToken = ?`,
    [requestId, token],
    (err, row) => {
      if (err) {
        console.error('❌ Error verifying appointment:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Appointment not found or invalid token' });
      }
      
      // Update service request status to indicate reschedule request
      db.run(
        `UPDATE service_requests SET status = 'reschedule_requested', notes = CONCAT(COALESCE(notes, ''), '\nReschedule requested by client on ', CURRENT_TIMESTAMP) WHERE id = ?`,
        [requestId],
        function (err) {
          if (err) {
            console.error('❌ Error updating appointment status:', err.message);
            return res.status(500).json({ error: err.message });
          }
          
          console.log(`📅 Reschedule requested for appointment ${requestId}`);
          
          // Send notification to salon (in real implementation)
          // sendEmail(salonEmail, 'Reschedule Request', `Client has requested to reschedule appointment ${requestId}`);
          
          res.json({ success: true, message: 'Reschedule request sent to salon' });
        }
      );
    }
  );
});

// Cancel appointment
app.post('/appointments/:requestId/cancel', (req, res) => {
  const requestId = req.params.requestId;
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Client token required' });
  }
  
  // Verify the appointment exists and token is valid
  db.get(
    `SELECT sr.*, r.clientToken FROM service_requests sr
     LEFT JOIN reservations r ON sr.id = r.requestId AND r.status = 'confirmed'
     WHERE sr.id = ? AND r.clientToken = ?`,
    [requestId, token],
    (err, row) => {
      if (err) {
        console.error('❌ Error verifying appointment:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Appointment not found or invalid token' });
      }
      
      // Update service request status to cancelled
      db.run(
        `UPDATE service_requests SET status = 'cancelled', notes = CONCAT(COALESCE(notes, ''), '\nCancelled by client on ', CURRENT_TIMESTAMP) WHERE id = ?`,
        [requestId],
        function (err) {
          if (err) {
            console.error('❌ Error cancelling appointment:', err.message);
            return res.status(500).json({ error: err.message });
          }
          
          console.log(`❌ Appointment ${requestId} cancelled by client`);
          
          // Send notification to salon (in real implementation)
          // sendEmail(salonEmail, 'Appointment Cancelled', `Client has cancelled appointment ${requestId}`);
          
          res.json({ success: true, message: 'Appointment cancelled successfully' });
        }
      );
    }
  );
});

// Generate appointment management link (called when appointment is confirmed)
app.post('/appointments/:requestId/generate-link', (req, res) => {
  const requestId = req.params.requestId;
  
  // Generate unique client token
  const clientToken = generateClientToken(requestId);
  
  // Store the client token in the reservations table
  db.run(
    `UPDATE reservations SET clientToken = ? WHERE requestId = ? AND status = 'confirmed'`,
    [clientToken, requestId],
    function (err) {
      if (err) {
        console.error('❌ Error generating appointment link:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      const appointmentLink = `http://${FRONTEND_DOMAIN}/appointment-system.html?request=${requestId}`;
      
      console.log(`🔗 Generated appointment management link for request ${requestId}`);
      res.json({ 
        success: true, 
        appointmentLink: appointmentLink,
        clientToken: clientToken
      });
    }
  );
});

// ===== CREATOR AUTHENTICATION ENDPOINTS =====

// List of reserved usernames (famous people, common words, etc.)
const RESERVED_USERNAMES = [
  'admin', 'root', 'system', 'user', 'test', 'demo', 'guest', 'anonymous',
  'elon', 'musk', 'zuckerberg', 'mark', 'jeff', 'bezos', 'bill', 'gates',
  'steve', 'jobs', 'tim', 'cook', 'sundar', 'pichai', 'satya', 'nadella',
  'larry', 'page', 'sergey', 'brin', 'jack', 'dorsey', 'evan', 'spiegel',
  'kevin', 'systrom', 'brian', 'chesky', 'joe', 'gebbia', 'nathan', 'blecharczyk',
  'travis', 'kalanick', 'garrett', 'camp', 'daniel', 'ek', 'martin', 'lorentzon',
  'brian', 'armstrong', 'vitalik', 'buterin', 'changpeng', 'zhao', 'sam', 'bankman',
  'john', 'doe', 'jane', 'smith', 'bob', 'alice', 'johnny', 'appleseed',
  'superman', 'batman', 'spiderman', 'ironman', 'captain', 'america', 'thor', 'hulk',
  'mickey', 'mouse', 'donald', 'duck', 'goofy', 'pluto', 'minnie', 'mouse',
  'harry', 'potter', 'hermione', 'ron', 'weasley', 'dumbledore', 'voldemort',
  'luke', 'skywalker', 'han', 'solo', 'leia', 'princess', 'darth', 'vader',
  'frodo', 'baggins', 'gandalf', 'aragorn', 'legolas', 'gimli', 'samwise', 'gamgee',
  'mario', 'luigi', 'peach', 'bowser', 'yoshi', 'toad', 'wario', 'waluigi',
  'pikachu', 'ash', 'misty', 'brock', 'gary', 'oak', 'professor', 'team', 'rocket'
];

// Helper function to check if username is reserved
function isReservedUsername(username) {
  const lowerUsername = username.toLowerCase();
  return RESERVED_USERNAMES.some(reserved => 
    lowerUsername === reserved.toLowerCase() || 
    lowerUsername.includes(reserved.toLowerCase())
  );
}

// Helper function to hash password (in production, use bcrypt)
function hashPassword(password) {
  // Simple hash for demo - in production use bcrypt
  return Buffer.from(password).toString('base64');
}

// Helper function to verify password
function verifyPassword(password, hashedPassword) {
  return hashPassword(password) === hashedPassword;
}

// Username availability check endpoint
app.get('/creator/check-username', (req, res) => {
  const { username } = req.query;
  
  if (!username) {
    return res.status(400).json({ error: 'Username parameter is required' });
  }
  
  if (username.length < 3 || username.length > 20) {
    return res.json({ available: false, error: 'Username must be between 3 and 20 characters' });
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.json({ available: false, error: 'Username can only contain letters, numbers, and underscores' });
  }
  
  // Check if username is reserved
  if (isReservedUsername(username)) {
    return res.json({ available: false, error: 'This username is not available' });
  }
  
  // Check if username already exists
  db.get('SELECT id FROM creators WHERE username = ?', [username], (err, result) => {
    if (err) {
      console.error('❌ Error checking username availability:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    const available = !result;
    console.log(`🔍 Username check: ${username} - ${available ? 'Available' : 'Taken'}`);
    
    res.json({ 
      available,
      message: available ? 'Username is available' : 'Username is already taken'
    });
  });
});

// Test endpoint to check if API is working
app.get('/test', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

// Test database connection
app.get('/test-db', (req, res) => {
  console.log('🔧 Testing database connection...');
  
  if (!db) {
    return res.status(500).json({ 
      error: 'Database not initialized', 
      timestamp: new Date().toISOString()
    });
  }
  
  const timeout = setTimeout(() => {
    res.status(500).json({ 
      error: 'Database query timeout', 
      timestamp: new Date().toISOString()
    });
  }, 5000);
  
  db.get('SELECT COUNT(*) as count FROM creators', (err, result) => {
    clearTimeout(timeout);
    
    if (err) {
      console.error('❌ Database test failed:', err.message);
      return res.status(500).json({ 
        error: 'Database connection failed', 
        details: err.message,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('✅ Database test successful:', result);
    res.json({ 
      message: 'Database connection working!', 
      creatorCount: result.count,
      timestamp: new Date().toISOString()
    });
  });
});

// Force database recreation
app.post('/force-db-reset', (req, res) => {
  console.log('🔄 Force database reset requested...');
  
  try {
    initializeDatabase();
    
    setTimeout(() => {
      res.json({ 
        message: 'Database forcefully reset and recreated', 
        timestamp: new Date().toISOString()
      });
    }, 2000);
    
  } catch (error) {
    console.error('❌ Force reset failed:', error.message);
    res.status(500).json({ 
      error: 'Force reset failed', 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Creator signup
app.post('/creators/signup', (req, res) => {
  console.log('🚀 Creator signup request received:', { username: req.body.username, email: req.body.email });
  console.log('📋 Full request body:', req.body);
  
  const { name, email, phone, zipCode, instagram, username, password, state } = req.body;

  // Validation
  if (!name || !email || !phone || !zipCode || !username || !password || !state) {
    return res.status(400).json({ error: 'All required fields must be provided' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
  }

  // Check if username is reserved
  if (isReservedUsername(username)) {
    return res.status(400).json({ error: 'This username is not available' });
  }

  console.log('🔍 Checking if email exists:', email);
  
  // Check if email already exists
  db.get('SELECT id FROM creators WHERE email = ?', [email], (err, emailResult) => {
    if (err) {
      console.error('❌ Error checking existing email:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    console.log('✅ Email check completed. Existing:', !!emailResult);

    if (emailResult) {
      return res.status(400).json({ error: 'Email already exists. Please use a different email address.' });
    }

    // Check if username already exists
    db.get('SELECT id FROM creators WHERE username = ?', [username], (err, usernameResult) => {
      if (err) {
        console.error('❌ Error checking existing username:', err.message);
        return res.status(500).json({ error: err.message });
      }

      if (usernameResult) {
        return res.status(400).json({ error: 'Username already exists. Please choose a different username.' });
      }

      // Hash password
      const hashedPassword = hashPassword(password);

      // Generate unique influencer code with timeout protection
      const generateUniqueCode = (attempts = 0) => {
        if (attempts > 5) {
          // Fallback: create account without influencer code to avoid hanging
          console.log('⚠️ Max attempts reached, creating account without influencer code');
          return createAccountFallback();
        }

        const code = generateInfluencerCode();
        
        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          console.log('⚠️ Code check timeout, using fallback');
          createAccountFallback();
        }, 3000);
        
        isUniqueInfluencerCode(code, (err, isUnique) => {
          clearTimeout(timeout);
          
          if (err) {
            console.error('❌ Error checking code uniqueness:', err.message);
            return createAccountFallback();
          }
          
          if (!isUnique) {
            // Try again with a different code
            generateUniqueCode(attempts + 1);
            return;
          }
          
          // Create creator account with unique code
          db.run(
            `INSERT INTO creators (name, email, phone, zipCode, instagram, username, password, state, influencerCode, isVerified)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, email, phone, zipCode, instagram || null, username, hashedPassword, state, code, true], // Auto-verify for demo
            function (err) {
              if (err) {
                console.error('❌ Error creating creator account with code:', err.message);
                return createAccountFallback();
              }

              console.log(`✅ Creator account created: ${username} (${email}) with code: ${code}`);

              res.json({
                success: true,
                message: 'Creator account created successfully',
                creatorId: this.lastID,
                influencerCode: code
              });
            }
          );
        });
      };
      
      // Fallback function to create account without influencer code
      const createAccountFallback = () => {
        console.log('🔄 Creating account without influencer code as fallback');
        db.run(
          `INSERT INTO creators (name, email, phone, zipCode, instagram, username, password, state, isVerified)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [name, email, phone, zipCode, instagram || null, username, hashedPassword, state, true],
          function (err) {
            if (err) {
              console.error('❌ Error creating creator account (fallback):', err.message);
              return res.status(500).json({ error: err.message });
            }

            console.log(`✅ Creator account created (fallback): ${username} (${email})`);

            res.json({
              success: true,
              message: 'Creator account created successfully',
              creatorId: this.lastID
            });
          }
        );
      };
      
      generateUniqueCode();
    });
  });
});

// Creator login
app.post('/creators/login', (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username/email and password are required' });
  }

  // Find creator by email or username
  db.get(
    `SELECT * FROM creators WHERE email = ? OR username = ?`,
    [identifier, identifier],
    (err, creator) => {
      if (err) {
        console.error('❌ Error during creator login:', err.message);
        return res.status(500).json({ error: err.message });
      }

      if (!creator) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      if (!verifyPassword(password, creator.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate simple token (in production, use JWT)
      const token = Buffer.from(`${creator.id}_${Date.now()}_${process.env.SECRET_KEY || 'default'}`).toString('base64');

      console.log(`✅ Creator logged in: ${creator.username} (${creator.email})`);

      // Return creator data (without password)
      const { password: _, ...creatorData } = creator;

      res.json({
        success: true,
        message: 'Login successful',
        token: token,
        creator: creatorData
      });
    }
  );
});

// Get creator profile (protected route)
app.get('/creators/profile', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  // In production, verify JWT token here
  // For demo, we'll use a simple token format: creatorId_timestamp_secret
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [creatorId] = decoded.split('_');

    db.get(
      `SELECT id, name, email, phone, zipCode, instagram, username, state, influencerCode, isVerified, createdAt 
       FROM creators WHERE id = ?`,
      [creatorId],
      (err, creator) => {
        if (err) {
          console.error('❌ Error fetching creator profile:', err.message);
          return res.status(500).json({ error: err.message });
        }

        if (!creator) {
          return res.status(404).json({ error: 'Creator not found' });
        }

        res.json({
          success: true,
          creator: creator
        });
      }
    );
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Get creator information including influencer code
app.get('/creators/:creatorId/info', (req, res) => {
  const { creatorId } = req.params;
  
  db.get(
    `SELECT id, name, email, phone, zipCode, instagram, username, state, influencerCode, isVerified, createdAt 
     FROM creators WHERE id = ?`,
    [creatorId],
    (err, creator) => {
      if (err) {
        console.error('❌ Error fetching creator info:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }
      
      res.json({
        success: true,
        creator: creator
      });
    }
  );
});

// Update creator profile
app.put('/creators/profile', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { name, phone, zipCode, instagram } = req.body;

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [creatorId] = decoded.split('_');

    db.run(
      `UPDATE creators SET name = ?, phone = ?, zipCode = ?, instagram = ?, updatedAt = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [name, phone, zipCode, instagram, creatorId],
      function (err) {
        if (err) {
          console.error('❌ Error updating creator profile:', err.message);
          return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Creator not found' });
        }

        console.log(`✅ Creator profile updated: ${creatorId}`);

        res.json({
          success: true,
          message: 'Profile updated successfully'
        });
      }
    );
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Stripe Connect endpoints for creators
app.get('/creator/stripe-status', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [creatorId] = decoded.split('_');

    db.get(
      `SELECT stripeAccountId FROM creators WHERE id = ?`,
      [creatorId],
      (err, creator) => {
        if (err) {
          console.error('❌ Error checking Stripe status:', err.message);
          return res.status(500).json({ error: err.message });
        }

        if (!creator) {
          return res.status(404).json({ error: 'Creator not found' });
        }

        res.json({
          connected: !!creator.stripeAccountId,
          stripeAccountId: creator.stripeAccountId
        });
      }
    );
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/creator/stripe-connect', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [creatorId] = decoded.split('_');

    // Create Stripe Connect account link
    const accountLink = await stripe.accountLinks.create({
      account: await createStripeAccount(creatorId),
      refresh_url: `${process.env.FRONTEND_DOMAIN || 'http://localhost:8000'}/digitalshop.html`,
      return_url: `${process.env.FRONTEND_DOMAIN || 'http://localhost:8000'}/digitalshop.html`,
      type: 'account_onboarding',
    });

    res.json({
      success: true,
      url: accountLink.url
    });
  } catch (error) {
    console.error('❌ Error creating Stripe Connect link:', error);
    res.status(500).json({ error: 'Failed to create Stripe Connect link' });
  }
});

app.post('/creator/stripe-disconnect', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [creatorId] = decoded.split('_');

    db.run(
      `UPDATE creators SET stripeAccountId = NULL WHERE id = ?`,
      [creatorId],
      function (err) {
        if (err) {
          console.error('❌ Error disconnecting Stripe:', err.message);
          return res.status(500).json({ error: err.message });
        }

        console.log(`✅ Stripe disconnected for creator: ${creatorId}`);

        res.json({
          success: true,
          message: 'Stripe account disconnected successfully'
        });
      }
    );
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Helper function to create Stripe Connect account
async function createStripeAccount(creatorId) {
  return new Promise((resolve, reject) => {
    // Check if creator already has a Stripe account
    db.get(
      `SELECT stripeAccountId, email FROM creators WHERE id = ?`,
      [creatorId],
      async (err, creator) => {
        if (err) {
          reject(new Error('Database error'));
          return;
        }

        if (!creator) {
          reject(new Error('Creator not found'));
          return;
        }

        if (creator.stripeAccountId) {
          resolve(creator.stripeAccountId);
          return;
        }

        try {
          // Create new Stripe Connect account
          const account = await stripe.accounts.create({
            type: 'express',
            country: 'US',
            email: creator.email,
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
          });

          // Save Stripe account ID to database
          db.run(
            `UPDATE creators SET stripeAccountId = ? WHERE id = ?`,
            [account.id, creatorId],
            (err) => {
              if (err) {
                console.error('❌ Error saving Stripe account ID:', err.message);
                reject(err);
              } else {
                console.log(`✅ Stripe account created for creator: ${creatorId}`);
                resolve(account.id);
              }
            }
          );
        } catch (error) {
          console.error('❌ Error creating Stripe account:', error);
          reject(error);
        }
      }
    );
  });
}

// Contact form endpoint
app.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    console.log('📧 Contact form submitted:', { name, email, subject, message });

    // Save contact submission to database
    db.run(
      `INSERT INTO contact_submissions (name, email, subject, message)
       VALUES (?, ?, ?, ?)`,
      [name, email, subject, message],
      function (err) {
        if (err) {
          console.error('❌ Error saving contact submission:', err.message);
        } else {
          console.log('📝 Contact submission saved to database');
        }
      }
    );

    // Create email body
    const emailBody = `
New Contact Form Submission

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
This message was sent from the Hlfwrld contact form.
    `.trim();

    // Send email to contact@hlfwrld.com
    const contactEmail = process.env.CONTACT_EMAIL || 'contact@hlfwrld.com';
    const contactEmailResult = await sendEmail(
      contactEmail,
      `Contact Form: ${subject}`,
      emailBody
    );

    // Send confirmation email to the user
    const confirmationEmailBody = `
Dear ${name},

Thank you for contacting Hlfwrld! We've received your message and appreciate you taking the time to reach out to us.

Your inquiry details:
- Subject: ${subject}
- Message: ${message}

We typically respond to all inquiries within 24 hours during business days. Our team will review your message and get back to you with a detailed response.

If you need immediate assistance, you can also reach us directly at contact@hlfwrld.com.

Best regards,
The Hlfwrld Team

---
This is an automated confirmation. Please do not reply to this email.
    `.trim();

    const confirmationEmailResult = await sendEmail(
      email,
      `Confirmation: Your message to Hlfwrld`,
      confirmationEmailBody
    );

    // Always return success for now since email verification is not set up
    // The form submission is logged and can be reviewed later
    console.log('📝 Contact form submission logged successfully');
    
    if (contactEmailResult.success) {
      console.log('✅ Contact form email sent successfully');
      if (confirmationEmailResult.success) {
        console.log('✅ Confirmation email sent successfully');
      } else {
        console.log('⚠️ Contact email sent but confirmation email failed');
      }
    } else {
      console.log('⚠️ Email sending failed (likely due to unverified addresses), but form submission logged');
    }
    
    res.json({ success: true, message: 'Message sent successfully' });

  } catch (error) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoint to view contact submissions
app.get('/admin/contact-submissions', (req, res) => {
  db.all(
    `SELECT * FROM contact_submissions ORDER BY createdAt DESC`,
    [],
    (err, submissions) => {
      if (err) {
        console.error('❌ Error fetching contact submissions:', err.message);
        res.status(500).json({ error: 'Failed to fetch submissions' });
      } else {
        res.json({ submissions });
      }
    }
  );
});

// Salon signup endpoint
app.post('/salon/signup', (req, res) => {
  const {
    salonName,
    ownerName,
    email,
    phone,
    address,
    city,
    state,
    zipCode,
    influencerCode,
    password,
    confirmPassword,
    agreementAccepted
  } = req.body;

  // Validate required fields
  if (!salonName || !ownerName || !email || !phone || !address || !city || !state || !zipCode || !influencerCode || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Validate agreement acceptance
  if (!agreementAccepted) {
    return res.status(400).json({ error: 'You must accept the User Agreement and Terms of Service to proceed' });
  }

  // Validate password confirmation
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  // Validate influencer code format
  if (!/^\d{4}$/.test(influencerCode)) {
    return res.status(400).json({ error: 'Influencer code must be exactly 4 digits' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  console.log('🏪 Salon signup attempt:', { salonName, email, influencerCode, state });

  // First, verify the post code exists and get creator info
  db.get(
    `SELECT p.id as postId, p.influencerName, c.state, c.username 
     FROM posts p 
     JOIN creators c ON p.influencerName = c.username 
     WHERE p.code = ?`,
    [influencerCode],
    (err, result) => {
      if (err) {
        console.error('❌ Error checking post code:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!result) {
        return res.status(400).json({ error: 'Invalid post code. Please check the code and try again.' });
      }

      // Check if state matches
      if (result.state !== state) {
        return res.status(400).json({ 
          error: `Salon state (${state}) must match the influencer's state (${result.state}). Please check your state selection.` 
        });
      }

      // Check if email already exists
      db.get(
        `SELECT id FROM salons WHERE email = ?`,
        [email],
        (err, existingSalon) => {
          if (err) {
            console.error('❌ Error checking existing salon:', err.message);
            return res.status(500).json({ error: 'Database error' });
          }

          if (existingSalon) {
            return res.status(400).json({ error: 'A salon with this email already exists' });
          }

          // Hash password
          const hashedPassword = hashPassword(password);

          // Create salon account
          console.log('🔧 Attempting to create salon with data:', { salonName, ownerName, email, phone, address, city, state, zipCode, influencerCode });
          db.run(
            `INSERT INTO salons (salonName, ownerName, email, phone, address, city, state, zipCode, influencerCode, password, isVerified)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [salonName, ownerName, email, phone, address, city, state, zipCode, influencerCode, hashedPassword, false],
            async function (err) {
              if (err) {
                console.error('❌ Error creating salon account:', err.message);
                console.error('❌ Error details:', err);
                return res.status(500).json({ error: 'Failed to create salon account' });
              }

              const salonId = this.lastID;
              console.log('✅ Salon account created:', { salonId, salonName, email });

              // Create hybrid session for the newly created salon
              const sessionToken = generateSessionToken(); // Short-term (24 hours)
              const jwtToken = generateJWTToken({ // Long-term (90 days)
                salonId: salonId,
                salonName: salonName,
                email: email
              });
              
              sessions.set(sessionToken, {
                salonId: salonId,
                salonName: salonName,
                email: email,
                type: 'salon',
                createdAt: Date.now()
              });

              console.log('✅ Hybrid session created for new salon:', { sessionToken, jwtToken: jwtToken.substring(0, 20) + '...', salonId, salonName });

              // Temporarily skip Stripe integration for testing
              res.json({ 
                success: true, 
                message: 'Salon account created successfully! Redirecting to dashboard...',
                salonId: salonId,
                salonName: salonName,
                sessionToken: sessionToken, // Short-term token
                jwtToken: jwtToken // Long-term token (90 days)
              });
              return;

              // Create Stripe customer for the salon
              try {
                const customer = await stripe.customers.create({
                  email: email,
                  name: salonName,
                  phone: phone,
                  metadata: {
                    salonId: salonId.toString(),
                    ownerName: ownerName
                  }
                });

                // Update salon record with Stripe customer ID
                db.run(
                  `UPDATE salons SET stripeCustomerId = ? WHERE id = ?`,
                  [customer.id, salonId],
                  (updateErr) => {
                    if (updateErr) {
                      console.error('❌ Error updating salon with Stripe customer ID:', updateErr.message);
                    } else {
                      console.log('✅ Stripe customer created for salon:', customer.id);
                    }
                  }
                );

                res.json({ 
                  success: true, 
                  message: 'Salon account created successfully',
                  salonId: salonId
                });
              } catch (stripeError) {
                console.error('❌ Error creating Stripe customer:', stripeError.message);
                // Still return success since the salon account was created
                res.json({ 
                  success: true, 
                  message: 'Salon account created successfully (Stripe setup pending)',
                  salonId: salonId
                });
              }
            }
          );
        }
      );
    }
  );
});

// Salon login endpoint
app.post('/salon/login', (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  console.log('🏪 Salon login attempt:', { email });

  // Find salon by email
  db.get(
    `SELECT id, salonName, email, password FROM salons WHERE email = ?`,
    [email],
    (err, salon) => {
      if (err) {
        console.error('❌ Error finding salon:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!salon) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Verify password
      if (!verifyPassword(password, salon.password)) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Create hybrid session for the salon
      const sessionToken = generateSessionToken(); // Short-term (24 hours)
      const jwtToken = generateJWTToken({ // Long-term (90 days)
        salonId: salon.id,
        salonName: salon.salonName,
        email: salon.email
      });
      
      sessions.set(sessionToken, {
        salonId: salon.id,
        salonName: salon.salonName,
        email: salon.email,
        type: 'salon',
        createdAt: Date.now()
      });

      console.log('✅ Salon logged in with hybrid session:', { 
        salonId: salon.id, 
        salonName: salon.salonName, 
        email, 
        sessionToken,
        jwtToken: jwtToken.substring(0, 20) + '...'
      });

      res.json({
        success: true,
        message: 'Login successful',
        sessionToken: sessionToken, // Short-term token
        jwtToken: jwtToken, // Long-term token (90 days)
        salonId: salon.id,
        salonName: salon.salonName
      });
    }
  );
});



// Salon dashboard endpoint
app.get('/salon/dashboard', validateSession, (req, res) => {
  const { salonId } = req.session;
  
  // Fetch actual salon data from database
  db.get(
    `SELECT id, salonName, email, phone, address, city, state, zipCode, isVerified, createdAt 
     FROM salons WHERE id = ?`,
    [salonId],
    (err, salon) => {
      if (err) {
        console.error('❌ Error fetching salon data:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!salon) {
        return res.status(404).json({ error: 'Salon not found' });
      }
      
      // Get booking statistics
      db.get(
        `SELECT 
          COUNT(*) as totalBookings,
          COUNT(CASE WHEN bookingStatus = 'pending_confirmation' THEN 1 END) as pendingBookings,
          COUNT(CASE WHEN bookingStatus = 'confirmed' THEN 1 END) as confirmedBookings,
          SUM(CASE WHEN bookingStatus = 'confirmed' THEN serviceFee ELSE 0 END) as totalRevenue
         FROM bookings WHERE salonId = ?`,
        [salonId],
        (err, stats) => {
          if (err) {
            console.error('❌ Error fetching booking stats:', err.message);
            stats = { totalBookings: 0, pendingBookings: 0, confirmedBookings: 0, totalRevenue: 0 };
          }
          
          const dashboardData = {
            salon: salon,
            stats: {
              totalBookings: stats.totalBookings || 0,
              pendingBookings: stats.pendingBookings || 0,
              confirmedBookings: stats.confirmedBookings || 0,
              totalRevenue: stats.totalRevenue || 0
            }
          };
          
          res.json(dashboardData);
        }
      );
    }
  );
});

// Route handlers for main pages
app.get('/salon-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../Dashboards/salon-dashboard.html'));
});

app.get('/influencer-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../Dashboards/influencer-dashboard.html'));
});

app.get('/appointment-management', (req, res) => {
  res.sendFile(path.join(__dirname, '../Dashboards/appointment-management.html'));
});

app.get('/service-requests-admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../Dashboards/service-requests-admin.html'));
});

app.get('/salon-login', (req, res) => {
  res.sendFile(path.join(__dirname, '../User Authentication/salon-login.html'));
});

app.get('/salon-signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../User Authentication/salon-signup.html'));
});

app.get('/creator-auth', (req, res) => {
  res.sendFile(path.join(__dirname, '../User Authentication/creator-auth.html'));
});

app.get('/creator-landing', (req, res) => {
  res.sendFile(path.join(__dirname, '../User Authentication/creator-landing.html'));
});

app.get('/salon-landing', (req, res) => {
  res.sendFile(path.join(__dirname, '../User Authentication/salon-landing.html'));
});

app.get('/digitalshop', (req, res) => {
  res.sendFile(path.join(__dirname, '../Main Pages/digitalshop.html'));
});

app.get('/public-profile', (req, res) => {
  res.sendFile(path.join(__dirname, '../Main Pages/public-profile.html'));
});

app.get('/requestsubmission', (req, res) => {
  res.sendFile(path.join(__dirname, '../Main Pages/requestsubmission.html'));
});

app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, '../Main Pages/index.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../Main Pages/index.html'));
});

app.get('/test-debug', (req, res) => {
  res.sendFile(path.join(__dirname, '../test-debug.html'));
});

// Booking workflow routes
app.get('/appointment-system', (req, res) => {
  res.sendFile(path.join(__dirname, '../Booking/appointment-system.html'));
});

app.get('/booking-success', (req, res) => {
  res.sendFile(path.join(__dirname, '../Booking/booking-success.html'));
});

app.get('/reservation', (req, res) => {
  res.sendFile(path.join(__dirname, '../Booking/reservation.html'));
});

app.get('/sbookinginvite', (req, res) => {
  res.sendFile(path.join(__dirname, '../Booking/sbookinginvite.html'));
});

// Payment routes
app.get('/payment-system', (req, res) => {
  res.sendFile(path.join(__dirname, '../Payment/payment-system.html'));
});

app.get('/mock-checkout', (req, res) => {
  res.sendFile(path.join(__dirname, '../Payment/mock-checkout.html'));
});

// Communication routes
app.get('/messaging-system', (req, res) => {
  res.sendFile(path.join(__dirname, '../Communication/messaging-system.html'));
});

app.get('/contact-us', (req, res) => {
  res.sendFile(path.join(__dirname, '../Communication/contact-us.html'));
});

// Account route (redirects to digital shop account tab for now)
app.get('/account', (req, res) => {
  res.redirect('/digitalshop?tab=account');
});

// Salon account settings route
app.get('/salon-account-settings', (req, res) => {
  res.sendFile(path.join(__dirname, '../Dashboards/salon-account-settings.html'));
});

// Account cancellation route
app.get('/account-cancellation', (req, res) => {
  res.sendFile(path.join(__dirname, '../Dashboards/account-cancellation.html'));
});

// Influencer account cancellation route
app.get('/influencer-account-cancellation', (req, res) => {
  res.sendFile(path.join(__dirname, '../Dashboards/influencer-account-cancellation.html'));
});

app.get('/time-selection', (req, res) => {
  res.sendFile(path.join(__dirname, '../Booking/time-selection.html'));
});

app.get('/salon-booking-confirmation', (req, res) => {
  res.sendFile(path.join(__dirname, '../Dashboards/salon-booking-confirmation.html'));
});

// Check time slot availability in real-time
app.get('/time-slot/check/:requestId/:timeOption', (req, res) => {
  const { requestId, timeOption } = req.params;
  
  db.get(
    `SELECT isAvailable, reservedBy, expiresAt 
     FROM time_slots 
     WHERE requestId = ? AND timeOption = ?`,
    [requestId, timeOption],
    (err, slot) => {
      if (err) {
        console.error('❌ Error checking time slot availability:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!slot) {
        return res.json({ available: false, reason: 'Time slot not found' });
      }
      
      const isAvailable = slot.isAvailable && 
        (!slot.expiresAt || new Date(slot.expiresAt) > new Date());
      
      res.json({
        available: isAvailable,
        reason: isAvailable ? null : 'Time slot is reserved or expired'
      });
    }
  );
});

// Get booking confirmation details for salon
app.get('/booking/confirmation/:bookingId', (req, res) => {
  const { bookingId } = req.params;
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  db.get(
    `SELECT b.*, sr.clientName, sr.clientEmail, sr.serviceName, s.salonName
     FROM bookings b
     JOIN service_requests sr ON b.requestId = sr.id
     JOIN salons s ON b.salonId = s.id
     WHERE b.requestId = ? AND b.stripeSessionId LIKE ?`,
    [bookingId, `%${token}%`],
    (err, booking) => {
      if (err) {
        console.error('❌ Error fetching booking confirmation:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found or invalid token' });
      }

      res.json(booking);
    }
  );
});

// Salon confirms appointment
app.post('/booking/confirm', async (req, res) => {
  const { bookingId, token, action } = req.body;

  if (action !== 'confirm') {
    return res.status(400).json({ error: 'Invalid action' });
  }

  try {
    // Get booking details
    const booking = await new Promise((resolve, reject) => {
      db.get(
        `SELECT b.*, sr.clientName, sr.clientEmail, sr.serviceName, s.salonName, s.email as salonEmail
         FROM bookings b
         JOIN service_requests sr ON b.requestId = sr.id
         JOIN salons s ON b.salonId = s.id
         WHERE b.requestId = ? AND b.stripeSessionId LIKE ?`,
        [bookingId, `%${token}%`],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or invalid token' });
    }

    // Update booking status to confirmed
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE bookings SET bookingStatus = 'confirmed' WHERE requestId = ?`,
        [bookingId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Update time slot to confirmed
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE time_slots 
         SET reservedBy = 'confirmed_booking' 
         WHERE requestId = ? AND timeOption = ?`,
        [bookingId, booking.appointmentTime],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Update service request status
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE service_requests SET status = 'confirmed' WHERE id = ?`,
        [bookingId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Send confirmation email to client
    const appointmentDate = new Date(booking.appointmentTime);
    const formattedDate = appointmentDate.toLocaleDateString();
    const formattedTime = appointmentDate.toLocaleTimeString();

    const clientEmailBody = `
      <h2>✅ Appointment Confirmed!</h2>
      <p>Your appointment has been confirmed by the salon:</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Appointment Details:</h3>
        <ul>
          <li><strong>Service:</strong> ${booking.serviceName}</li>
          <li><strong>Salon:</strong> ${booking.salonName}</li>
          <li><strong>Date & Time:</strong> ${formattedDate} at ${formattedTime}</li>
          <li><strong>Amount Paid:</strong> $${booking.serviceFee}</li>
        </ul>
      </div>
      
      <p>We look forward to seeing you!</p>
    `;

    await sendEmail(
      booking.clientEmail,
      '✅ Appointment Confirmed!',
      clientEmailBody,
      bookingId
    );

    console.log('✅ Appointment confirmed by salon:', bookingId);

    res.json({
      success: true,
      message: 'Appointment confirmed successfully'
    });

  } catch (error) {
    console.error('❌ Error confirming appointment:', error);
    res.status(500).json({ error: 'Failed to confirm appointment' });
  }
});

// Salon offers alternative times
app.post('/booking/alternatives', async (req, res) => {
  const { bookingId, token, alternativeTimes, message } = req.body;

  if (!alternativeTimes || alternativeTimes.length === 0) {
    return res.status(400).json({ error: 'Alternative times are required' });
  }

  try {
    // Get booking details
    const booking = await new Promise((resolve, reject) => {
      db.get(
        `SELECT b.*, sr.clientName, sr.clientEmail, sr.serviceName, s.salonName
         FROM bookings b
         JOIN service_requests sr ON b.requestId = sr.id
         JOIN salons s ON b.salonId = s.id
         WHERE b.requestId = ? AND b.stripeSessionId LIKE ?`,
        [bookingId, `%${token}%`],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or invalid token' });
    }

    // Add alternative times to time_slots
    const insertPromises = alternativeTimes.map(timeOption => {
      return new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO time_slots (requestId, timeOption, isAvailable) VALUES (?, ?, ?)`,
          [bookingId, timeOption, true],
          function (err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    });

    await Promise.all(insertPromises);

    // Send email to client with alternatives
    const appointmentDate = new Date(booking.appointmentTime);
    const formattedDate = appointmentDate.toLocaleDateString();
    const formattedTime = appointmentDate.toLocaleTimeString();

    const alternativeTimeOptions = alternativeTimes.map(time => {
      const date = new Date(time);
      return `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
    }).join('<br>');

    const clientEmailBody = `
      <h2>🔄 Alternative Times Offered</h2>
      <p>The salon has offered alternative times for your appointment:</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Original Appointment:</h3>
        <p><strong>${formattedDate} at ${formattedTime}</strong></p>
        
        <h3>Alternative Times:</h3>
        <p>${alternativeTimeOptions}</p>
        
        <h3>Message from Salon:</h3>
        <p>${message || 'Please select one of the alternative times above.'}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.hlfwrld.com/time-selection?requestId=${bookingId}&token=${booking.clientToken}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
          Select New Time
        </a>
      </div>
    `;

    await sendEmail(
      booking.clientEmail,
      '🔄 Alternative Times Offered for Your Appointment',
      clientEmailBody,
      bookingId
    );

    console.log('✅ Alternative times sent to client:', bookingId);

    res.json({
      success: true,
      message: 'Alternative times sent successfully'
    });

  } catch (error) {
    console.error('❌ Error sending alternatives:', error);
    res.status(500).json({ error: 'Failed to send alternatives' });
  }
});

// Salon processes refund
app.post('/booking/refund', async (req, res) => {
  const { bookingId, token, reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: 'Refund reason is required' });
  }

  try {
    // Get booking details
    const booking = await new Promise((resolve, reject) => {
      db.get(
        `SELECT b.*, sr.clientName, sr.clientEmail, sr.serviceName, s.salonName
         FROM bookings b
         JOIN service_requests sr ON b.requestId = sr.id
         JOIN salons s ON b.salonId = s.id
         WHERE b.requestId = ? AND b.stripeSessionId LIKE ?`,
        [bookingId, `%${token}%`],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or invalid token' });
    }

    // Process refund through Stripe
    const refund = await stripe.refunds.create({
      payment_intent: booking.stripePaymentIntentId,
      reason: 'requested_by_customer',
      metadata: {
        bookingId: bookingId.toString(),
        reason: reason
      }
    });

    // Update booking status
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE bookings SET bookingStatus = 'refunded', refundReason = ? WHERE requestId = ?`,
        [reason, bookingId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Release time slot
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE time_slots 
         SET isAvailable = TRUE, reservedBy = NULL, expiresAt = NULL 
         WHERE requestId = ? AND timeOption = ?`,
        [bookingId, booking.appointmentTime],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Update service request status
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE service_requests SET status = 'refunded' WHERE id = ?`,
        [bookingId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Send refund email to client
    const clientEmailBody = `
      <h2>💰 Refund Processed</h2>
      <p>Your appointment has been cancelled and a refund has been processed:</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Refund Details:</h3>
        <ul>
          <li><strong>Service:</strong> ${booking.serviceName}</li>
          <li><strong>Salon:</strong> ${booking.salonName}</li>
          <li><strong>Amount Refunded:</strong> $${booking.serviceFee}</li>
          <li><strong>Refund ID:</strong> ${refund.id}</li>
        </ul>
        
        <h3>Reason for Refund:</h3>
        <p>${reason}</p>
      </div>
      
      <p>Your refund will appear in your account within 5-10 business days.</p>
    `;

    await sendEmail(
      booking.clientEmail,
      '💰 Refund Processed - Appointment Cancelled',
      clientEmailBody,
      bookingId
    );

    console.log('✅ Refund processed:', bookingId);

    res.json({
      success: true,
      message: 'Refund processed successfully'
    });

  } catch (error) {
    console.error('❌ Error processing refund:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// Test navigation route
app.get('/test-navigation', (req, res) => {
  res.sendFile(path.join(__dirname, '../test-navigation.html'));
});

// Salon Payment Method Endpoints
app.get('/salon/payment-info', (req, res) => {
  const salonId = req.query.salonId;
  
  if (!salonId) {
    return res.status(400).json({ error: 'Salon ID is required' });
  }

  db.get(
    `SELECT stripeCustomerId, stripeSubscriptionId, subscriptionPlan FROM salons WHERE id = ?`,
    [salonId],
    async (err, salon) => {
      if (err) {
        console.error('❌ Error fetching salon payment info:', err.message);
        return res.status(500).json({ error: 'Failed to fetch payment information' });
      }

      if (!salon) {
        return res.status(404).json({ error: 'Salon not found' });
      }

      try {
        let paymentInfo = {
          hasStripeCustomer: !!salon.stripeCustomerId,
          subscriptionPlan: salon.subscriptionPlan || 'professional',
          nextBillingDate: null,
          currentPlan: null,
          billingCycle: 'Monthly'
        };

        if (salon.stripeCustomerId) {
          // Fetch customer details from Stripe
          const customer = await stripe.customers.retrieve(salon.stripeCustomerId);
          
          if (customer.default_source) {
            const paymentMethod = await stripe.paymentMethods.retrieve(customer.default_source);
            paymentInfo.paymentMethod = {
              type: paymentMethod.type,
              last4: paymentMethod.card?.last4 || '****',
              brand: paymentMethod.card?.brand || 'Unknown',
              expMonth: paymentMethod.card?.exp_month || 0,
              expYear: paymentMethod.card?.exp_year || 0
            };
          }

          if (salon.stripeSubscriptionId) {
            // Fetch subscription details from Stripe
            const subscription = await stripe.subscriptions.retrieve(salon.stripeSubscriptionId);
            paymentInfo.nextBillingDate = new Date(subscription.current_period_end * 1000).toLocaleDateString();
            paymentInfo.currentPlan = subscription.items.data[0]?.price?.nickname || 'Professional';
          }
        }

        res.json(paymentInfo);
      } catch (stripeError) {
        console.error('❌ Stripe error:', stripeError.message);
        res.status(500).json({ error: 'Failed to fetch payment information from Stripe' });
      }
    }
  );
});

app.post('/salon/create-billing-portal-session', (req, res) => {
  const { salonId } = req.body;
  
  if (!salonId) {
    return res.status(400).json({ error: 'Salon ID is required' });
  }

  db.get(
    `SELECT stripeCustomerId FROM salons WHERE id = ?`,
    [salonId],
    async (err, salon) => {
      if (err) {
        console.error('❌ Error fetching salon:', err.message);
        return res.status(500).json({ error: 'Failed to fetch salon information' });
      }

      if (!salon) {
        return res.status(404).json({ error: 'Salon not found' });
      }

      if (!salon.stripeCustomerId) {
        return res.status(400).json({ error: 'No Stripe customer found for this salon' });
      }

      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: salon.stripeCustomerId,
          return_url: `http://localhost:3000/salon-account-settings`,
        });

        res.json({ url: session.url });
      } catch (stripeError) {
        console.error('❌ Stripe error creating billing portal session:', stripeError.message);
        res.status(500).json({ error: 'Failed to create billing portal session' });
      }
    }
  );
});

app.post('/salon/update-subscription', (req, res) => {
  const { salonId, newPlan } = req.body;
  
  if (!salonId || !newPlan) {
    return res.status(400).json({ error: 'Salon ID and new plan are required' });
  }

  const planPrices = {
    'basic': 'price_1RooWACftZZpvYyWaBUa1bsF',
    'professional': 'price_1RooWBCftZZpvYyWMPs1yixA',
    'premium': 'price_1RooWBCftZZpvYyWMd6Z3Sia'
  };

  const priceId = planPrices[newPlan];
  if (!priceId) {
    return res.status(400).json({ error: 'Invalid plan selected' });
  }

  db.get(
    `SELECT stripeCustomerId, stripeSubscriptionId FROM salons WHERE id = ?`,
    [salonId],
    async (err, salon) => {
      if (err) {
        console.error('❌ Error fetching salon:', err.message);
        return res.status(500).json({ error: 'Failed to fetch salon information' });
      }

      if (!salon) {
        return res.status(404).json({ error: 'Salon not found' });
      }

      try {
        if (salon.stripeSubscriptionId) {
          // Update existing subscription
          const subscription = await stripe.subscriptions.retrieve(salon.stripeSubscriptionId);
          await stripe.subscriptions.update(salon.stripeSubscriptionId, {
            items: [{
              id: subscription.items.data[0].id,
              price: priceId,
            }],
          });
        } else if (salon.stripeCustomerId) {
          // Create new subscription
          const subscription = await stripe.subscriptions.create({
            customer: salon.stripeCustomerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
          });
          
          // Update salon record with subscription ID
          db.run(
            `UPDATE salons SET stripeSubscriptionId = ?, subscriptionPlan = ? WHERE id = ?`,
            [subscription.id, newPlan, salonId]
          );
        } else {
          return res.status(400).json({ error: 'No Stripe customer found for this salon' });
        }

        // Update salon record with new plan
        db.run(
          `UPDATE salons SET subscriptionPlan = ? WHERE id = ?`,
          [newPlan, salonId]
        );

        res.json({ success: true, message: `Successfully updated to ${newPlan} plan` });
      } catch (stripeError) {
        console.error('❌ Stripe error updating subscription:', stripeError.message);
        res.status(500).json({ error: 'Failed to update subscription' });
      }
    }
  );
});

// Stripe Connect endpoints for influencer commissions
app.post('/influencer/create-connect-account', (req, res) => {
  const { influencerId, email, fullName } = req.body;
  
  if (!influencerId || !email || !fullName) {
    return res.status(400).json({ error: 'Influencer ID, email, and full name are required' });
  }

  stripe.accounts.create({
    type: 'express',
    country: 'US',
    email: email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    business_profile: {
      url: 'https://hlfwrld.com',
      mcc: '7299', // Personal Care Services
    },
  }).then(account => {
    // Update influencer record with Stripe Connect account ID
    db.run(
      `UPDATE influencers SET stripeConnectAccountId = ?, stripeConnectAccountStatus = ? WHERE id = ?`,
      [account.id, 'pending', influencerId],
      (err) => {
        if (err) {
          console.error('❌ Error updating influencer:', err.message);
          return res.status(500).json({ error: 'Failed to update influencer record' });
        }
        
        // Create account link for onboarding
        stripe.accountLinks.create({
          account: account.id,
          refresh_url: 'http://localhost:3000/influencer-dashboard',
          return_url: 'http://localhost:3000/influencer-dashboard',
          type: 'account_onboarding',
        }).then(accountLink => {
          res.json({ 
            success: true, 
            accountId: account.id, 
            accountLink: accountLink.url,
            message: 'Stripe Connect account created successfully' 
          });
        }).catch(stripeError => {
          console.error('❌ Stripe error creating account link:', stripeError.message);
          res.status(500).json({ error: 'Failed to create account link' });
        });
      }
    );
  }).catch(stripeError => {
    console.error('❌ Stripe error creating connected account:', stripeError.message);
    res.status(500).json({ error: 'Failed to create Stripe Connect account' });
  });
});

app.post('/booking/create-with-commission', (req, res) => {
  const { 
    requestId, 
    influencerId, 
    salonId, 
    clientName, 
    clientEmail, 
    serviceName, 
    serviceFee,
    appointmentDate,
    appointmentTime 
  } = req.body;

  if (!requestId || !influencerId || !salonId || !clientName || !clientEmail || !serviceName || !serviceFee) {
    return res.status(400).json({ error: 'All booking details are required' });
  }

  // Calculate commission (20% platform commission, 15% to influencer)
  const platformCommissionAmount = parseFloat(serviceFee) * 0.20; // 20% platform commission
  const influencerCommissionAmount = parseFloat(serviceFee) * 0.15; // 15% to influencer
  const amountInCents = Math.round(parseFloat(serviceFee) * 100);
  const platformCommissionInCents = Math.round(platformCommissionAmount * 100);
  const influencerCommissionInCents = Math.round(influencerCommissionAmount * 100);

  // Get influencer's Stripe Connect account
  db.get(
    `SELECT stripeConnectAccountId FROM influencers WHERE id = ?`,
    [influencerId],
    async (err, influencer) => {
      if (err) {
        console.error('❌ Error fetching influencer:', err.message);
        return res.status(500).json({ error: 'Failed to fetch influencer information' });
      }

      if (!influencer || !influencer.stripeConnectAccountId) {
        return res.status(400).json({ error: 'Influencer not found or Stripe Connect not set up' });
      }

      try {
        // Create payment intent with commission split
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: 'usd',
          application_fee_amount: platformCommissionInCents, // 20% platform commission
          transfer_data: {
            destination: influencer.stripeConnectAccountId,
          },
          metadata: {
            influencerId: influencerId.toString(),
            requestId: requestId.toString(),
            salonId: salonId.toString(),
            platformCommissionRate: '20%',
            influencerCommissionRate: '15%',
            serviceType: 'beauty_booking'
          }
        });

        // Save booking record
        db.run(
          `INSERT INTO bookings (requestId, influencerId, salonId, clientName, clientEmail, serviceName, serviceFee, commissionAmount, stripePaymentIntentId, bookingStatus, appointmentDate, appointmentTime)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [requestId, influencerId, salonId, clientName, clientEmail, serviceName, serviceFee, platformCommissionAmount, paymentIntent.id, 'pending', appointmentDate, appointmentTime],
          function(err) {
            if (err) {
              console.error('❌ Error saving booking:', err.message);
              return res.status(500).json({ error: 'Failed to save booking' });
            }

            const bookingId = this.lastID;

            // Update influencer's total earnings (15% of service fee)
            db.run(
              `UPDATE influencers SET totalEarnings = totalEarnings + ? WHERE id = ?`,
              [influencerCommissionAmount, influencerId]
            );

            res.json({
              success: true,
              bookingId: bookingId,
              paymentIntentId: paymentIntent.id,
              clientSecret: paymentIntent.client_secret,
              platformCommissionAmount: platformCommissionAmount,
              influencerCommissionAmount: influencerCommissionAmount,
              salonReceives: parseFloat(serviceFee) - platformCommissionAmount,
              message: 'Booking created with 20% platform commission split'
            });
          }
        );

      } catch (stripeError) {
        console.error('❌ Stripe error creating payment intent:', stripeError.message);
        res.status(500).json({ error: 'Failed to create payment intent' });
      }
    }
  );
});

app.get('/influencer/earnings/:influencerId', (req, res) => {
  const { influencerId } = req.params;

  db.get(
    `SELECT totalEarnings, commissionRate FROM creators WHERE id = ?`,
    [influencerId],
    (err, influencer) => {
      if (err) {
        console.error('❌ Error fetching influencer earnings:', err.message);
        return res.status(500).json({ error: 'Failed to fetch earnings' });
      }

      if (!influencer) {
        return res.status(404).json({ error: 'Influencer not found' });
      }

      // Get recent bookings for this influencer
      db.all(
        `SELECT * FROM bookings WHERE influencerId = ? ORDER BY createdAt DESC LIMIT 10`,
        [influencerId],
        (err, bookings) => {
          if (err) {
            console.error('❌ Error fetching bookings:', err.message);
            return res.status(500).json({ error: 'Failed to fetch bookings' });
          }

          res.json({
            totalEarnings: influencer.totalEarnings,
            commissionRate: influencer.commissionRate,
            recentBookings: bookings
          });
        }
      );
    }
  );
});

// Get comprehensive dashboard data for influencer (service requests + earnings + bookings)
app.get('/influencer/dashboard/:influencerHandle', (req, res) => {
  const { influencerHandle } = req.params;
  
  console.log(`📋 Fetching dashboard data for influencer: ${influencerHandle}`);

  // First get the influencer ID and basic info
  db.get(
    `SELECT id, totalEarnings, commissionRate, firstName, lastName FROM creators WHERE influencerName = ?`,
    [influencerHandle],
    (err, creator) => {
      if (err) {
        console.error('❌ Error fetching creator:', err.message);
        return res.status(500).json({ error: 'Failed to fetch creator data' });
      }

      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      // Get service requests
      db.all(
        `SELECT sr.*, p.serviceName, p.fee, p.influencerName, p.coverPhoto 
         FROM service_requests sr 
         LEFT JOIN posts p ON sr.serviceCode = p.code 
         WHERE p.influencerName = ? 
         ORDER BY sr.createdAt DESC`,
        [influencerHandle],
        (err, serviceRequests) => {
          if (err) {
            console.error('❌ Error fetching service requests:', err.message);
            return res.status(500).json({ error: 'Failed to fetch service requests' });
          }

          // Get confirmed bookings with commission data
          db.all(
            `SELECT b.*, s.salonName 
             FROM bookings b 
             LEFT JOIN salons s ON b.salonId = s.id 
             WHERE b.influencerId = ? 
             ORDER BY b.createdAt DESC LIMIT 20`,
            [creator.id],
            (err, bookings) => {
              if (err) {
                console.error('❌ Error fetching bookings:', err.message);
                return res.status(500).json({ error: 'Failed to fetch bookings' });
              }

              // Calculate actual commission stats
              const totalCommissions = bookings.reduce((sum, booking) => {
                return sum + (parseFloat(booking.influencerCommission) || 0);
              }, 0);

              const pendingCommissions = bookings
                .filter(b => b.bookingStatus === 'pending_confirmation')
                .reduce((sum, booking) => {
                  return sum + (parseFloat(booking.influencerCommission) || 0);
                }, 0);

              const confirmedCommissions = bookings
                .filter(b => b.bookingStatus === 'confirmed')
                .reduce((sum, booking) => {
                  return sum + (parseFloat(booking.influencerCommission) || 0);
                }, 0);

              res.json({
                creator: {
                  id: creator.id,
                  name: creator.firstName || creator.lastName || influencerHandle,
                  totalEarnings: creator.totalEarnings || 0,
                  commissionRate: creator.commissionRate || 0.15
                },
                serviceRequests: serviceRequests,
                bookings: bookings,
                commissionStats: {
                  totalCommissions: totalCommissions,
                  pendingCommissions: pendingCommissions,
                  confirmedCommissions: confirmedCommissions,
                  totalBookings: bookings.length,
                  pendingBookings: bookings.filter(b => b.bookingStatus === 'pending_confirmation').length,
                  confirmedBookings: bookings.filter(b => b.bookingStatus === 'confirmed').length
                }
              });
            }
          );
        }
      );
    }
  );
});

// Get service request details for time selection
app.get('/service-request/:requestId', (req, res) => {
  const { requestId } = req.params;
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  // Verify token
  db.get(
    `SELECT * FROM service_requests WHERE id = ? AND clientToken = ?`,
    [requestId, token],
    (err, request) => {
      if (err) {
        console.error('❌ Error fetching service request:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!request) {
        return res.status(404).json({ error: 'Request not found or invalid token' });
      }

      // Get salon information
      db.get(
        `SELECT salonName FROM salons WHERE id = ?`,
        [request.salonId],
        (err, salon) => {
          if (err) {
            console.error('❌ Error fetching salon info:', err.message);
            return res.status(500).json({ error: 'Database error' });
          }

          // Get available time slots for this request
          db.all(
            `SELECT timeOption, isAvailable, reservedBy, expiresAt 
             FROM time_slots 
             WHERE requestId = ? AND isAvailable = TRUE 
             AND (expiresAt IS NULL OR expiresAt > datetime('now'))
             ORDER BY timeOption`,
            [requestId],
            (err, timeSlots) => {
              if (err) {
                console.error('❌ Error fetching time slots:', err.message);
                return res.status(500).json({ error: 'Database error' });
              }

              res.json({
                ...request,
                salonName: salon ? salon.salonName : 'Unknown Salon',
                timeOptions: timeSlots.map(slot => slot.timeOption)
              });
            }
          );
        }
      );
    }
  );
});

// Create booking with payment
app.post('/booking/create', async (req, res) => {
  const { requestId, selectedTime, token } = req.body;

  if (!requestId || !selectedTime || !token) {
    return res.status(400).json({ error: 'Request ID, selected time, and token are required' });
  }

  try {
    // Verify token and get request details
    const request = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM service_requests WHERE id = ? AND clientToken = ?`,
        [requestId, token],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found or invalid token' });
    }

    // Check if time slot is available and reserve it
    const timeSlot = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM time_slots 
         WHERE requestId = ? AND timeOption = ? AND isAvailable = TRUE 
         AND (expiresAt IS NULL OR expiresAt > datetime('now'))`,
        [requestId, selectedTime],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!timeSlot) {
      return res.status(400).json({ error: 'Selected time is no longer available' });
    }

    // Reserve the time slot for 10 minutes
    const reservationExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const reservationToken = generateClientToken(requestId);
    
    const reservationResult = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE time_slots 
         SET isAvailable = FALSE, reservedBy = ?, reservedAt = datetime('now'), expiresAt = ? 
         WHERE id = ? AND isAvailable = TRUE`,
        [reservationToken, reservationExpiresAt.toISOString(), timeSlot.id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    if (reservationResult === 0) {
      return res.status(409).json({ error: 'Time slot was just taken by another user. Please select a different time.' });
    }

    // Get salon and influencer information
    const salon = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM salons WHERE id = ?`, [request.salonId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const influencer = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM creators WHERE influencerCode = ?`, [request.influencerCode], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!salon || !influencer) {
      return res.status(400).json({ error: 'Salon or influencer not found' });
    }

    // Calculate commission
    const serviceFee = parseFloat(request.serviceFee);
    const platformCommission = serviceFee * 0.20;
    const influencerCommission = serviceFee * 0.15;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: request.serviceName,
            description: `Appointment at ${salon.salonName}`,
          },
          unit_amount: Math.round(serviceFee * 100), // Convert to cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/time-selection?requestId=${requestId}&token=${token}`,
      metadata: {
        requestId: requestId.toString(),
        salonId: salon.id.toString(),
        influencerId: influencer.id.toString(),
        clientName: request.clientName,
        clientEmail: request.clientEmail,
        serviceName: request.serviceName,
        selectedTime: selectedTime,
        platformCommission: platformCommission.toString(),
        influencerCommission: influencerCommission.toString()
      }
    });

    res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error('❌ Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Cleanup expired time slot reservations (run every 5 minutes)
setInterval(() => {
  db.run(
    `UPDATE time_slots 
     SET isAvailable = TRUE, reservedBy = NULL, reservedAt = NULL, expiresAt = NULL 
     WHERE expiresAt IS NOT NULL AND expiresAt < datetime('now')`,
    (err) => {
      if (err) {
        console.error('❌ Error cleaning up expired reservations:', err.message);
      } else {
        console.log('🧹 Cleaned up expired time slot reservations');
      }
    }
  );
}, 5 * 60 * 1000); // 5 minutes

// Stripe webhook for payment confirmation
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test', sig);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    try {
      // Create booking record
      const bookingData = {
        requestId: session.metadata.requestId,
        salonId: session.metadata.salonId,
        influencerId: session.metadata.influencerId,
        clientName: session.metadata.clientName,
        clientEmail: session.metadata.clientEmail,
        serviceName: session.metadata.serviceName,
        serviceFee: (session.amount_total / 100).toString(),
        appointmentTime: session.metadata.selectedTime,
        stripePaymentIntentId: session.payment_intent,
        stripeSessionId: session.id,
        platformCommission: session.metadata.platformCommission,
        influencerCommission: session.metadata.influencerCommission
      };

      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO bookings (requestId, salonId, influencerId, clientName, clientEmail, serviceName, serviceFee, appointmentTime, stripePaymentIntentId, stripeSessionId, platformCommission, influencerCommission, bookingStatus)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            bookingData.requestId, bookingData.salonId, bookingData.influencerId,
            bookingData.clientName, bookingData.clientEmail, bookingData.serviceName,
            bookingData.serviceFee, bookingData.appointmentTime, bookingData.stripePaymentIntentId,
            bookingData.stripeSessionId, bookingData.platformCommission, bookingData.influencerCommission, 'pending_confirmation'
          ],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      // Update service request status
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE service_requests SET status = 'confirmed' WHERE id = ?`,
          [bookingData.requestId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Mark time slot as pending salon confirmation
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE time_slots 
           SET isAvailable = FALSE, reservedBy = 'pending_confirmation', expiresAt = NULL 
           WHERE requestId = ? AND timeOption = ?`,
          [bookingData.requestId, bookingData.appointmentTime],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Update influencer earnings
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE creators SET totalEarnings = totalEarnings + ? WHERE id = ?`,
          [bookingData.influencerCommission, bookingData.influencerId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Send confirmation emails
      const appointmentDate = new Date(bookingData.appointmentTime);
      const formattedDate = appointmentDate.toLocaleDateString();
      const formattedTime = appointmentDate.toLocaleTimeString();

      // Email to client
      const clientEmailBody = `
        <h2>🔄 Payment Received - Awaiting Salon Confirmation</h2>
        <p>Thank you for your payment! Your appointment is now pending salon confirmation:</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Appointment Details:</h3>
          <ul>
            <li><strong>Service:</strong> ${bookingData.serviceName}</li>
            <li><strong>Date & Time:</strong> ${formattedDate} at ${formattedTime}</li>
            <li><strong>Amount Paid:</strong> $${bookingData.serviceFee}</li>
          </ul>
        </div>
        
        <p><strong>Next Steps:</strong> The salon will review your appointment and confirm within 24 hours. You'll receive another email once confirmed.</p>
        
        <p style="font-size: 14px; color: #666;">
          If the salon cannot accommodate this time, they will offer alternative times or process a refund.
        </p>
      `;

      await sendEmail(
        bookingData.clientEmail,
        '🔄 Payment Received - Awaiting Salon Confirmation',
        clientEmailBody,
        bookingData.requestId
      );

      // Email to salon with confirmation request
      const salon = await new Promise((resolve, reject) => {
        db.get(`SELECT email, salonName FROM salons WHERE id = ?`, [bookingData.salonId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (salon) {
        const confirmationUrl = `https://www.hlfwrld.com/salon-booking-confirmation?bookingId=${bookingData.requestId}&token=${generateSalonConfirmationToken(bookingData.requestId)}`;
        
        const salonEmailBody = `
          <h2>🔄 Appointment Confirmation Required</h2>
          <p>A new appointment has been booked and paid for, but requires your manual confirmation:</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Appointment Details:</h3>
            <ul>
              <li><strong>Service:</strong> ${bookingData.serviceName}</li>
              <li><strong>Client:</strong> ${bookingData.clientName}</li>
              <li><strong>Email:</strong> ${bookingData.clientEmail}</li>
              <li><strong>Date & Time:</strong> ${formattedDate} at ${formattedTime}</li>
              <li><strong>Amount Paid:</strong> $${bookingData.serviceFee}</li>
            </ul>
          </div>
          
          <p><strong>Action Required:</strong> Please review this appointment and confirm there are no conflicts.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmationUrl}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; margin: 0 10px;">
              ✅ Confirm Appointment
            </a>
            <a href="${confirmationUrl}&action=review" style="background: #ffc107; color: #212529; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; margin: 0 10px;">
              ⚠️ Review & Offer Alternatives
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            <strong>Important:</strong> If you cannot accommodate this appointment, you must either offer alternative times or process a refund within 24 hours.
          </p>
        `;
        
        await sendEmail(
          salon.email,
          '🔄 Appointment Confirmation Required - Action Needed',
          salonEmailBody,
          bookingData.requestId
        );
      }

      // Email to influencer/creator about the confirmed booking and commission
      const creator = await new Promise((resolve, reject) => {
        db.get(`SELECT email, firstName, lastName, influencerName FROM creators WHERE id = ?`, [bookingData.influencerId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (creator) {
        const creatorName = creator.firstName || creator.influencerName || 'Creator';
        const commissionAmount = parseFloat(bookingData.influencerCommission).toFixed(2);
        
        const creatorEmailBody = `
          <h2>🎉 New Booking Confirmed - Commission Earned!</h2>
          <p>Great news ${creatorName}! A client has booked one of your recommended services and you've earned a commission:</p>
          
          <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3>💰 Commission Earned: $${commissionAmount}</h3>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Booking Details:</h3>
            <ul>
              <li><strong>Service:</strong> ${bookingData.serviceName}</li>
              <li><strong>Client:</strong> ${bookingData.clientName}</li>
              <li><strong>Date & Time:</strong> ${formattedDate} at ${formattedTime}</li>
              <li><strong>Service Fee:</strong> $${bookingData.serviceFee}</li>
              <li><strong>Your Commission:</strong> $${commissionAmount}</li>
            </ul>
          </div>
          
          <p><strong>What's Next:</strong> The salon is now reviewing the appointment details and will confirm within 24 hours. Once confirmed, your commission will be processed for payout.</p>
          
          <p style="font-size: 14px; color: #666;">
            Keep promoting your services to earn more commissions! Your total earnings are being tracked in your dashboard.
          </p>
          
          <div style="margin-top: 30px; text-align: center;">
            <p style="color: #28a745; font-weight: 600;">Thanks for being part of the Hlfwrld community! 🌟</p>
          </div>
        `;
        
        await sendEmail(
          creator.email,
          '🎉 New Booking Confirmed - Commission Earned!',
          creatorEmailBody,
          bookingData.requestId
        );
      }

      console.log('✅ Booking confirmed and processed:', bookingData);

    } catch (error) {
      console.error('❌ Error processing booking:', error);
    }
  }

  res.json({ received: true });
});

// Test email endpoint for debugging
app.post('/test-email', async (req, res) => {
  const { to, subject, body } = req.body;
  
  try {
    console.log('🧪 Testing email functionality...');
    console.log('To:', to);
    console.log('Subject:', subject);
    
    await sendEmail(to, subject, body);
    console.log('✅ Test email sent successfully');
    res.json({ success: true, message: 'Test email sent' });
  } catch (error) {
    console.error('❌ Test email failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test salon session endpoint
app.get('/test/salon-session', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.sessionToken;
  
  if (!token) {
    return res.json({ error: 'No token provided', hasToken: false });
  }
  
  // Try JWT first
  const jwtPayload = verifyJWTToken(token);
  if (jwtPayload) {
    return res.json({ 
      success: true, 
      tokenType: 'JWT', 
      salonId: jwtPayload.salonId,
      salonName: jwtPayload.salonName 
    });
  }
  
  // Try short-term session
  const session = sessions.get(token);
  if (session) {
    return res.json({ 
      success: true, 
      tokenType: 'Session', 
      salonId: session.salonId,
      salonName: session.salonName 
    });
  }
  
  res.json({ error: 'Invalid token', hasToken: true, tokenType: 'Invalid' });
});

// Debug endpoint to check database content
app.get('/debug/database', (req, res) => {
  const queries = {
    service_requests: 'SELECT COUNT(*) as count FROM service_requests',
    posts: 'SELECT COUNT(*) as count FROM posts',  
    salons: 'SELECT COUNT(*) as count FROM salons',
    salon_17: 'SELECT * FROM salons WHERE id = 17',
    posts_with_codes: 'SELECT code, influencerName, serviceName FROM posts LIMIT 5',
    service_requests_sample: 'SELECT id, serviceCode, clientName, status FROM service_requests LIMIT 5',
    salon_17_query: `SELECT sr.*, p.influencerName, p.serviceName, p.fee, p.city, p.state
                     FROM service_requests sr
                     JOIN posts p ON sr.serviceCode = p.code
                     JOIN salons s ON p.code = s.influencerCode
                     WHERE s.id = 17
                     ORDER BY sr.timestamp DESC`
  };
  
  const results = {};
  let completed = 0;
  const total = Object.keys(queries).length;
  
  Object.entries(queries).forEach(([key, query]) => {
    db.all(query, (err, rows) => {
      if (err) {
        results[key] = { error: err.message };
      } else {
        results[key] = rows;
      }
      completed++;
      if (completed === total) {
        res.json(results);
      }
    });
  });
});

// Database reset endpoint (for testing purposes)
app.post('/reset-database', (req, res) => {
  const { confirmReset } = req.body;
  
  if (confirmReset !== 'YES_DELETE_ALL_DATA') {
    return res.status(400).json({ error: 'Reset confirmation required' });
  }
  
  console.log('🔄 Starting database reset...');
  
  // Close current database connection
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    }
    
    // Delete the database file completely
    const fs = require('fs');
    const dbPath = path.join(__dirname, 'Database', 'database.sqlite');
    
    try {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log('✅ Database file deleted');
      }
    } catch (error) {
      console.error('❌ Error deleting database file:', error.message);
    }
    
         // Create new database connection and recreate tables
     const newDb = new sqlite3.Database(dbPath, (err) => {
       if (err) {
         console.error('❌ Error creating new database:', err.message);
         return res.status(500).json({ error: 'Failed to reset database' });
       }
       
       console.log('✅ New database created');
       
       // Initialize all tables with proper structure
       initializeTables(newDb);
       
       // Replace global db reference
       db = newDb;
       
       setTimeout(() => {
         console.log('🗑️ Database completely reset - all data cleared');
         res.json({ 
           success: true, 
           message: 'Database reset complete - all usernames, passwords, and data cleared. New tables created with proper structure.',
           resetType: 'complete'
         });
       }, 1000);
     });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 