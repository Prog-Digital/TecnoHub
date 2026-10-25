// Configuración de Supabase para TecnoHub
const SUPABASE_URL = 'https://whxqmqawhatettkgqvjj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ASvOTj8NswAJpYyPkw9SNw_5zB4_pOS';

// Inicialización del Cliente Oficial de Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tablaSolicitudes')) {
    obtenerSolicitudes();

    // Guardar (Crear o Editar)
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
          text: 'Por favor complete todos los campos del formulario.',
          confirmButtonColor: '#38bdf8'
        });
        return;
      }

      if (id) {
        // ACTUALIZAR (Edit)
        const { error } = await supabaseClient
          .from('solicitudes')
          .update({ titulo, categoria, descripcion })
          .eq('id_solicitud', id);

        if (error) {
          Swal.fire({ icon: 'error', title: 'Error', text: error.message, confirmButtonColor: '#38bdf8' });
        } else {
          Swal.fire({
            icon: 'success',
            title: '¡Actualizado!',
            text: 'La solicitud se actualizó exitosamente.',
            timer: 2000,
            showConfirmButton: false
          });
        }
      } else {
        // CREAR (Insert)
        const { error } = await supabaseClient
          .from('solicitudes')
          .insert([{ titulo, categoria, descripcion, estado: 'Pendiente' }]);

        if (error) {
          Swal.fire({ icon: 'error', title: 'Error', text: error.message, confirmButtonColor: '#38bdf8' });
        } else {
          Swal.fire({
            icon: 'success',
            title: '¡Registrado!',
            text: 'La solicitud se registró exitosamente.',
            timer: 2000,
            showConfirmButton: false
          });
        }
      }

      form.reset();
      document.getElementById('solicitudId').value = '';
      document.getElementById('btnGuardar').textContent = 'Guardar Solicitud';
      obtenerSolicitudes();
    });

    // Búsqueda en tiempo real
    const busquedaInput = document.getElementById('busquedaInput');
    if (busquedaInput) {
      busquedaInput.addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase();
        const filas = document.querySelectorAll('#tablaSolicitudes tr');
        
        filas.forEach((fila) => {
          const textoFila = fila.textContent.toLowerCase();
          fila.style.display = textoFila.includes(termino) ? '' : 'none';
        });
      });
    }
  }
});

// LISTAR Registros (Select con Spinner de Carga)
async function obtenerSolicitudes() {
  const tbody = document.getElementById('tablaSolicitudes');
  if (!tbody) return;

  // Mostrar alerta de carga estética con SweetAlert2
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

  // Cerrar el spinner de carga automáticamente al recibir respuesta
  Swal.close();

  tbody.innerHTML = '';

  if (error) {
    console.error('Error:', error.message);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--danger);">Error al cargar datos desde Supabase.</td></tr>`;
    return;
  }

  // Actualizar indicadores numéricos en las tarjetas superiores
  if (document.getElementById('statTotal')) {
    document.getElementById('statTotal').textContent = data.length;
    document.getElementById('statPendientes').textContent = data.filter(s => s.estado === 'Pendiente').length;
    document.getElementById('statCompletadas').textContent = data.filter(s => s.estado === 'Completada').length;
  }

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No hay solicitudes registradas. ¡Crea la primera!</td></tr>`;
    return;
  }

  data.forEach((item) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${item.id_solicitud}</td>
      <td><strong>${item.titulo}</strong><br><small style="color:var(--text-muted);">${item.descripcion}</small></td>
      <td>${item.categoria}</td>
      <td>
        <select onchange="cambiarEstado(${item.id_solicitud}, this.value)" style="padding: 0.2rem 0.4rem; font-size: 0.85rem; border-radius: 0.25rem; background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.1);">
          <option value="Pendiente" ${item.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
          <option value="En Proceso" ${item.estado === 'En Proceso' ? 'selected' : ''}>En Proceso</option>
          <option value="Completada" ${item.estado === 'Completada' ? 'selected' : ''}>Completada</option>
        </select>
      </td>
      <td>
        <button onclick="prepararEdicion(${item.id_solicitud}, '${item.titulo.replace(/'/g, "\\'")}', '${item.categoria}', '${item.descripcion.replace(/'/g, "\\'")}')" class="btn btn-warning" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;">Editar</button>
        <button onclick="eliminarSolicitud(${item.id_solicitud})" class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.85rem; margin-left: 0.25rem;">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Cambiar estado desde el selector de la tabla
window.cambiarEstado = async function(id, nuevoEstado) {
  const { error } = await supabaseClient
    .from('solicitudes')
    .update({ estado: nuevoEstado })
    .eq('id_solicitud', id);

  if (error) {
    Swal.fire({ icon: 'error', title: 'Error', text: error.message, confirmButtonColor: '#38bdf8' });
  } else {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Estado actualizado',
      showConfirmButton: false,
      timer: 1500,
      background: '#1e293b',
      color: '#f8fafc'
    });
    obtenerSolicitudes();
  }
};

// Cargar datos al formulario para editar
window.prepararEdicion = function (id, titulo, categoria, descripcion) {
  document.getElementById('solicitudId').value = id;
  document.getElementById('titulo').value = titulo;
  document.getElementById('categoria').value = categoria;
  document.getElementById('descripcion').value = descripcion;
  document.getElementById('btnGuardar').textContent = 'Actualizar Solicitud';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ELIMINAR Registro (Delete con SweetAlert2 Confirm)
window.eliminarSolicitud = async function (id) {
  Swal.fire({
    title: '¿Estás seguro?',
    text: `¿Deseas eliminar la solicitud #${id}? Esta acción no se puede deshacer.`,
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
        Swal.fire({ icon: 'error', title: 'Error', text: error.message, confirmButtonColor: '#38bdf8' });
      } else {
        Swal.fire({
          icon: 'success',
          title: '¡Eliminado!',
          text: 'La solicitud ha sido borrada correctamente.',
          timer: 2000,
          showConfirmButton: false,
          background: '#1e293b',
          color: '#f8fafc'
        });
        obtenerSolicitudes();
      }
    }
  });
};