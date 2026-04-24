// Script to set up the database schema

require('dotenv').config();

const { connectDB, sql } = require('./src/data/db');

const fs = require('fs');

const path = require('path');

async function setupDB() {

  try {

    await connectDB();

    console.log('Connected to database');

    const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');

    // Execute the schema

    await sql.query(schema);

    console.log('Schema created successfully');

  } catch (error) {

    console.error('Error setting up database:', error);

  } finally {

    sql.close();

  }

}

setupDB();