// @ts-nocheck

let clienteEditandoId = null;

$(document).ready(function () {
    cargarClientes();
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
        })
        .catch(err => {
            console.error("ERROR FETCH:", err);
        });
}

// =======================
// GUARDAR
// =======================
function guardarCliente() {
    // 1. Asignamos 0 si es nuevo para que el int de .NET no falle
    let idCliente = clienteEditandoId ? clienteEditandoId : 0;

    // 2. Armamos el objeto plano, con camelCase (listaPrecios)
    let clienteData = {
        id: idCliente,
        nombre: $("#nombre").val(),
        disciplina: $("#disciplina").val(),
        telefono: $("#telefono").val(),
        solicitante: $("#solicitante").val(),
        listaPrecios: $("#listaPrecios").val()
    };

    let url = "https://barsac-oms-api-production.up.railway.app/api/Cliente";
    let method = "POST";

    if (clienteEditandoId) {
        url = `https://barsac-oms-api-production.up.railway.app/api/Cliente/${clienteEditandoId}`;
        method = "PUT";
    }

    fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        // 3. Enviamos el objeto directo, sin el wrapper
        body: JSON.stringify(clienteData)
    })
        .then(res => {
            if (res.ok) {
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
                alert("Error");
            }
        });
}