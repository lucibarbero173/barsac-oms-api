let productosGlobal = [];
let idOrdenEdicion = null;
let cargandoEdicion = false; // Candado para evitar recálculos automáticos indebidos

// ==========================================
// FUNCIÓN MAPEADORA DE FORMA DE PAGO (Ámbito Global)
// ==========================================
function mapearTipoPagoAClave(formaPago) {
    const pago = (formaPago || '').toLowerCase().trim();

    // Efectivo y Cheque van a la lista de 'EFECTIVO'
    if (pago === 'efectivo' || pago === 'cheque') {
        return 'EFECTIVO';
    }
    // Ualá, Mercado Pago e ICBC van a la lista de 'TRANSFERENCIA'
    if (pago === 'uala' || pago === 'mercadopago' || pago === 'icbc') {
        return 'TRANSFERENCIA';
    }

    return 'EFECTIVO'; // Valor por defecto
}

// ==========================================
// HABILITAR / DESHABILITAR PRECIO SEGÚN LISTA
// ==========================================
function actualizarEstadoLecturaPrecios() {
    const listaPrecios = document.getElementById("listaPrecios")?.value || "";
    const esEspecial = listaPrecios.trim().toUpperCase() === "ESPECIAL";

    document.querySelectorAll("#detalleBody .precio").forEach(input => {
        if (esEspecial) {
            input.removeAttribute("readonly");
        } else {
            input.setAttribute("readonly", "readonly");
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    idOrdenEdicion = urlParams.get("id");

    // Escuchar eventos
    document.getElementById("clienteSelect")?.addEventListener("change", cargarDatosCliente);
    document.getElementById("formaPago")?.addEventListener("change", recalcularTodosLosPrecios);

    // Cargar datos en orden
    await cargarClientesSelect();
    await cargarProductosGlobal(); // Espera obligatoria a los productos

    if (idOrdenEdicion) {
        if (document.getElementById("tituloPagina")) {
            document.getElementById("tituloPagina").textContent = "Editar Pedido";
        }
        await cargarOrdenParaEditar(idOrdenEdicion);
    } else {
        agregarFila();
    }
});

// Cargar lista de clientes ordenada alfabéticamente y con su número al lado
async function cargarClientesSelect() {
    try {
        const res = await fetch("https://barsac-oms-api-production.up.railway.app/api/cliente");
        if (!res.ok) return;
        const clientes = await res.json();

        // 1. Ordenar alfabéticamente por el nombre del cliente
        clientes.sort((a, b) => {
            const nombreA = (a.nombre || "").toLowerCase();
            const nombreB = (b.nombre || "").toLowerCase();
            return nombreA.localeCompare(nombreB);
        });

        const select = document.getElementById("clienteSelect");
        if (!select) return;

        select.innerHTML = '<option value="">Seleccione Cliente</option>';

        // 2. Agregar cada cliente mostrando su número al lado
        clientes.forEach(c => {
            select.innerHTML += `<option value="${c.id}">#${c.id} - ${c.nombre}</option>`;
        });
    } catch (e) {
        console.error("Error al cargar clientes:", e);
    }
}

// Cargar datos del cliente seleccionado
async function cargarDatosCliente() {
    const id = document.getElementById("clienteSelect").value;

    if (document.getElementById("clienteId")) {
        document.getElementById("clienteId").value = id || "";
    } else if (document.getElementById("numCliente")) {
        document.getElementById("numCliente").value = id || "";
    }

    if (!id) {
        if (document.getElementById("solicitante")) document.getElementById("solicitante").value = "";
        if (document.getElementById("telefono")) document.getElementById("telefono").value = "";
        if (document.getElementById("disciplina")) document.getElementById("disciplina").value = "";
        if (document.getElementById("listaPrecios")) document.getElementById("listaPrecios").value = "";

        actualizarEstadoLecturaPrecios();
        return;
    }

    try {
        const res = await fetch(`https://barsac-oms-api-production.up.railway.app/api/cliente/${id}`);
        if (!res.ok) return;
        const c = await res.json();

        if (document.getElementById("solicitante")) document.getElementById("solicitante").value = c.solicitante || "";
        if (document.getElementById("telefono")) document.getElementById("telefono").value = c.telefono || "";
        if (document.getElementById("disciplina")) document.getElementById("disciplina").value = c.disciplina || "";
        if (document.getElementById("listaPrecios")) document.getElementById("listaPrecios").value = c.listaPrecios || "";

        // Actualizamos los campos de precio de todas las filas creadas
        actualizarEstadoLecturaPrecios();

        // Si cambiamos de cliente y no estamos cargando una edición, recalculamos precios de los ítems existentes
        if (!cargandoEdicion) {
            await recalcularTodosLosPrecios();
        }

    } catch (e) {
        console.error("Error al cargar datos del cliente:", e);
    }
}

// Cargar productos en variable global
async function cargarProductosGlobal() {
    try {
        const res = await fetch("https://barsac-oms-api-production.up.railway.app/api/producto");
        if (res.ok) {
            productosGlobal = await res.json();
        }
    } catch (e) {
        console.error("Error al cargar productos:", e);
    }
}

// Agregar fila a la tabla
function agregarFila() {
    let opciones = '<option value="">Seleccione Producto</option>';

    productosGlobal.forEach(p => {
        opciones += `<option value="${p.id}">${p.nombre}</option>`;
    });

    const tbody = document.getElementById("detalleBody");
    if (!tbody) return;

    tbody.insertAdjacentHTML("beforeend", `
        <tr>
            <td>
                <input type="number" class="form-control cantidad" value="1" min="1" onchange="calcularTotales()">
            </td>
            <td>
                <select class="form-control producto" onchange="actualizarPrecio(this)">
                    ${opciones}
                </select>
            </td>
            <td>
                <select class="form-control talle" onchange="actualizarPrecio(this)">
                    <option value="ADULTO">Adulto</option>
                    <option value="NIÑO">Niño</option>
                </select>
            </td>
            <td>
                <input type="number" class="form-control precio" value="0" oninput="calcularTotales()">
            </td>
            <td>
                <input type="number" class="form-control total" value="0" readonly>
            </td>
            <td class="text-center">
                <button class="btn btn-danger btn-sm" onclick="eliminarFila(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `);

    actualizarEstadoLecturaPrecios();
    calcularTotales();
}

function eliminarFila(btn) {
    btn.closest("tr").remove();
    calcularTotales();
}

// Actualizar el precio dinámicamente al cambiar Producto, Talle o Forma de Pago
async function actualizarPrecio(element) {
    if (cargandoEdicion) return; // Si estamos cargando datos iniciales, ignoramos eventos sueltos

    const fila = element.closest("tr");
    const productoId = fila.querySelector(".producto").value;
    const talle = fila.querySelector(".talle").value;

    // Si la lista de precios es ESPECIAL, se respeta el valor tipeado a mano
    const listaPrecios = document.getElementById("listaPrecios")?.value || "";
    if (listaPrecios.trim().toUpperCase() === "ESPECIAL") {
        calcularTotales();
        return;
    }

    const formaPagoSeleccionada = document.getElementById("formaPago")?.value || "efectivo";
    const tipoPagoBackend = mapearTipoPagoAClave(formaPagoSeleccionada);

    if (!productoId) {
        fila.querySelector(".precio").value = 0;
        calcularTotales();
        return;
    }

    try {
        const res = await fetch(`https://barsac-oms-api-production.up.railway.app/api/producto/precio?productoId=${productoId}&talle=${talle}&tipoPago=${tipoPagoBackend}`);
        if (res.ok) {
            const data = await res.json();
            fila.querySelector(".precio").value = data.precio !== undefined ? data.precio : 0;
        }
    } catch (e) {
        console.error("Error al obtener precio:", e);
    }

    calcularTotales();
}

// Recalcular todos los precios si cambia la Forma de Pago
async function recalcularTodosLosPrecios() {
    if (cargandoEdicion) return;

    const filas = document.querySelectorAll("#detalleBody tr");
    for (const fila of filas) {
        const prodSelect = fila.querySelector(".producto");
        if (prodSelect && prodSelect.value) {
            await actualizarPrecio(prodSelect);
        }
    }
    calcularTotales();
}

// Calcular Totales
function calcularTotales() {
    let totalGeneral = 0;
    let cantidadTotalPrendas = 0;

    document.querySelectorAll("#detalleBody tr").forEach(fila => {
        const cant = Number(fila.querySelector(".cantidad")?.value || 0);
        const precio = Number(fila.querySelector(".precio")?.value || 0);
        const totalFila = cant * precio;

        if (fila.querySelector(".total")) {
            fila.querySelector(".total").value = totalFila;
        }

        totalGeneral += totalFila;
        cantidadTotalPrendas += cant;
    });

    const senas = Number(document.getElementById("senas")?.value || 0);
    const otrosCobros = Number(document.getElementById("otrosCobros")?.value || 0);
    const saldo = totalGeneral - senas - otrosCobros;

    if (document.getElementById("totalPrendas")) document.getElementById("totalPrendas").value = cantidadTotalPrendas;
    if (document.getElementById("importeTotal")) document.getElementById("importeTotal").value = totalGeneral;
    if (document.getElementById("totalGeneral")) document.getElementById("totalGeneral").value = totalGeneral;
    if (document.getElementById("saldo")) document.getElementById("saldo").value = saldo;
}

// Cargar orden para editar de forma segura
async function cargarOrdenParaEditar(id) {
    cargandoEdicion = true; // Activamos el candado de carga
    try {
        const response = await fetch(`https://barsac-oms-api-production.up.railway.app/api/orden/${id}`);
        if (!response.ok) {
            const err = await response.text();
            alert("Error al obtener el pedido: " + err);
            return;
        }

        const orden = await response.json();

        if (orden.clienteId) {
            const clienteSelect = document.getElementById("clienteSelect");
            if (clienteSelect) {
                clienteSelect.value = orden.clienteId;
            }
            await cargarDatosCliente();
        }

        if (orden.formaPago && document.getElementById("formaPago")) {
            document.getElementById("formaPago").value = orden.formaPago;
        }

        if (orden.fechaPedido && document.getElementById("fechaPedido")) {
            document.getElementById("fechaPedido").value = orden.fechaPedido.split("T")[0];
        }
        if (orden.fechaEntrega && document.getElementById("fechaEntrega")) {
            document.getElementById("fechaEntrega").value = orden.fechaEntrega.split("T")[0];
        }

        if (orden.estado !== undefined && document.getElementById("estadoSelect")) {
            document.getElementById("estadoSelect").value = orden.estado;
        }

        if (document.getElementById("senas")) document.getElementById("senas").value = orden.senas || "";
        if (document.getElementById("otrosCobros")) document.getElementById("otrosCobros").value = orden.otrosCobros || "";

        const tbody = document.getElementById("detalleBody");
        tbody.innerHTML = "";

        if (orden.detalles && orden.detalles.length > 0) {
            let opciones = '<option value="">Seleccione Producto</option>';
            productosGlobal.forEach(p => {
                opciones += `<option value="${p.id}">${p.nombre}</option>`;
            });

            orden.detalles.forEach(d => {
                tbody.insertAdjacentHTML("beforeend", `
                    <tr>
                        <td>
                            <input type="number" class="form-control cantidad" value="${d.cantidad}" min="1" onchange="calcularTotales()">
                        </td>
                        <td>
                            <select class="form-control producto" onchange="actualizarPrecio(this)">
                                ${opciones}
                            </select>
                        </td>
                        <td>
                            <select class="form-control talle" onchange="actualizarPrecio(this)">
                                <option value="ADULTO">Adulto</option>
                                <option value="NIÑO">Niño</option>
                            </select>
                        </td>
                        <td>
                            <input type="number" class="form-control precio" value="${d.precioUnitario}" oninput="calcularTotales()">
                        </td>
                        <td>
                            <input type="number" class="form-control total" value="${d.cantidad * d.precioUnitario}" readonly>
                        </td>
                        <td class="text-center">
                            <button class="btn btn-danger btn-sm" onclick="eliminarFila(this)">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `);

                const filas = tbody.querySelectorAll("tr");
                const ultimaFila = filas[filas.length - 1];
                ultimaFila.querySelector(".producto").value = d.productoId;
                ultimaFila.querySelector(".talle").value = d.talle;
            });
        } else {
            agregarFila();
        }

        actualizarEstadoLecturaPrecios();
        calcularTotales();
    } catch (error) {
        console.error(error);
        alert("Error de conexión al cargar la orden");
    } finally {
        cargandoEdicion = false; // Desactivamos el candado una vez que finalizó la carga completa
    }
}

// Guardar Pedido (POST / PUT) de forma robusta
async function guardarPedido() {
    try {
        const detalles = [];

        document.querySelectorAll("#detalleBody tr").forEach(fila => {
            const prodId = Number(fila.querySelector(".producto").value);
            const cantidad = Number(fila.querySelector(".cantidad").value);
            const precioUnitario = Number(fila.querySelector(".precio").value);

            if (prodId) {
                detalles.push({
                    productoId: prodId,
                    talle: fila.querySelector(".talle").value,
                    cantidad: cantidad,
                    precioUnitario: precioUnitario
                });
            }
        });

        const clienteVal = document.getElementById("clienteSelect")?.value;
        if (!clienteVal) {
            alert("Por favor seleccione un cliente.");
            return;
        }

        const estadoVal = Number(document.getElementById("estadoSelect")?.value || 0);

        const senasInput = document.getElementById("senas")?.value;
        const senasVal = (senasInput && Number(senasInput) > 0) ? Number(senasInput) : null;

        const otrosCobrosInput = document.getElementById("otrosCobros")?.value;
        const otrosCobrosVal = (otrosCobrosInput && Number(otrosCobrosInput) > 0) ? Number(otrosCobrosInput) : null;

        const pedido = {
            clienteId: Number(clienteVal),
            formaPago: document.getElementById("formaPago")?.value || "efectivo",
            fechaPedido: document.getElementById("fechaPedido").value,
            fechaEntrega: document.getElementById("fechaEntrega").value,
            estado: estadoVal,
            senas: senasVal,
            otrosCobros: otrosCobrosVal,
            detalles: detalles
        };

        const url = idOrdenEdicion
            ? `https://barsac-oms-api-production.up.railway.app/api/orden/${idOrdenEdicion}`
            : "https://barsac-oms-api-production.up.railway.app/api/orden";

        const metodo = idOrdenEdicion ? "PUT" : "POST";

        const response = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pedido)
        });

        if (!response.ok) {
            const errorText = await response.text();
            alert("Error del servidor: " + errorText);
            return;
        }

        alert(idOrdenEdicion ? "Pedido actualizado correctamente" : "Pedido guardado correctamente");
        window.location.href = "pedidos.html";

    } catch (error) {
        console.error(error);
        alert("Error al guardar el pedido.");
    }
}