let todosLosUsuarios = [];

async function cargarUsuarios() {
  if (currentUser?.rol !== 'admin') return;
  try {
    todosLosUsuarios = await getUsers();
    renderUsuarios();
  } catch (error) {
    alert('Error al cargar usuarios: ' + error.message);
  }
}

function renderUsuarios() {
  const tbody = document.getElementById('users-list');
  tbody.innerHTML = '';
  todosLosUsuarios.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.id}</td>
      <td>${u.nombre}</td>
      <td>${u.email}</td>
      <td>${u.departamento}</td>
      <td>${u.rol}</td>
      <td>
        <button class="btn-secondary editar-usuario" data-id="${u.id}"><i class="fas fa-edit"></i></button>
        <button class="btn-secondary eliminar-usuario" data-id="${u.id}"><i class="fas fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll('.editar-usuario').forEach(btn => {
    btn.addEventListener('click', () => abrirModalEditarUsuario(btn.dataset.id));
  });
  document.querySelectorAll('.eliminar-usuario').forEach(btn => {
    btn.addEventListener('click', () => eliminarUsuario(btn.dataset.id));
  });
}

// Modal usuario
function abrirModalNuevoUsuario() {
  document.getElementById('user-modal-title').textContent = 'Nuevo Usuario';
  document.getElementById('user-id').value = '';
  document.getElementById('user-nombre').value = '';
  document.getElementById('user-email').value = '';
  document.getElementById('user-password').value = '';
  document.getElementById('user-password').required = true;
  document.getElementById('user-password-group').style.display = 'block';
  document.getElementById('user-departamento').value = '';
  document.getElementById('user-rol').value = 'user';
  document.getElementById('user-modal').style.display = 'block';
}

function abrirModalEditarUsuario(id) {
  const user = todosLosUsuarios.find(u => u.id == id);
  if (!user) return;
  document.getElementById('user-modal-title').textContent = 'Editar Usuario';
  document.getElementById('user-id').value = user.id;
  document.getElementById('user-nombre').value = user.nombre;
  document.getElementById('user-email').value = user.email;
  document.getElementById('user-password').value = '';
  document.getElementById('user-password').required = false;
  document.getElementById('user-password-group').style.display = 'none';
  document.getElementById('user-departamento').value = user.departamento;
  document.getElementById('user-rol').value = user.rol;
  document.getElementById('user-modal').style.display = 'block';
}

async function guardarUsuario(e) {
  e.preventDefault();
  const id = document.getElementById('user-id').value;
  const userData = {
    nombre: document.getElementById('user-nombre').value,
    email: document.getElementById('user-email').value,
    departamento: document.getElementById('user-departamento').value,
    rol: document.getElementById('user-rol').value,
  };
  // Si es nuevo y hay contraseña, habría que enviarla pero nuestra API no soporta crear usuarios directamente (solo registro)
  // Para simplificar, en el panel admin solo permitimos editar usuarios existentes, no crear nuevos.
  // Podríamos implementar creación pero requeriría enviar pass. Lo dejamos como edición.
  // Otra opción: usar el registro normal.
  if (!id) {
    alert('La creación de usuarios debe hacerse desde el registro público o implementar endpoint específico. Por ahora, edita usuarios existentes.');
    return;
  }

  try {
    await updateUser(id, userData);
    cerrarModalUsuario();
    cargarUsuarios();
  } catch (error) {
    alert('Error al guardar usuario: ' + error.message);
  }
}

async function eliminarUsuario(id) {
  if (!confirm('¿Eliminar usuario?')) return;
  try {
    await deleteUser(id);
    cargarUsuarios();
  } catch (error) {
    alert('Error al eliminar: ' + error.message);
  }
}

function cerrarModalUsuario() {
  document.getElementById('user-modal').style.display = 'none';
}

// Inicializar admin
function initAdmin() {
  document.getElementById('btn-nuevo-usuario').addEventListener('click', abrirModalNuevoUsuario);
  document.querySelector('#user-modal .close').addEventListener('click', cerrarModalUsuario);
  document.getElementById('user-form').addEventListener('submit', guardarUsuario);
}