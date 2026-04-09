import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

function boolEnv(name) {
  const v = process.env[name];
  if (!v) return false;
  return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
}

function getEnv(name, fallbacks = []) {
  const direct = process.env[name];
  if (direct) return direct;
  for (const fb of fallbacks) {
    const v = process.env[fb];
    if (v) return v;
  }
  return undefined;
}

function requiredEnv(name, fallbacks = []) {
  const v = getEnv(name, fallbacks);
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

// Railway MySQL plugin commonly provides:
// MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE (and sometimes DATABASE_URL)
const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

const pool = databaseUrl
  ? mysql.createPool(databaseUrl)
  : mysql.createPool({
      host: requiredEnv('DB_HOST', ['MYSQLHOST']),
      port: Number(getEnv('DB_PORT', ['MYSQLPORT']) || 3306),
      user: requiredEnv('DB_USER', ['MYSQLUSER']),
      password: getEnv('DB_PASSWORD', ['MYSQLPASSWORD']) || '',
      database: requiredEnv('DB_NAME', ['MYSQLDATABASE']),
      ssl: boolEnv('DB_SSL') ? {} : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

export default pool.promise();
