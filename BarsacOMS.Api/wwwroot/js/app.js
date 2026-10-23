// js/app.js - Lógica Global (Topbar, Tema y Sesión)

// Textos de las tablas (DataTables) en español en todo el sistema. Se setea al cargar
// app.js, antes de que las pantallas armen sus tablas (lo hacen al terminar de cargar).
if (window.jQuery && $.fn && $.fn.dataTable) {
    $.extend(true, $.fn.dataTable.defaults, {
        language: {
            lengthMenu: 'Mostrar _MENU_',
            search: 'Buscar:',
            info: '_START_ a _END_ de _TOTAL_',
            infoEmpty: '0 resultados',
            infoFiltered: '(de _MAX_ en total)',
            zeroRecords: 'No se encontraron resultados',
            emptyTable: 'No hay datos',
            loadingRecords: 'Cargando...',
            paginate: { first: 'Primera', last: 'Última', next: 'Siguiente', previous: 'Anterior' }
        }
    });
}

// Click en cualquier imagen para verla grande (requiere <div id="modalZoomImagen"> en la página)
function abrirZoomImagen(src) {
    if (!src) return;
    const $modal = $('#modalZoomImagen');
    if ($modal.length === 0) return;

    $('#imgZoomGrande').attr('src', src);
    $modal.modal('show');
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar Nombre de Usuario en la Topbar
    const usuarioNombre = localStorage.getItem('usuarioNombre');
    const lblNombre = document.getElementById('lblNombreUsuario');
    if (lblNombre && usuarioNombre) {
        lblNombre.textContent = usuarioNombre;
    }

    // 1.b Traer el perfil real (nombre actualizado + foto) del servidor
    const token = localStorage.getItem('token');
    if (token) {
        fetch('/api/Perfil/me')
            .then((res) => (res.ok ? res.json() : null))
            .then((perfil) => {
                if (!perfil) return;

                if (lblNombre) lblNombre.textContent = perfil.nombre;
                localStorage.setItem('usuarioNombre', perfil.nombre);

                if (perfil.fotoBase64) {
                    document.querySelectorAll('.img-profile').forEach((el) => {
                        el.innerHTML = '';
                        el.style.backgroundImage = `url(${perfil.fotoBase64})`;
                        el.style.backgroundSize = 'cover';
                        el.style.backgroundPosition = 'center';
                    });
                }
            })
            .catch(() => {});
    }

    // 2. Manejo de Cierre de Sesión
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();

            // Eliminamos las credenciales pero preservamos el tema si se desea
            localStorage.removeItem('token');
            localStorage.removeItem('usuarioNombre');
            localStorage.removeItem('usuarioRol');
            localStorage.removeItem('usuarioLogueado');

            // Redirigimos al login
            window.location.href = 'login.html';
        });
    }

    // 3. Manejo de Modo Oscuro / Claro
    const toggleBtn = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');

    // Aplicar tema guardado en localStorage o por defecto 'light'
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    if (themeIcon && currentTheme === 'dark') {
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    }

    if (toggleBtn && themeIcon) {
        toggleBtn.addEventListener('click', () => {
            let theme = document.documentElement.getAttribute('data-theme');
            if (theme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                themeIcon.classList.replace('fa-sun', 'fa-moon');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeIcon.classList.replace('fa-moon', 'fa-sun');
            }
        });
    }

    // 4. Menú lateral plegado por defecto (solo íconos); recuerda si se despliega,
    // así queda igual al navegar entre pantallas en vez de resetearse en cada carga.
    // En el celu el menú es un panel que se abre por encima: siempre arranca cerrado y
    // no guarda el estado (eso es solo para la compu).
    const sidebar = document.querySelector('.sidebar');
    const esCelu = () => window.innerWidth < 768;

    if (sidebar) {
        const sidebarState = localStorage.getItem('sidebarState') || 'colapsada';
        if (esCelu() || sidebarState === 'colapsada') {
            document.body.classList.add('sidebar-toggled');
            sidebar.classList.add('toggled');
        }

        // Fondo oscuro detrás del menú abierto en el celu; tocarlo cierra el menú
        const fondo = document.createElement('div');
        fondo.className = 'sidebar-backdrop d-none';
        document.body.appendChild(fondo);

        const actualizarFondo = () => {
            fondo.classList.toggle('d-none', !esCelu() || sidebar.classList.contains('toggled'));
        };
        const cerrarMenu = () => {
            document.body.classList.add('sidebar-toggled');
            sidebar.classList.add('toggled');
            actualizarFondo();
        };
        fondo.addEventListener('click', cerrarMenu);

        ['sidebarToggle', 'sidebarToggleTop'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    actualizarFondo();
                    if (esCelu()) return;
                    const quedoColapsada = sidebar.classList.contains('toggled');
                    localStorage.setItem('sidebarState', quedoColapsada ? 'colapsada' : 'desplegada');
                });
            }
        });
    }
});