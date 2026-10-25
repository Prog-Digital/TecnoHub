// Configuración de Supabase para TecnoHub
const SUPABASE_URL = 'https://whxqmqawhatettkgqvjj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ASvOTj8NswAJpYyPkw9SNw_5zB4_pOS';

// Inicialización del Cliente Oficial de Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globales para datos y gráficos
let solicitudesGlobal = [];
let miGraficoChart = null;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tablaSolicitudes')) {
    obtenerSolicitudes();

    // Evento Submit: Guardar (Crear o Editar)
    const form = document.getElementById('solicitudForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const id = document.getElementById('solicitudId').value;
      const titulo = document.getElementById('titulo').value.trim();
      const categoria = document.getElementById('categoria').value;
      const descripcion = document.getElementById('descripcion').value.trim();

      if (!titulo || !categoria || !descripcion) {
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
        // ACTUALIZAR (Update)
        const { error } = await supabaseClient
          .from('solicitudes')
          .update({ titulo, categoria, descripcion })
          .eq('id_solicitud', id);

        if (error) {
          Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#1e293b', color: '#f8fafc' });
        } else {
          notificarExito('¡Solicitud actualizada con éxito!');
        }
      } else {
        // CREAR (Insert)
        const { error } = await supabaseClient
          .from('solicitudes')
          .insert([{ titulo, categoria, descripcion, estado: 'Pendiente' }]);

        if (error) {
          Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#1e293b', color: '#f8fafc' });
        } else {
          notificarExito('¡Solicitud registrada correctamente!');
        }
      }

      form.reset();
      document.getElementById('solicitudId').value = '';
      document.getElementById('btnGuardar').textContent = 'Guardar Solicitud';
      obtenerSolicitudes();
    });

    // Listeners de Filtros y Búsqueda en Tiempo Real
    document.getElementById('busquedaInput')?.addEventListener('input', aplicarFiltros);
    document.getElementById('filtroEstado')?.addEventListener('change', aplicarFiltros);
  }
});

// LISTAR Registros desde Supabase
async function obtenerSolicitudes() {
  const tbody = document.getElementById('tablaSolicitudes');
  if (!tbody) return;

  Swal.fire({
    title: 'Cargando datos...',
    text: 'Conectando con Supabase',
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
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--danger);">Error al cargar datos desde Supabase.</td></tr>`;
    return;
  }

  solicitudesGlobal = data || [];
  actualizarMetricasYGrafico(solicitudesGlobal);
  aplicarFiltros();
}

// Renderizar la tabla basada en filtros
function renderizarTabla(datos) {
  const tbody = document.getElementById('tablaSolicitudes');
  tbody.innerHTML = '';

  if (datos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 2rem;">No se encontraron solicitudes registradas.</td></tr>`;
    return;
  }

  datos.forEach((item) => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border-color)';
    tr.innerHTML = `
      <td style="padding: 0.75rem;">#${item.id_solicitud}</td>
      <td style="padding: 0.75rem;"><strong>${item.titulo}</strong><br><small style="color:var(--text-muted);">${item.descripcion}</small></td>
      <td style="padding: 0.75rem;">${item.categoria}</td>
      <td style="padding: 0.75rem;">
        <select onchange="cambiarEstado(${item.id_solicitud}, this.value)" style="padding: 0.25rem 0.5rem; font-size: 0.85rem; border-radius: 0.25rem; background: #0f172a; color: #f8fafc; border: 1px solid var(--border-color);">
          <option value="Pendiente" ${item.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
          <option value="En Proceso" ${item.estado === 'En Proceso' ? 'selected' : ''}>En Proceso</option>
          <option value="Completada" ${item.estado === 'Completada' ? 'selected' : ''}>Completada</option>
        </select>
      </td>
      <td style="padding: 0.75rem;">
        <button onclick="prepararEdicion(${item.id_solicitud}, '${item.titulo.replace(/'/g, "\\'")}', '${item.categoria}', '${item.descripcion.replace(/'/g, "\\'")}')" class="btn btn-warning" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;">Editar</button>
        <button onclick="eliminarSolicitud(${item.id_solicitud})" class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.85rem; margin-left: 0.25rem;">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Aplicar filtros combinados (Texto + Estado)
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

// Actualizar Tarjetas Numericas y Gráfico de Torta (Chart.js)
function actualizarMetricasYGrafico(data) {
  const pendientes = data.filter(s => s.estado === 'Pendiente').length;
  const enProceso = data.filter(s => s.estado === 'En Proceso').length;
  const completadas = data.filter(s => s.estado === 'Completada').length;

  if (document.getElementById('statTotal')) {
    document.getElementById('statTotal').textContent = data.length;
    document.getElementById('statPendientes').textContent = pendientes;
    document.getElementById('statCompletadas').textContent = completadas;
  }

  // Renderizar o actualizar Chart.js
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
      plugins: {
        legend: {
          labels: { color: '#f8fafc' }
        }
      }
    }
  });
}

// Cambiar Estado desde la Tabla
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

// Cargar Datos al Formulario para Editar
window.prepararEdicion = function (id, titulo, categoria, descripcion) {
  document.getElementById('solicitudId').value = id;
  document.getElementById('titulo').value = titulo;
  document.getElementById('categoria').value = categoria;
  document.getElementById('descripcion').value = descripcion;
  document.getElementById('btnGuardar').textContent = 'Actualizar Solicitud';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Eliminar Solicitud con Confirmación
window.eliminarSolicitud = async function (id) {
  Swal.fire({
    title: '¿Estás seguro?',
    text: `¿Deseas eliminar la solicitud #${id}? Esta acción es irreversible.`,
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

// Exportar Datos de la Tabla a Archivo CSV (Excel)
window.exportarCSV = function() {
  if (solicitudesGlobal.length === 0) {
    Swal.fire({ icon: 'info', title: 'Sin datos', text: 'No hay solicitudes para exportar.', background: '#1e293b', color: '#f8fafc' });
    return;
  }

  let csvContent = 'data:text/csv;charset=utf-8,ID,Titulo,Categoria,Descripcion,Estado\n';

  solicitudesGlobal.forEach(row => {
    const tituloLimpio = `"${row.titulo.replace(/"/g, '""')}"`;
    const descLimpia = `"${row.descripcion.replace(/"/g, '""')}"`;
    csvContent += `${row.id_solicitud},${tituloLimpio},"${row.categoria}",${descLimpia},"${row.estado}"\n`;
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

// Funciones Auxiliares de Notificaciones
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