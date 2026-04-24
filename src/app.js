// Application Layer - Main application entry point
// This file sets up Express middleware, routes, health checks, and startup for the API.

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./data/db');
const userRoutes = require('./application/userRoutes');
const schoolRoutes = require('./application/schoolRoutes');
const invoiceRoutes = require('./application/invoiceRoutes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/users', userRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/invoices', invoiceRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'School Finance and Management System is running' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

async function start() {
  const PORT = process.env.PORT || 3000;

  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Application startup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
