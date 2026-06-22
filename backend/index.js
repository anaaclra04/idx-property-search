// Load environment variables from a .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./db'); 

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Allows parsing of JSON request bodies

// Health check route to verify database connection
app.get('/health', async (req, res) => {
  try {
    // Run the query
    await db.query('SELECT 1');
    
    res.status(200).json({
      status: 'UP',
      database: 'CONNECTED',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    res.status(500).json({
      status: 'DOWN',
      database: 'DISCONNECTED',
      error: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});