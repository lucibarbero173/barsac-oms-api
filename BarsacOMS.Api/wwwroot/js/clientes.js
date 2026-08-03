// @ts-nocheck
let clienteEditandoId = null;

$(document).ready(function () {
    cargarClientes();

    // Vinculación explícita por ID en jQuery por seguridad
    $("#btnNuevoCliente").on("click", function () {
        nuevoCliente();
    });

    $("#btnGuardarCliente").on("click", function () {
        guardarCliente();
    });
});

// =======================
// CARGAR TABLA
// =======================
function cargarClientes() {
    fetch("https://barsac-oms-api-production.up.railway.app/api/Cliente")
        .then(res => res.json())
        .then(clientes => {
            if ($.fn.dataTable.isDataTable('#dataTable')) {
                $('#dataTable').DataTable().destroy();
            }

            const tabla = $("#clientesBody");
            tabla.empty();

            clientes.forEach(c => {
                const id = c.id || c.idCliente;
                tabla.append(`
                    <tr>
                        <td>${id}</td>
                        <td>${c.nombre}</td>
                        <td>${c.disciplina}</td>
                        <td>${c.telefono}</td>
                        <td>${c.solicitante}</td>
                        <td>${c.listaPrecios}</td>
                        <td>${c.localidad}</td>
                        <td class="text-center">
                            <button class="btn btn-primary btn-sm mr-1" onclick="editarCliente(${id})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="eliminarCliente(${id})" title="Eliminar">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>
                    </tr>
                `);
            });

            $('#dataTable').DataTable();
        });
}

// =======================
// NUEVO
// =======================
function nuevoCliente() {
    clienteEditandoId = null;
    $("#nombre").val("");
    $("#disciplina").val("Futbol");
    $("#telefono").val("");
    $("#solicitante").val("");
    $("#listaPrecios").val("GENERAL");
    $("#localidad").val("");
    $("#modalCliente").modal("show");
}

// =======================
// EDITAR
// =======================
function editarCliente(id) {
    console.log("EDITANDO", id);
    clienteEditandoId = id;
    $("#modalCliente").modal("show");

    fetch(`https://barsac-oms-api-production.up.railway.app/api/Cliente/${id}`)
        .then(res => res.json())
        .then(c => {
            $("#nombre").val(c.nombre);
            $("#disciplina").val(c.disciplina);
            $("#telefono").val(c.telefono);
            $("#solicitante").val(c.solicitante);
            $("#listaPrecios").val(c.listaPrecios);
            $("#localidad").val(c.localidad);
        })
        .catch(err => {
            console.error("ERROR FETCH:", err);
        });
}

// =======================
// GUARDAR
// =======================
function guardarCliente() {
    // 1. Armamos el objeto base
    let clienteData = {
        nombre: $("#nombre").val(),
        disciplina: $("#disciplina").val(),
        telefono: $("#telefono").val(),
        solicitante: $("#solicitante").val(),
        listaPrecios: $("#listaPrecios").val(),
        localidad: $("#localidad").val()
    };

    let url = "https://barsac-oms-api-production.up.railway.app/api/Cliente";
    let method = "POST";

    // 2. Si estamos editando, agregamos el ID y cambiamos el método a PUT
    if (clienteEditandoId) {
        clienteData.id = clienteEditandoId;
        url = `https://barsac-oms-api-production.up.railway.app/api/Cliente/${clienteEditandoId}`;
        method = "PUT";
    }

    fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clienteData)
    })
        .then(res => {
            if (res.ok) {
                clienteEditandoId = null; // Reseteamos la variable para evitar solapamientos
                $("#modalCliente").modal("hide");
                cargarClientes();
            } else {
                res.text().then(t => alert("Error: " + t));
            }
        });
}

// =======================
// ELIMINAR
// =======================
function eliminarCliente(id) {
    if (!confirm("¿Eliminar cliente?")) return;

    fetch(`https://barsac-oms-api-production.up.railway.app/api/Cliente/${id}`, {
        method: "DELETE"
    })
        .then(res => {
            if (res.ok) {
                cargarClientes();
            } else {
                alert("Error al eliminar cliente");
            }
        });
}