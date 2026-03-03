const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error al conectar a la BD:', err);
  else console.log('Conectado a SQLite');
});

// Crear tablas si no existen
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      departamento TEXT NOT NULL,
      rol TEXT DEFAULT 'user',
      fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      estado TEXT DEFAULT 'abierto',
      prioridad TEXT DEFAULT 'media',
      departamento TEXT NOT NULL,
      usuario_id INTEGER NOT NULL,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(usuario_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comentarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      usuario_id INTEGER NOT NULL,
      mensaje TEXT NOT NULL,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ticket_id) REFERENCES tickets(id),
      FOREIGN KEY(usuario_id) REFERENCES users(id)
    )
  `);

  // Insertar usuario admin por defecto (si no existe)
  const saltRounds = 10;
  const adminEmail = 'admin@soporte.com';
  const adminPass = 'admin123'; // cámbialo después

  bcrypt.hash(adminPass, saltRounds, (err, hash) => {
    if (err) return;
    db.run(
      `INSERT OR IGNORE INTO users (nombre, email, password, departamento, rol)
       VALUES (?, ?, ?, ?, ?)`,
      ['Administrador', adminEmail, hash, 'IT', 'admin']
    );
  });
});

module.exports = db;