require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Middleware para verificar token
const verificarToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No autorizado' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Middleware para verificar token desde query string (para SSE)
const verificarTokenSSE = (req, res, next) => {
  const token = req.query.token;
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    console.error('[SSE] Token inválido:', error.message);
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Middleware para verificar si es admin
const esAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};

// -------------------- RUTAS DE AUTENTICACIÓN --------------------
app.post('/api/auth/register', async (req, res) => {
  const { nombre, email, password, departamento } = req.body;
  if (!nombre || !email || !password || !departamento) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    db.run(
      `INSERT INTO users (nombre, email, password, departamento, rol)
       VALUES (?, ?, ?, ?, 'user')`,
      [nombre, email, hash, departamento],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'El email ya está registrado' });
          }
          return res.status(500).json({ error: 'Error al registrar usuario' });
        }
        res.status(201).json({ message: 'Usuario registrado exitosamente' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre, departamento: user.departamento },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        departamento: user.departamento
      }
    });
  });
});

// -------------------- RUTAS DE USUARIOS (solo admin) --------------------
app.get('/api/users', verificarToken, esAdmin, (req, res) => {
  db.all('SELECT id, nombre, email, departamento, rol, fecha_registro FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener usuarios' });
    res.json(rows);
  });
});

app.put('/api/users/:id', verificarToken, esAdmin, (req, res) => {
  const { id } = req.params;
  const { nombre, email, departamento, rol } = req.body;
  if (!nombre || !email || !departamento || !rol) {
    return res.status(400).json({ error: 'Faltan campos' });
  }

  db.run(
    `UPDATE users SET nombre = ?, email = ?, departamento = ?, rol = ? WHERE id = ?`,
    [nombre, email, departamento, rol, id],
    function(err) {
      if (err) return res.status(500).json({ error: 'Error al actualizar' });
      res.json({ message: 'Usuario actualizado' });
    }
  );
});

app.delete('/api/users/:id', verificarToken, esAdmin, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: 'Error al eliminar' });
    res.json({ message: 'Usuario eliminado' });
  });
});

// -------------------- RUTAS DE TICKETS --------------------
// Obtener tickets (con filtro según rol)
app.get('/api/tickets', verificarToken, (req, res) => {
  const { rol, id: usuarioId } = req.usuario;
  let query = `
    SELECT t.*, u.nombre as usuario_nombre
    FROM tickets t
    JOIN users u ON t.usuario_id = u.id
  `;
  const params = [];

  if (rol !== 'admin') {
    query += ' WHERE t.usuario_id = ?';
    params.push(usuarioId);
  }

  query += ' ORDER BY t.fecha_creacion DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener tickets' });
    res.json(rows);
  });
});

