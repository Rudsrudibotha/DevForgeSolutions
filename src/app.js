// Application Layer - Main application entry point
// This file sets up Express middleware, routes, health checks, and startup for the API.

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const { connectDB, getDbState } = require('./data/db');
const userRoutes = require('./application/userRoutes');
const schoolRoutes = require('./application/schoolRoutes');
const invoiceRoutes = require('./application/invoiceRoutes');

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      'img-src': ["'self'", 'data:', 'https:']
    }
  }
}));
app.use(cors());
app.use(express.json({ limit: '3mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/users', userRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/invoices', invoiceRoutes);

app.get('/health', (req, res) => {
  const database = getDbState();

  res.json({
    status: 'OK',
    message: 'School Finance and Management System is running',
    database
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

async function start() {
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);

    try {
      await connectDB();
    } catch (error) {
      console.error('Application started without database connection:', error.message);
    }
  });
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
