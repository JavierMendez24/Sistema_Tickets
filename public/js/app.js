// Enrutamiento simple con hash
function router() {
  const hash = window.location.hash.slice(1) || '/login';
  const sections = document.querySelectorAll('.section');

  // Ocultar todas
  sections.forEach(s => s.classList.remove('active'));

  if (!currentUser && !['/login', '/registro'].includes(hash)) {
    window.location.hash = '#/login';
    return;
  }

  switch (hash) {
    case '/login':
      document.getElementById('login-section').classList.add('active');
      break;
    case '/registro':
      document.getElementById('registro-section').classList.add('active');
      break;
    case '/dashboard':
      if (!currentUser) { window.location.hash = '#/login'; return; }
      document.getElementById('dashboard-section').classList.add('active');
      cargarDashboard();
      break;
    case '/tickets':
      if (!currentUser) { window.location.hash = '#/login'; return; }
      document.getElementById('tickets-section').classList.add('active');
      cargarTickets();
      break;
    case '/admin':
      if (!currentUser || currentUser.rol !== 'admin') {
        window.location.hash = '#/dashboard';
        return;
      }
      document.getElementById('admin-section').classList.add('active');
      cargarUsuarios();
      break;
    default:
      window.location.hash = '#/login';
  }
}

// Cargar datos del dashboard
async function cargarDashboard() {
  try {
    const tickets = await getTickets();
    const abiertos = tickets.filter(t => t.estado === 'abierto').length;
    const enProgreso = tickets.filter(t => t.estado === 'en progreso').length;
    const cerrados = tickets.filter(t => t.estado === 'cerrado').length;

    document.getElementById('dashboard-cards').innerHTML = `
      <div class="dashboard-card">
        <h3>Tickets Abiertos</h3>
        <div class="numero">${abiertos}</div>
      </div>
      <div class="dashboard-card">
        <h3>En Progreso</h3>
        <div class="numero">${enProgreso}</div>
      </div>
      <div class="dashboard-card">
        <h3>Cerrados</h3>
        <div class="numero">${cerrados}</div>
      </div>
      <div class="dashboard-card">
        <h3>Total</h3>
        <div class="numero">${tickets.length}</div>
      </div>
    `;
  } catch (error) {
    console.error('Error cargando dashboard:', error);
  }
}

// Cargar departamentos en selects
async function cargarDepartamentos() {
  try {
    const deptos = await getDepartamentos();
    const selects = [
      document.getElementById('reg-departamento'),
      document.getElementById('filter-departamento'),
      document.getElementById('user-departamento')
    ];
    selects.forEach(select => {
      if (!select) return;
      select.innerHTML = '<option value="">Selecciona...</option>';
      deptos.forEach(d => {
        select.innerHTML += `<option value="${d}">${d}</option>`;
      });
    });
  } catch (error) {
    console.error('Error cargando departamentos:', error);
  }
}

// Inicialización
window.addEventListener('load', async () => {
  loadUserFromStorage();
  actualizarUI();
  // En window.addEventListener('load', ...) después de actualizarUI()
  if (currentUser && currentUser.rol === 'admin') {
    iniciarNotificaciones(); // Asegúrate de que esta función sea global (desde auth.js)
  }
  await cargarDepartamentos();
  initAuth();
  initTickets();
  initAdmin();

  window.addEventListener('hashchange', router);
  router();
});


