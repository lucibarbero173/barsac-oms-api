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

// =====================================================
// FILTROS POR COLUMNA en todas las tablas con buscador
// =====================================================
// Debajo de cada encabezado va un desplegable con los valores de esa columna. Se engancha a
// cualquier DataTable, así las pantallas no tienen que hacer nada. Cada desplegable ofrece
// solo lo que coincide con los otros filtros activos (ej. los estados de ese cliente).
// Para dejar afuera una columna: class="no-filtrar" o "no-exportar" en su encabezado.
if (window.jQuery && $.fn && $.fn.dataTable) {
    (function () {
        const VACIO = '(vacío)';
        const FECHA = /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}/;

        // tabla -> { columna: valor elegido }. Sobrevive cuando una pantalla recarga su tabla.
        const filtrosPorTabla = new WeakMap();
        const filasContadas = new WeakMap();

        function textoCelda(api, fila, columna) {
            const celda = api.cell(fila, columna).node();
            return (celda ? celda.textContent : '').replace(/\s+/g, ' ').trim() || VACIO;
        }

        // Cumple todos los filtros, salvo el de la columna indicada (para armar sus opciones)
        function cumpleFiltros(api, fila, filtros, salvoColumna) {
            return Object.keys(filtros).every((columna) =>
                Number(columna) === salvoColumna || textoCelda(api, fila, Number(columna)) === filtros[columna]);
        }

        $.fn.dataTable.ext.search.push((settings, data, fila) => {
            const filtros = filtrosPorTabla.get(settings.nTable);
            if (!filtros || Object.keys(filtros).length === 0) return true;
            return cumpleFiltros(new $.fn.dataTable.Api(settings), fila, filtros);
        });

        // Ordena fechas de la más nueva a la más vieja; lo demás alfabético y respetando números
        function ordenarValores(valores) {
            const fecha = (v) => (v.includes('/') ? v.split(' ')[0].split('/').reverse().join('-') : v);
            return valores.sort((a, b) => {
                if (a === VACIO) return 1;
                if (b === VACIO) return -1;
                if (FECHA.test(a) && FECHA.test(b)) return fecha(b).localeCompare(fecha(a));
                return a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });
            });
        }

        function actualizarOpciones(api) {
            const tabla = api.table().node();
            const filtros = filtrosPorTabla.get(tabla) || {};
            const filas = api.rows().indexes().toArray();

            $(api.table().header()).find('.filtro-columna').each(function () {
                const columna = Number(this.dataset.columna);
                const valores = new Set();
                filas.forEach((fila) => {
                    if (cumpleFiltros(api, fila, filtros, columna)) valores.add(textoCelda(api, fila, columna));
                });

                const elegido = filtros[columna];
                if (elegido) valores.add(elegido);

                this.innerHTML = '<option value="">Todos</option>';
                ordenarValores([...valores]).forEach((valor) => this.add(new Option(valor, valor)));
                this.value = elegido || '';
                this.classList.toggle('filtro-activo', !!elegido);
            });

            $(api.table().container()).find('.btn-limpiar-filtros').toggle(Object.keys(filtros).length > 0);
        }

        function aplicarFiltro(api, columna, valor) {
            const tabla = api.table().node();
            const filtros = filtrosPorTabla.get(tabla) || {};
            if (valor) filtros[columna] = valor; else delete filtros[columna];
            filtrosPorTabla.set(tabla, filtros);
            api.draw();
            actualizarOpciones(api);
        }

        function columnaFiltrable(api, columna) {
            const th = api.column(columna).header();
            const titulo = th.textContent.trim().toLowerCase();
            if (!titulo || titulo === 'acciones' || th.classList.contains('no-filtrar') || th.classList.contains('no-exportar')) return false;
            return !api.column(columna).nodes().toArray().some((td) => td.querySelector('input, select, button, textarea, img'));
        }

        function armarFiltros(api) {
            const $thead = $(api.table().header());
            $thead.find('.fila-filtros').remove();

            const $fila = $('<tr class="fila-filtros"></tr>');
            api.columns(':visible').indexes().toArray().forEach((columna) => {
                const $celda = $('<td></td>').appendTo($fila);
                if (!columnaFiltrable(api, columna)) return;

                $('<select class="form-control form-control-sm filtro-columna" title="Filtrar por esta columna"></select>')
                    .attr('data-columna', columna)
                    .on('change', function () { aplicarFiltro(api, columna, this.value); })
                    .appendTo($celda);
            });
            $thead.append($fila);

            const $contenedor = $(api.table().container());
            if ($contenedor.find('.btn-limpiar-filtros').length === 0) {
                $('<button type="button" class="btn btn-link btn-sm btn-limpiar-filtros"><i class="fas fa-times mr-1"></i>Limpiar filtros</button>')
                    .on('click', () => {
                        filtrosPorTabla.delete(api.table().node());
                        api.draw();
                        actualizarOpciones(api);
                    })
                    .appendTo($contenedor.find('.dataTables_filter'));
            }

            filasContadas.set(api.table().node(), api.rows().count());
            actualizarOpciones(api);
        }

        $(document).on('init.dt', (e, settings) => {
            if (e.namespace !== 'dt') return;
            const api = new $.fn.dataTable.Api(settings);
            armarFiltros(api);
            // Si había filtros antes de recargar la tabla, se vuelven a aplicar
            if (Object.keys(filtrosPorTabla.get(settings.nTable) || {}).length > 0) api.draw();
        });

        // Pantallas que cargan las filas después de armar la tabla: se rehacen las opciones
        $(document).on('draw.dt', (e, settings) => {
            if (e.namespace !== 'dt' || !settings._bInitComplete) return;
            const api = new $.fn.dataTable.Api(settings);
            if (filasContadas.get(settings.nTable) !== api.rows().count()) armarFiltros(api);
        });

        $(document).on('destroy.dt', (e, settings) => {
            if (e.namespace === 'dt') $(settings.nTHead).find('.fila-filtros').remove();
        });
    })();
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
// Chat interno: la burbujita abajo a la derecha (se carga en todas las pantallas con sesión)
(function () {
    if (!localStorage.getItem('token')) return;
    const s = document.createElement('script');
    s.src = 'js/chat.js';
    document.body.appendChild(s);
})();
