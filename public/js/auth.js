// Estado global
let currentUser = null;

// Variable global para SSE
let eventSource = null;

// Contador de notificaciones nuevas
let notificationHistory = []; // mantiene datos pero sólo usamos longitud para contador

// Iniciar notificaciones solo para admin
function iniciarNotificaciones() {
  if (!currentUser || currentUser.rol !== 'admin') {
    console.log('[Notificaciones] No es admin, no se inician');
    return;
  }
  
  if (eventSource) eventSource.close();
  
  const token = localStorage.getItem('token');
  const baseUrl = typeof API_URL !== 'undefined' ? API_URL : '';
  const url = `${baseUrl}/api/notificaciones?token=${token}`;
  
  console.log('[Notificaciones] Conectando a:', url);
  eventSource = new EventSource(url);
  
  eventSource.onmessage = function(event) {
    console.log('[Notificaciones] Evento recibido:', event.data);
    const data = JSON.parse(event.data);
    mostrarNotificacion(data);
  };
  
  eventSource.onerror = function(error) {
    console.error('[Notificaciones] Error en conexión SSE:', error);
    // Intentar reconectar después de 5 segundos
    setTimeout(iniciarNotificaciones, 5000);
  };
  
  console.log('[Notificaciones] SSE conectado para admin');
}

// Mostrar notificación flotante
function mostrarNotificacion(data) {
  console.log('[Notificaciones] Evento recibido:', data);
  
  // Solo procesar si tiene ticket
  if (!data.ticket) {
    console.log('[Notificaciones] Evento ignorado (no es un ticket):', data.tipo);
    return;
  }

  // construir texto simplificado para hist
  const histText = `${data.ticket.departamento} hizo ticket “${data.ticket.titulo}”`;
  const histItem = Object.assign({}, data, {histText});

  notificationHistory.unshift(histItem);
  actualizarCampana();

  const container = document.getElementById('notificaciones-container');
  if (!container) {
    console.error('[Notificaciones] No se encontró el contenedor de notificaciones');
    return;
  }
  
  const notificacion = document.createElement('div');
  notificacion.className = `notificacion notificacion-${data.tipo}`;
  notificacion.style.pointerEvents = 'auto';
  notificacion.innerHTML = `
    <div class="notificacion-contenido">
      <i class="fas fa-bell"></i>
      <span>${data.mensaje}</span>
      <small>#${data.ticket.id} - ${data.ticket.departamento} - Prioridad: ${data.ticket.prioridad}</small>
    </div>
    <button class="notificacion-cerrar">&times;</button>
  `;
  
  container.appendChild(notificacion);
  console.log('[Notificaciones] Popup mostrado');
  
  setTimeout(() => {
    if (notificacion.parentNode) notificacion.remove();
  }, 5e3);
  
  notificacion.querySelector('.notificacion-cerrar').addEventListener('click', (e) => {
    e.stopPropagation();
    notificacion.remove();
  });
  
  notificacion.addEventListener('click', (e) => {
    if (e.target.classList.contains('notificacion-cerrar')) return;
    // navegar a lista de tickets y vaciar contador
    notificationHistory = [];
    actualizarCampana();
    window.location.hash = '#/tickets';
    notificacion.remove();
  });
}

// Modificar setAuth para iniciar notificaciones cuando sea admin
function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  currentUser = user;
  actualizarUI();
  iniciarNotificaciones(); // <-- AÑADIR ESTA LÍNEA
}

// Modificar logout para cerrar SSE
function logout() {
  // Cerrar conexión SSE
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  // Limpiar almacenamiento
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentUser = null;
  window.location.hash = '#/login';
  actualizarUI();
}

// Cargar usuario desde localStorage al iniciar
function loadUserFromStorage() {
  const stored = localStorage.getItem('user');
  if (stored) {
    currentUser = JSON.parse(stored);
  }
  // actualizar campana por si hay notificaciones previas
  actualizarCampana();
  return currentUser;
}

// Actualizar interfaz según usuario logueado
function actualizarUI() {
  const navbar = document.getElementById('navbar');
  const userInfo = document.getElementById('user-info');
  const navAdmin = document.getElementById('nav-admin');

  if (currentUser) {
    navbar.style.display = 'block';
    userInfo.textContent = `${currentUser.nombre} (${currentUser.departamento})`;
    if (currentUser.rol === 'admin') {
      navAdmin.style.display = 'block';
    } else {
      navAdmin.style.display = 'none';
    }
    // el nav acaba de aparecer en la UI; si el darkmode aún no se ha
    // inicializado porque el toggle no existía antes (login), arrancamos
    // de nuevo. la función initDarkMode controla internamente que no se
    // registren dos veces los mismos event listeners.
    if (typeof initDarkMode === 'function') {
      initDarkMode();
    }
  } else {
    navbar.style.display = 'none';
  }
}

// Inicializar eventos de login/registro
function initAuth() {
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
      const data = await login(email, password);
      setAuth(data.token, data.usuario);
      window.location.hash = '#/dashboard';
    } catch (error) {
      alert('Error: ' + error.message);
    }
  });

  const registroForm = document.getElementById('registro-form');
  registroForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userData = {
      nombre: document.getElementById('reg-nombre').value,
      email: document.getElementById('reg-email').value,
      password: document.getElementById('reg-password').value,
      departamento: document.getElementById('reg-departamento').value,
    };
    try {
      await register(userData);
      alert('Registro exitoso, ahora inicia sesión');
      window.location.hash = '#/login';
    } catch (error) {
      alert('Error: ' + error.message);
    }
  });

  document.getElementById('logout').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
}

function conectarSSESiAdmin() {
  if (currentUser && currentUser.rol === 'admin') {
    iniciarNotificaciones();
  }
}

// Actualiza contador de campana y rellena dropdown
function actualizarCampana() {
  const countEl = document.getElementById('notif-count');
  if (!countEl) return;
  const count = notificationHistory.length;
  if (count > 0) {
    countEl.textContent = count;
    countEl.style.display = 'inline-block';
  } else {
    countEl.style.display = 'none';
  }
}

// Listener para campana
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('notif-toggle');
  // al clicar campana navega y reinicia contador
  if (toggle) {
    toggle.addEventListener('click', () => {
      notificationHistory = [];
      actualizarCampana();
      // dejar que el router maneje el hash, ya pone '#/tickets'
    });
  }
});