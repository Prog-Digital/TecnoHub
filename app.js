// Configuración de Supabase para TecnoHub
const SUPABASE_URL = 'https://whxqmqawhatettkgqvjj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ASvOTj8NswAJpYyPkw9SNw_5zB4_pOS';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let solicitudesGlobal = [];
let miGraficoChart = null;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tablaSolicitudes')) {
    obtenerSolicitudes();

    const form = document.getElementById('solicitudForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const id = document.getElementById('solicitudId').value;
      const titulo = document.getElementById('titulo').value.trim();
      const categoria = document.getElementById('categoria').value;
      const prioridad = document.getElementById('prioridad').value;
      const descripcion = document.getElementById('descripcion').value.trim();

      if (!titulo || !categoria || !prioridad || !descripcion) {
        Swal.fire({
          icon: 'warning',
          title: 'Campos incompletos',
          text: 'Por favor complete todos los campos requeridos.',
          background: '#1e293b',
          color: '#f8fafc',
          confirmButtonColor: '#38bdf8'
        });
        return;
      }

      if (id) {
        // ACTUALIZAR
        const { error } = await supabaseClient
          .from('solicitudes')
          .update({ titulo, categoria, prioridad, descripcion })
          .eq('id_solicitud', id);

        if (error) {
          Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#1e293b', color: '#f8fafc' });
        } else {
          notificarExito('¡Solicitud actualizada con éxito!');
        }
      } else {
        // CREAR
        const { error } = await supabaseClient
          .from('solicitudes')
          .insert([{ titulo, categoria, prioridad, descripcion, estado: 'Pendiente' }]);

        if (error) {
          Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#1e293b', color: '#f8fafc' });
        } else {
          notificarExito('¡Solicitud registrada correctamente!');
        }
      }

      limpiarFormulario();
      obtenerSolicitudes();
    });

    document.getElementById('busquedaInput')?.addEventListener('input', aplicarFiltros);
    document.getElementById('filtroEstado')?.addEventListener('change', aplicarFiltros);
  }
});

// LISTAR Registros
async function obtenerSolicitudes() {
  const tbody = document.getElementById('tablaSolicitudes');
  if (!tbody) return;

  Swal.fire({
    title: 'Cargando datos...',
    text: 'Sincronizando con Supabase',
    allowOutsideClick: false,
    background: '#1e293b',
    color: '#f8fafc',
    didOpen: () => {
      Swal.showLoading();
    }
  });

  const { data, error } = await supabaseClient
    .from('solicitudes')
    .select('*')
    .order('id_solicitud', { ascending: false });

  Swal.close();

  if (error) {
    console.error('Error:', error.message);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #ef4444;">Error al cargar datos desde Supabase.</td></tr>`;
    return;
  }

  solicitudesGlobal = data || [];
  actualizarMetricasYGrafico(solicitudesGlobal);
  aplicarFiltros();
}

// Renderizar Tabla
function renderizarTabla(datos) {
  const tbody = document.getElementById('tablaSolicitudes');
  tbody.innerHTML = '';

  if (datos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #94a3b8; padding: 2rem;">No se encontraron solicitudes registradas.</td></tr>`;
    return;
  }

  datos.forEach((item) => {
    // Color según prioridad
    let badgeColor = '#3b82f6'; // Media
    if (item.prioridad === 'Alta') badgeColor = '#ef4444';
    if (item.prioridad === 'Baja') badgeColor = '#10b981';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${item.id_solicitud}</td>
      <td><strong>${item.titulo}</strong><br><small style="color:#94a3b8;">${item.descripcion}</small></td>
      <td>${item.categoria}<br><span style="font-size:0.75rem; background:${badgeColor}; color:#fff; padding:0.1rem 0.4rem; border-radius:0.25rem;">Prioridad: ${item.prioridad || 'Media'}</span></td>
      <td>
        <select onchange="cambiarEstado(${item.id_solicitud}, this.value)" style="padding: 0.3rem; font-size: 0.85rem; border-radius: 0.25rem; background: #0f172a; color: #f8fafc; border: 1px solid var(--border-color);">
          <option value="Pendiente" ${item.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
          <option value="En Proceso" ${item.estado === 'En Proceso' ? 'selected' : ''}>En Proceso</option>
          <option value="Completada" ${item.estado === 'Completada' ? 'selected' : ''}>Completada</option>
        </select>
      </td>
      <td>
        <button onclick="prepararEdicion(${item.id_solicitud}, '${item.titulo.replace(/'/g, "\\'")}', '${item.categoria}', '${item.prioridad || 'Media'}', '${item.descripcion.replace(/'/g, "\\'")}')" class="btn btn-warning" style="padding: 0.3rem 0.6rem; font-size: 0.85rem; background: #f59e0b; color: #0b1120; font-weight:600; border:none; border-radius:0.25rem; cursor:pointer;">Editar</button>
        <button onclick="eliminarSolicitud(${item.id_solicitud})" class="btn btn-danger" style="padding: 0.3rem 0.6rem; font-size: 0.85rem; background: #ef4444; color: #fff; font-weight:600; border:none; border-radius:0.25rem; cursor:pointer; margin-left: 0.25rem;">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Filtros combinados
function aplicarFiltros() {
  const termino = document.getElementById('busquedaInput')?.value.toLowerCase() || '';
  const estadoFiltro = document.getElementById('filtroEstado')?.value || 'TODOS';

  const filtrados = solicitudesGlobal.filter(item => {
    const coincideTexto = item.titulo.toLowerCase().includes(termino) || 
                          item.descripcion.toLowerCase().includes(termino) || 
                          item.categoria.toLowerCase().includes(termino);
    
    const coincideEstado = (estadoFiltro === 'TODOS') || (item.estado === estadoFiltro);

    return coincideTexto && coincideEstado;
  });

  renderizarTabla(filtrados);
}

// Métricas y Gráfica Chart.js en tamaño perfecto
function actualizarMetricasYGrafico(data) {
  const pendientes = data.filter(s => s.estado === 'Pendiente').length;
  const enProceso = data.filter(s => s.estado === 'En Proceso').length;
  const completadas = data.filter(s => s.estado === 'Completada').length;

  if (document.getElementById('statTotal')) {
    document.getElementById('statTotal').textContent = data.length;
    document.getElementById('statPendientes').textContent = pendientes;
    document.getElementById('statCompletadas').textContent = completadas;
  }

  const ctx = document.getElementById('estadoChart');
  if (!ctx) return;

  if (miGraficoChart) {
    miGraficoChart.destroy();
  }

  miGraficoChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pendientes', 'En Proceso', 'Completadas'],
      datasets: [{
        data: [pendientes, enProceso, completadas],
        backgroundColor: ['#f59e0b', '#3b82f6', '#10b981'],
        borderWidth: 2,
        borderColor: '#1e293b'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#f8fafc', font: { size: 11 } }
        }
      }
    }
  });
}

