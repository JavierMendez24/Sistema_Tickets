// Modo oscuro
function initDarkMode() {
    const toggle = document.getElementById('dark-mode-toggle');
    if (!toggle) return; // nada que hacer si no existe aún
    if (toggle.dataset.darkInitialized) {
        // ya estaba inicializado en una llamada previa
        return;
    }
    toggle.dataset.darkInitialized = 'true';

    const icon = document.getElementById('dark-mode-icon');
    // notamos que el logo puede no estar en DOM cuando se inicia el script,
    // por eso no guardamos la referencia aquí, la buscamos cada vez que la
    // necesitamos.
    
    // Verificar preferencia guardada
    const darkMode = localStorage.getItem('darkMode') === 'true';
    
    // Función para actualizar el logo según el modo
    function actualizarLogo(esOscuro) {
        const logoEl = document.getElementById('logo-img');
        if (!logoEl) {
            // si no está, posiblemente todavía no se ha mostrado la navbar;
            // dejamos constancia en la consola para poder depurar.
            console.warn('actualizarLogo: elemento #logo-img no encontrado');
            return;
        }
        logoEl.src = esOscuro ? 'img/logoTickets-dark.png' : 'img/logoTickets.png';
    }
    
    // Aplicar modo inicial (se ejecuta cuando el DOM está parseado)
    if (darkMode) {
        document.body.classList.add('dark-mode');
        if (icon) icon.classList.replace('fa-moon', 'fa-sun');
        actualizarLogo(true);
    } else {
        actualizarLogo(false);
    }
    
    // Evento click - asegurar que no navega
    toggle.addEventListener('click', (e) => {
        e.preventDefault(); // IMPORTANTE: evita la navegación
        e.stopPropagation(); // Opcional: evita propagación
        
        // Alternar clase
        document.body.classList.toggle('dark-mode');
        
        // Determinar nuevo estado
        const isDark = document.body.classList.contains('dark-mode');
        
        // Guardar preferencia
        localStorage.setItem('darkMode', isDark);
        
        // Cambiar icono
        if (icon) {
            if (isDark) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        }
        
        // Cambiar logo (va a buscar el elemento en cada llamada)
        actualizarLogo(isDark);
        
        return false; // Seguridad extra
    });
}

// Llamar a la función después de que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('dark-mode-toggle')) {
        initDarkMode();
    }
});