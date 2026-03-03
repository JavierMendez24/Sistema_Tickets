// Variables globales para filtros
let todosLosTickets = [];

// Cargar tickets y renderizar tabla
async function cargarTickets() {
  try {
    todosLosTickets = await getTickets();
    aplicarFiltrosTickets();
  } catch (error) {
    alert('Error al cargar tickets: ' + error.message);
  }
}

function renderTickets(tickets) {
  const tbody = document.getElementById('tickets-list');
  tbody.innerHTML = '';

  tickets.forEach(t => {
    const tr = document.createElement('tr');
    const fecha = new Date(t.fecha_creacion).toLocaleDateString();
    const estadoClass = `estado-${t.estado.replace(' ', '-')}`;
    const prioridadClass = `prioridad-${t.prioridad}`;

    tr.innerHTML = `
      <td>#${t.id}</td>
      <td>${t.titulo}</td>
      <td><span class="${estadoClass}">${t.estado}</span></td>
      <td><span class="${prioridadClass}">${t.prioridad}</span></td>
      <td>${t.departamento}</td>
      <td>${t.usuario_nombre || 'N/A'}</td>
      <td>${fecha}</td>
      <td>
        <button class="btn-secondary ver-detalle" data-id="${t.id}"><i class="fas fa-eye"></i></button>
        <button class="btn-secondary editar-ticket" data-id="${t.id}"><i class="fas fa-edit"></i></button>
        ${currentUser?.rol === 'admin' ? `<button class="btn-secondary eliminar-ticket" data-id="${t.id}"><i class="fas fa-trash"></i></button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Eventos de botones
  document.querySelectorAll('.editar-ticket').forEach(btn => {
    btn.addEventListener('click', () => abrirModalEditarTicket(btn.dataset.id));
  });
  document.querySelectorAll('.eliminar-ticket').forEach(btn => {
    btn.addEventListener('click', () => eliminarTicket(btn.dataset.id));
  });
  document.querySelectorAll('.ver-detalle').forEach(btn => {
  btn.addEventListener('click', () => abrirDetalleTicket(btn.dataset.id));
  });
}

function aplicarFiltrosTickets() {
  const filtroTitulo = document.getElementById('filter-titulo').value.toLowerCase();
  const filtroEstado = document.getElementById('filter-estado').value;
  const filtroDepto = document.getElementById('filter-departamento').value;

  let filtrados = todosLosTickets.filter(t => {
    return (filtroTitulo === '' || t.titulo.toLowerCase().includes(filtroTitulo)) &&
           (filtroEstado === '' || t.estado === filtroEstado) &&
           (filtroDepto === '' || t.departamento === filtroDepto);
  });
  renderTickets(filtrados);
}

// Modal de tickets
function abrirModalNuevoTicket() {
  document.getElementById('modal-title').textContent = 'Nuevo Ticket';
  document.getElementById('ticket-id').value = '';
  document.getElementById('ticket-titulo').value = '';
  document.getElementById('ticket-descripcion').value = '';
  document.getElementById('ticket-prioridad').value = 'media';
  document.getElementById('campo-estado-edicion').style.display = 'none';
  document.getElementById('ticket-modal').style.display = 'block';
}

async function abrirModalEditarTicket(id) {
  const ticket = todosLosTickets.find(t => t.id == id);
  if (!ticket) return;

  document.getElementById('modal-title').textContent = 'Editar Ticket';
  document.getElementById('ticket-id').value = ticket.id;
  document.getElementById('ticket-titulo').value = ticket.titulo;
  document.getElementById('ticket-descripcion').value = ticket.descripcion || '';
  document.getElementById('ticket-prioridad').value = ticket.prioridad;
  document.getElementById('ticket-estado').value = ticket.estado;
  document.getElementById('campo-estado-edicion').style.display = 'block';
  document.getElementById('ticket-modal').style.display = 'block';
}

async function guardarTicket(e) {
  e.preventDefault();
  const id = document.getElementById('ticket-id').value;
  const ticketData = {
    titulo: document.getElementById('ticket-titulo').value,
    descripcion: document.getElementById('ticket-descripcion').value,
    prioridad: document.getElementById('ticket-prioridad').value,
  };
  if (id) {
    ticketData.estado = document.getElementById('ticket-estado').value;
  }

  try {
    if (id) {
      await updateTicket(id, ticketData);
    } else {
      await createTicket(ticketData);
    }
    cerrarModal();
    cargarTickets();
  } catch (error) {
    alert('Error al guardar ticket: ' + error.message);
  }
}

async function eliminarTicket(id) {
  if (!confirm('¿Eliminar ticket?')) return;
  try {
    await deleteTicket(id);
    cargarTickets();
  } catch (error) {
    alert('Error al eliminar: ' + error.message);
  }
}

function cerrarModal() {
  document.getElementById('ticket-modal').style.display = 'none';
}

// Inicializar eventos de tickets
function initTickets() {
  document.getElementById('btn-nuevo-ticket').addEventListener('click', abrirModalNuevoTicket);
  document.querySelector('#ticket-modal .close').addEventListener('click', cerrarModal);
  document.getElementById('ticket-form').addEventListener('submit', guardarTicket);
  document.getElementById('filter-titulo').addEventListener('input', aplicarFiltrosTickets);
  document.getElementById('filter-estado').addEventListener('change', aplicarFiltrosTickets);
  document.getElementById('filter-departamento').addEventListener('change', aplicarFiltrosTickets);
}

// Variables para el ticket actual en detalle
let ticketActualDetalle = null;

// Abrir modal de detalle
async function abrirDetalleTicket(id) {
  try {
    // Obtener datos completos del ticket (podrías tener un endpoint específico, pero usaremos el listado)
    const tickets = await getTickets();
    ticketActualDetalle = tickets.find(t => t.id == id);
    if (!ticketActualDetalle) return;

    // Llenar información básica
    document.getElementById('detalle-id').textContent = ticketActualDetalle.id;
    document.getElementById('detalle-titulo').textContent = ticketActualDetalle.titulo;
    document.getElementById('detalle-descripcion').textContent = ticketActualDetalle.descripcion || 'Sin descripción';
    document.getElementById('detalle-estado').textContent = ticketActualDetalle.estado;
    document.getElementById('detalle-prioridad').textContent = ticketActualDetalle.prioridad;
    document.getElementById('detalle-departamento').textContent = ticketActualDetalle.departamento;
    document.getElementById('detalle-usuario').textContent = ticketActualDetalle.usuario_nombre || 'Desconocido';
    document.getElementById('detalle-fecha').textContent = new Date(ticketActualDetalle.fecha_creacion).toLocaleString();

    // Cargar comentarios
    await cargarComentarios(id);

    // Mostrar modal
    document.getElementById('detalle-ticket-modal').style.display = 'block';
  } catch (error) {
    alert('Error al cargar detalles: ' + error.message);
  }
}

// Cargar comentarios
async function cargarComentarios(ticketId) {
  try {
    const comentarios = await getComentarios(ticketId);
    const lista = document.getElementById('comentarios-lista');
    lista.innerHTML = '';
    if (comentarios.length === 0) {
      lista.innerHTML = '<p class="text-center">No hay comentarios</p>';
    } else {
      comentarios.forEach(c => {
        const div = document.createElement('div');
        div.style.marginBottom = '1rem';
        div.style.padding = '0.5rem';
        div.style.backgroundColor = '#f8fafc';
        div.style.borderRadius = '8px';
        div.innerHTML = `
          <strong>${c.usuario_nombre}</strong> <small>${new Date(c.fecha_creacion).toLocaleString()}</small>
          <p>${c.mensaje}</p>
        `;
        lista.appendChild(div);
      });
    }
  } catch (error) {
    console.error('Error cargando comentarios:', error);
  }
}

// Enviar nuevo comentario
document.getElementById('nuevo-comentario-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!ticketActualDetalle) return;
  const mensaje = document.getElementById('comentario-texto').value.trim();
  if (!mensaje) return;

  try {
    await crearComentario(ticketActualDetalle.id, mensaje);
    document.getElementById('comentario-texto').value = '';
    await cargarComentarios(ticketActualDetalle.id); // Recargar
  } catch (error) {
    alert('Error al enviar comentario: ' + error.message);
  }
});

// Cerrar modal detalle
document.querySelector('#detalle-ticket-modal .close-detalle').addEventListener('click', () => {
  document.getElementById('detalle-ticket-modal').style.display = 'none';
  ticketActualDetalle = null;
});