const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'project_manager',
  user: 'callibest',
  password: '', 
});

const query = async (text, params) => {
  const result = await pool.query(text, params);
  return result;
};

module.exports = { pool, query };