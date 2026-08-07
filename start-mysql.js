/* eslint-disable */
const net = require('net');
const spawn = require('child_process').spawn;
const fs = require('fs');

const PORT = 3306;
const MYSQLD_PATH = 'c:\\laragon\\bin\\mysql\\mysql-8.4.3-winx64\\bin\\mysqld.exe';
const MY_INI_PATH = 'c:\\laragon\\bin\\mysql\\mysql-8.4.3-winx64\\my.ini';

function isPortOpen(port) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    client.once('connect', () => {
      client.destroy();
      resolve(true);
    });
    client.once('error', () => {
      resolve(false);
    });
    client.connect({ port, host: '127.0.0.1', timeout: 1000 });
  });
}

async function startMysql() {
  console.log('Checking database connection...');
  const running = await isPortOpen(PORT);
  if (running) {
    console.log('Database server (MySQL) is already running.');
    process.exit(0);
  }

  console.log('Database server is not running. Attempting to start...');

  if (process.platform !== 'win32') {
    console.log('Automatic startup is only configured for Windows (Laragon).');
    process.exit(0);
  }

  if (!fs.existsSync(MYSQLD_PATH)) {
    console.error(`MySQL binary not found at ${MYSQLD_PATH}`);
    console.log('Skipping auto-startup.');
    process.exit(0);
  }

  console.log(`Starting MySQL from ${MYSQLD_PATH}...`);
  const child = spawn(MYSQLD_PATH, [`--defaults-file=${MY_INI_PATH}`], {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();

  // Wait a few seconds for initialization
  for (let i = 1; i <= 6; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const active = await isPortOpen(PORT);
    if (active) {
      console.log('Database server started successfully! 🚀');
      process.exit(0);
    }
    console.log(`Waiting for database server... (${i}s)`);
  }

  console.error('Failed to verify if database server started. Please check manually.');
  process.exit(0);
}

startMysql();