// Cambiar Estado
window.cambiarEstado = async function(id, nuevoEstado) {
  const { error } = await supabaseClient
    .from('solicitudes')
    .update({ estado: nuevoEstado })
    .eq('id_solicitud', id);

  if (error) {
    Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#1e293b', color: '#f8fafc' });
  } else {
    notificarToast('Estado actualizado');
    obtenerSolicitudes();
  }
};

// Preparar Edición
window.prepararEdicion = function (id, titulo, categoria, prioridad, descripcion) {
  document.getElementById('solicitudId').value = id;
  document.getElementById('titulo').value = titulo;
  document.getElementById('categoria').value = categoria;
  document.getElementById('prioridad').value = prioridad;
  document.getElementById('descripcion').value = descripcion;
  document.getElementById('formTitle').textContent = '✏️ Editar Requerimiento';
  document.getElementById('btnGuardar').textContent = 'Actualizar Solicitud';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Limpiar Formulario
window.limpiarFormulario = function() {
  document.getElementById('solicitudForm').reset();
  document.getElementById('solicitudId').value = '';
  document.getElementById('formTitle').textContent = '📝 Registrar Requerimiento';
  document.getElementById('btnGuardar').textContent = 'Guardar Solicitud';
};

// Eliminar
window.eliminarSolicitud = async function (id) {
  Swal.fire({
    title: '¿Estás seguro?',
    text: `¿Deseas eliminar la solicitud #${id}?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    background: '#1e293b',
    color: '#f8fafc'
  }).then(async (result) => {
    if (result.isConfirmed) {
      const { error } = await supabaseClient
        .from('solicitudes')
        .delete()
        .eq('id_solicitud', id);

      if (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#1e293b', color: '#f8fafc' });
      } else {
        notificarExito('Solicitud eliminada.');
        obtenerSolicitudes();
      }
    }
  });
};

// Exportar CSV
window.exportarCSV = function() {
  if (solicitudesGlobal.length === 0) {
    Swal.fire({ icon: 'info', title: 'Sin datos', text: 'No hay solicitudes para exportar.', background: '#1e293b', color: '#f8fafc' });
    return;
  }

  let csvContent = 'data:text/csv;charset=utf-8,ID,Titulo,Categoria,Prioridad,Descripcion,Estado\n';

  solicitudesGlobal.forEach(row => {
    const tituloLimpio = `"${row.titulo.replace(/"/g, '""')}"`;
    const descLimpia = `"${row.descripcion.replace(/"/g, '""')}"`;
    csvContent += `${row.id_solicitud},${tituloLimpio},"${row.categoria}","${row.prioridad || 'Media'}",${descLimpia},"${row.estado}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `TecnoHub_Reporte_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  notificarToast('Reporte CSV descargado');
};

function notificarExito(mensaje) {
  Swal.fire({
    icon: 'success',
    title: mensaje,
    timer: 2000,
    showConfirmButton: false,
    background: '#1e293b',
    color: '#f8fafc'
  });
}

function notificarToast(mensaje) {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: mensaje,
    showConfirmButton: false,
    timer: 2000,
    background: '#1e293b',
    color: '#f8fafc'
  });
}