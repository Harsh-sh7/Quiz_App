const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const https = require('https'); // Import https for self-ping
require('dotenv').config();

const app = express();

// Connect Database
connectDB();

// Init Middleware
app.use(express.json({ extended: false }));
app.use(cors());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/quiz', require('./routes/quiz'));

// Health Check / Ping Route
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started on port ${PORT} and accessible on network`);

  // Self-ping to keep the server alive (Render Free Tier)
  const BACKEND_URL = 'https://quiz-app-89nn.onrender.com';
  
  const keepAlive = () => {
    https.get(`${BACKEND_URL}/ping`, (resp) => {
      if (resp.statusCode === 200) {
        console.log('Keep-alive ping successful');
      } else {
        console.log('Keep-alive ping failed with status:', resp.statusCode);
      }
    }).on("error", (err) => {
      console.log("Keep-alive ping error: " + err.message);
    });
  };

  // Ping immediately on start
  // keepAlive(); 
  
  // Ping every 14 minutes (Render sleeps after 15 mins of inactivity)
  setInterval(keepAlive, 14 * 60 * 1000);
});
