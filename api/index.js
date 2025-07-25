const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key_here');
const AWS = require('aws-sdk');
const { Resend } = require('resend');
const bodyParser = require('body-parser');

const app = express();

// Initialize Resend (much simpler than AWS SES)
let resend;
try {
  resend = new Resend(process.env.RESEND_API_KEY);
} catch (error) {
  console.log('⚠️  Resend not configured - emails will use fallback mode');
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

// Initialize SQLite DB - use absolute path for Vercel
const dbPath = path.join(__dirname, '../backend/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error('DB open error:', err.message);
  console.log('Connected to SQLite database.');
});

// Import all the database initialization and route logic
require('../backend/index.js');

// Export the Express app for Vercel
module.exports = app; 