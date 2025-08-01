const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, 'Database', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

async function setupTestData() {
  console.log('🔧 Setting up test data...');
  
  try {
    // Create test creator (jennia1)
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    
    db.run(`
      INSERT INTO creators (username, name, email, phone, zipCode, password, state)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, ['jennia1', 'Jennia Rajaeirizi', 'jennia@hlfwrld.com', '(555) 123-4567', '21201', hashedPassword, 'MD'], function(err) {
      if (err) {
        console.error('❌ Error creating creator:', err.message);
      } else {
        console.log('✅ Creator jennia1 created with ID:', this.lastID);
        
        // Create test post
        db.run(`
          INSERT INTO posts (influencerName, title, city, state, fee, serviceName, notes, coverPhoto, photos, code)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'jennia1',
          'Test Hair Service',
          'Baltimore',
          'MD',
          '150.00',
          'Professional Hair Styling',
          'Professional hair styling and treatment',
          'https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=Hair+Service',
          JSON.stringify(['https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=Photo+1']),
          '6337'
        ], function(err) {
          if (err) {
            console.error('❌ Error creating post:', err.message);
          } else {
            console.log('✅ Post created with code 6337 and ID:', this.lastID);
            console.log('🎉 Test data setup complete!');
            console.log('📝 You can now test salon signup with:');
            console.log('   - Influencer Code: 6337');
            console.log('   - State: MD');
            process.exit(0);
          }
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Error in setup:', error);
    process.exit(1);
  }
}

setupTestData(); 