// server.js — Local development server (Express)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const analyzeHandler = require('./api/analyze');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// API route — mirrors Vercel serverless function
app.post('/api/analyze', (req, res) => {
  analyzeHandler(req, res);
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ CV Sorter server running at http://localhost:${PORT}`);
});
