const API_URL = ''; // vacío porque servimos desde el mismo origen

async function request(endpoint, options = {}) {
  showLoading();
  try {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Error en la solicitud');
  }
  return data;
  } finally {
    hideLoading();
  }
}

// Auth
async function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

async function register(userData) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

// Tickets
async function getTickets() {
  return request('/tickets');
}

async function createTicket(ticket) {
  return request('/tickets', {
    method: 'POST',
    body: JSON.stringify(ticket),
  });
}

async function updateTicket(id, ticket) {
  return request(`/tickets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(ticket),
  });
}

async function deleteTicket(id) {
  return request(`/tickets/${id}`, {
    method: 'DELETE',
  });
}

// Usuarios (admin)
async function getUsers() {
  return request('/users');
}

async function updateUser(id, userData) {
  return request(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
}

async function deleteUser(id) {
  return request(`/users/${id}`, {
    method: 'DELETE',
  });
}

// Departamentos
async function getDepartamentos() {
  return request('/departamentos');
}

// Comentarios
async function getComentarios(ticketId) {
  return request(`/tickets/${ticketId}/comentarios`);
}

async function crearComentario(ticketId, mensaje) {
  return request(`/tickets/${ticketId}/comentarios`, {
    method: 'POST',
    body: JSON.stringify({ mensaje }),
  });
}

// En api.js o en un nuevo archivo ui.js (y luego lo incluyes en index.html)
function showLoading() {
  document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
}