// Obtener comentarios de un ticket
app.get('/api/tickets/:id/comentarios', verificarToken, (req, res) => {
  const { id } = req.params;
  const { rol, id: usuarioId } = req.usuario;

  // Verificar que el ticket existe y el usuario tiene permiso
  db.get('SELECT usuario_id FROM tickets WHERE id = ?', [id], (err, ticket) => {
    if (err || !ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

    if (rol !== 'admin' && ticket.usuario_id !== usuarioId) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    db.all(
      `SELECT c.*, u.nombre as usuario_nombre 
       FROM comentarios c
       JOIN users u ON c.usuario_id = u.id
       WHERE c.ticket_id = ?
       ORDER BY c.fecha_creacion ASC`,
      [id],
      (err, rows) => {
        if (err) return res.status(500).json({ error: 'Error al obtener comentarios' });
        res.json(rows);
      }
    );
  });
});

// Crear comentario
app.post('/api/tickets/:id/comentarios', verificarToken, (req, res) => {
  const { id } = req.params;
  const { mensaje } = req.body;
  const { id: usuarioId, rol } = req.usuario;

  if (!mensaje) {
    return res.status(400).json({ error: 'El mensaje es obligatorio' });
  }

  // Verificar permiso
  db.get('SELECT usuario_id FROM tickets WHERE id = ?', [id], (err, ticket) => {
    if (err || !ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

    if (rol !== 'admin' && ticket.usuario_id !== usuarioId) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    db.run(
      `INSERT INTO comentarios (ticket_id, usuario_id, mensaje)
       VALUES (?, ?, ?)`,
      [id, usuarioId, mensaje],
      function(err) {
        if (err) return res.status(500).json({ error: 'Error al crear comentario' });
        res.status(201).json({ id: this.lastID, mensaje: 'Comentario agregado' });
      }
    );
  });
});

// Actualizar ticket (solo admin o dueño)
app.put('/api/tickets/:id', verificarToken, (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion, estado, prioridad } = req.body;
  const { rol, id: usuarioId } = req.usuario;

  // Verificar permisos
  db.get('SELECT usuario_id FROM tickets WHERE id = ?', [id], (err, ticket) => {
    if (err || !ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

    if (rol !== 'admin' && ticket.usuario_id !== usuarioId) {
      return res.status(403).json({ error: 'No tienes permiso para editar este ticket' });
    }

    db.run(
      `UPDATE tickets SET titulo = ?, descripcion = ?, estado = ?, prioridad = ?, fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [titulo, descripcion, estado, prioridad, id],
      function(err) {
        if (err) return res.status(500).json({ error: 'Error al actualizar' });
        res.json({ message: 'Ticket actualizado' });
      }
    );
  });
});

// Eliminar ticket (solo admin)
app.delete('/api/tickets/:id', verificarToken, esAdmin, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM tickets WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: 'Error al eliminar' });
    res.json({ message: 'Ticket eliminado' });
  });
});

// Obtener lista de departamentos (fija)
app.get('/api/departamentos', (req, res) => {
  res.json(['Recursos Humanos', 'IT', 'Gestor', 'Supervisor', 'Calidad']);
});

// Almacenar clientes conectados a SSE (solo admins)
let clients = [];

// Endpoint para notificaciones SSE
app.get('/api/notificaciones', verificarTokenSSE, (req, res) => {
  // Solo admins pueden recibir notificaciones
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  console.log(`[SSE] Admin conectado: ${req.usuario.nombre} (ID: ${req.usuario.id})`);

  // Configurar headers para SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Enviar un evento inicial para confirmar conexión
  res.write(`data: ${JSON.stringify({ tipo: 'conexion', mensaje: 'Conectado' })}\n\n`);

  // Guardar cliente
  const clientId = Date.now();
  const newClient = { id: clientId, res, usuario: req.usuario };
  clients.push(newClient);
  console.log(`[SSE] Total de admins conectados: ${clients.length}`);

  // Eliminar cliente cuando se desconecte
  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
    console.log(`[SSE] Admin desconectado. Total conectados: ${clients.length}`);
  });
});

// Función para notificar a todos los admins sobre un nuevo ticket
function notificarNuevoTicket(ticket, departamentoUsuario) {
  const nombreUsuario = (typeof departamentoUsuario === 'object') 
    ? departamentoUsuario.nombre 
    : departamentoUsuario;
  
  const mensaje = {
    tipo: 'nuevo_ticket',
    mensaje: `Nuevo ticket creado por ${nombreUsuario}: ${ticket.titulo}`,
    ticket: {
      id: ticket.id,
      titulo: ticket.titulo,
      departamento: ticket.departamento,
      prioridad: ticket.prioridad,
    }
  };
  
  console.log('📢 Notificando a', clients.length, 'admin(s):', mensaje);
  clients.forEach(client => {
    client.res.write(`data: ${JSON.stringify(mensaje)}\n\n`);
  });
}

// Crear ticket
app.post('/api/tickets', verificarToken, (req, res) => {
  const { titulo, descripcion, prioridad } = req.body;
  const { id: usuarioId, departamento, nombre } = req.usuario;

  if (!titulo) {
    return res.status(400).json({ error: 'El título es obligatorio' });
  }

  db.run(
    `INSERT INTO tickets (titulo, descripcion, prioridad, departamento, usuario_id)
     VALUES (?, ?, ?, ?, ?)`,
    [titulo, descripcion, prioridad || 'media', departamento, usuarioId],
    function(err) {
      if (err) return res.status(500).json({ error: 'Error al crear ticket' });
      
      // Obtener el ticket recién creado para notificar
      const ticketId = this.lastID;
      db.get('SELECT * FROM tickets WHERE id = ?', [ticketId], (err, ticket) => {
        if (!err && ticket) {
          notificarNuevoTicket(ticket, { nombre, departamento });
        }
      });
      
      res.status(201).json({ id: ticketId, message: 'Ticket creado' });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});