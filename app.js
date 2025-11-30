// ===============================
//  Cuaderno de Mantenimiento
//  Lógica principal
// ===============================

(function () {
  const STORAGE_KEY = 'cuaderno_mantenimiento_trabajos_v1';

  /** @type {Array} */
  let registros = [];
  let idEditando = null; // id del registro en edición (null = modo alta)

  // ---- Referencias DOM ----
  const form = document.getElementById('form-registro');

  const campoFecha = document.getElementById('fecha');
  const campoEmpresa = document.getElementById('empresa');
  const campoLocalidad = document.getElementById('localidad');
  const campoUbicacion = document.getElementById('ubicacion');
  const campoHoraInicio = document.getElementById('horaInicio');
  const campoHoraFin = document.getElementById('horaFin');
  const campoDescanso = document.getElementById('descanso');
  const campoTotalHoras = document.getElementById('totalHoras');
  const campoObservaciones = document.getElementById('observaciones');

  const materialesContainer = document.getElementById('materiales-container');
  const trabajosCompletadosContainer = document.getElementById('trabajos-completados-container');
  const trabajosPendientesContainer = document.getElementById('trabajos-pendientes-container');

  const btnGuardar = document.getElementById('btn-guardar');
  const btnCancelar = document.getElementById('btn-cancelar');

  const modoEdicionInfo = document.getElementById('modo-edicion');
  const editIdSpan = document.getElementById('edit-id');

  const tbody = document.getElementById('tbody-registros');
  const contadorRegistros = document.getElementById('contador-registros');

  const inputBusqueda = document.getElementById('busqueda');
  const selectFiltroPendientes = document.getElementById('filtroPendientes');
  const btnExportar = document.getElementById('btn-exportar');
  const inputImport = document.getElementById('archivoImport');
  const btnBorrarTodo = document.getElementById('btn-borrar-todo');

  // ===============================
  // Inicialización
  // ===============================

  function init() {
    cargarDesdeStorage();
    inicializarContenedores();
    renderTabla();

    // Eventos
    form.addEventListener('submit', manejarSubmit);
    btnCancelar.addEventListener('click', limpiarFormulario);

    campoHoraInicio.addEventListener('change', actualizarTotalHoras);
    campoHoraFin.addEventListener('change', actualizarTotalHoras);
    if (campoDescanso) {
      campoDescanso.addEventListener('change', actualizarTotalHoras);
    }

    inputBusqueda.addEventListener('input', renderTabla);
    if (selectFiltroPendientes) {
      selectFiltroPendientes.addEventListener('change', renderTabla);
    }

    btnExportar.addEventListener('click', exportarJSON);
    inputImport.addEventListener('change', importarJSON);
    btnBorrarTodo.addEventListener('click', borrarTodosRegistros);

    // Delegación de eventos para los botones "+"
    materialesContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-add-material')) {
        agregarFilaMaterial();
      }
    });

    trabajosCompletadosContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-add-trabajo-completado')) {
        agregarTrabajoCompletado();
      }
    });

    trabajosPendientesContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-add-trabajo-pendiente')) {
        agregarTrabajoPendiente();
      }
    });

    // Dejar formulario limpio para nuevo alta
    limpiarFormulario();
  }

  // ===============================
  // Storage
  // ===============================

  function cargarDesdeStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        registros = [];
        return;
      }
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        registros = data;
      } else {
        registros = [];
      }
    } catch (err) {
      console.error('Error leyendo localStorage:', err);
      registros = [];
    }
  }

  function guardarEnStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
    } catch (err) {
      console.error('Error guardando en localStorage:', err);
      alert('No se han podido guardar los datos en el dispositivo.');
    }
  }

  // ===============================
  // Utilidades de contenedores múltiples
  // ===============================

  function inicializarContenedores() {
    if (!materialesContainer.querySelector('.material-item')) {
      agregarFilaMaterial();
    }
    if (!trabajosCompletadosContainer.querySelector('.trabajo-completado')) {
      agregarTrabajoCompletado();
    }
    if (!trabajosPendientesContainer.querySelector('.trabajo-pendiente')) {
      agregarTrabajoPendiente();
    }
  }

  function agregarFilaMaterial(nombre = '', cantidad = '') {
    const fila = document.createElement('div');
    fila.className = 'form-row-inline material-item';

    const divNombre = document.createElement('div');
    divNombre.className = 'flex-grow';
    const inputNombre = document.createElement('input');
    inputNombre.type = 'text';
    inputNombre.className = 'material-nombre';
    inputNombre.placeholder = 'Rodamientos...';
    inputNombre.value = nombre || '';
    divNombre.appendChild(inputNombre);

    const divCantidad = document.createElement('div');
    divCantidad.className = 'cantidad-box';
    const inputCantidad = document.createElement('input');
    inputCantidad.type = 'number';
    inputCantidad.className = 'material-cantidad';
    inputCantidad.min = '0';
    inputCantidad.step = '1';
    inputCantidad.placeholder = 'Cant.';
    if (cantidad !== '' && cantidad !== null && cantidad !== undefined) {
      inputCantidad.value = cantidad;
    }
    divCantidad.appendChild(inputCantidad);

    const btnAdd = document.createElement('button');
    btnAdd.type = 'button';
    btnAdd.className = 'btn-secondary btn-small btn-add-material';
    btnAdd.textContent = '+';

    fila.appendChild(divNombre);
    fila.appendChild(divCantidad);
    fila.appendChild(btnAdd);

    materialesContainer.appendChild(fila);
  }

  function limpiarMateriales() {
    materialesContainer.innerHTML = '';
    agregarFilaMaterial();
  }

  function obtenerMaterialesDesdeFormulario() {
    const items = materialesContainer.querySelectorAll('.material-item');
    const nombres = [];
    const cantidades = [];

    items.forEach(item => {
      const nombreInput = item.querySelector('.material-nombre');
      const cantidadInput = item.querySelector('.material-cantidad');
      const nombre = (nombreInput.value || '').trim();
      const cantidadVal = cantidadInput.value;

      if (nombre || cantidadVal) {
        nombres.push(nombre);
        cantidades.push(cantidadVal ? Number(cantidadVal) : null);
      }
    });

    return { nombres, cantidades };
  }

  function agregarTrabajoCompletado(texto = '') {
    const fila = document.createElement('div');
    fila.className = 'form-row-inline trabajo-item';

    const textarea = document.createElement('textarea');
    textarea.className = 'trabajo-completado';
    textarea.rows = 2;
    textarea.placeholder = 'Ej: Cambio de correa, engrase...';
    textarea.value = texto || '';

    const btnAdd = document.createElement('button');
    btnAdd.type = 'button';
    btnAdd.className = 'btn-secondary btn-small btn-add-trabajo-completado';
    btnAdd.textContent = '+';

    fila.appendChild(textarea);
    fila.appendChild(btnAdd);

    trabajosCompletadosContainer.appendChild(fila);
  }

  function limpiarTrabajosCompletados() {
    trabajosCompletadosContainer.innerHTML = '';
    agregarTrabajoCompletado();
  }

  function obtenerTrabajosCompletadosDesdeFormulario() {
    const areas = trabajosCompletadosContainer.querySelectorAll('.trabajo-completado');
    const arr = [];
    areas.forEach(t => {
      const v = (t.value || '').trim();
      if (v) arr.push(v);
    });
    return arr;
  }

  function agregarTrabajoPendiente(texto = '') {
    const fila = document.createElement('div');
    fila.className = 'form-row-inline trabajo-item';

    const textarea = document.createElement('textarea');
    textarea.className = 'trabajo-pendiente';
    textarea.rows = 2;
    textarea.placeholder = 'Ej: Revisar poleas, revisar motor...';
    textarea.value = texto || '';

    const btnAdd = document.createElement('button');
    btnAdd.type = 'button';
    btnAdd.className = 'btn-secondary btn-small btn-add-trabajo-pendiente';
    btnAdd.textContent = '+';

    fila.appendChild(textarea);
    fila.appendChild(btnAdd);

    trabajosPendientesContainer.appendChild(fila);
  }

  function limpiarTrabajosPendientes() {
    trabajosPendientesContainer.innerHTML = '';
    agregarTrabajoPendiente();
  }

  function obtenerTrabajosPendientesDesdeFormulario() {
    const areas = trabajosPendientesContainer.querySelectorAll('.trabajo-pendiente');
    const arr = [];
    areas.forEach(t => {
      const v = (t.value || '').trim();
      if (v) arr.push(v);
    });
    return arr;
  }

  // ===============================
  // Utilidades generales
  // ===============================

  function generarId() {
    return Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
  }

  function parseHoraToMinutos(horaStr) {
    if (!horaStr) return null;
    const partes = horaStr.split(':');
    if (partes.length !== 2) return null;
    const h = Number(partes[0]);
    const m = Number(partes[1]);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  // 👉 NUEVO: formatear decimal de horas a "HH:MM = x,xx h"
  function formatearHorasTotal(horasDec) {
    if (horasDec == null || isNaN(horasDec)) return '';
    const totalMin = Math.round(horasDec * 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const horasStr = horasDec.toFixed(2).replace('.', ',');
    return `${hh}:${mm} = ${horasStr} h`;
  }

  function actualizarTotalHoras() {
    const hi = campoHoraInicio.value;
    const hf = campoHoraFin.value;
    const descansoStr = campoDescanso ? campoDescanso.value : '00:00';

    if (!hi || !hf) {
      campoTotalHoras.value = '';
      return;
    }

    let inicioMin = parseHoraToMinutos(hi);
    let finMin = parseHoraToMinutos(hf);

    if (inicioMin === null || finMin === null) {
      campoTotalHoras.value = '';
      return;
    }

    // Paso por medianoche
    if (finMin < inicioMin) {
      finMin += 24 * 60;
    }

    let difMin = finMin - inicioMin;
    let descansoMin = parseHoraToMinutos(descansoStr);
    if (descansoMin === null) descansoMin = 0;

    let trabajoMin = difMin - descansoMin;
    if (trabajoMin < 0) trabajoMin = 0;

    const horas = trabajoMin / 60;
    // En el formulario dejamos solo el decimal (como antes)
    campoTotalHoras.value = horas.toFixed(2).replace('.', ',');
  }

  function limpiarFormulario() {
    form.reset();
    campoTotalHoras.value = '';
    if (campoDescanso) campoDescanso.value = '00:00';
    idEditando = null;
    btnGuardar.textContent = 'Guardar registro';
    modoEdicionInfo.classList.add('oculto');
    editIdSpan.textContent = '';

    limpiarMateriales();
    limpiarTrabajosCompletados();
    limpiarTrabajosPendientes();
  }

  // ===============================
  // Gestión de registros
  // ===============================

  function manejarSubmit(e) {
    e.preventDefault();

    const fecha = campoFecha.value;
    const empresa = (campoEmpresa.value || '').trim();
    const localidad = (campoLocalidad.value || '').trim();
    const ubicacion = (campoUbicacion.value || '').trim();
    const horaInicio = campoHoraInicio.value;
    const horaFin = campoHoraFin.value;
    const descanso = (campoDescanso && campoDescanso.value) ? campoDescanso.value : '00:00';
    const totalHorasStr = campoTotalHoras.value.replace(',', '.');
    const totalHoras = totalHorasStr ? parseFloat(totalHorasStr) : null;

    const { nombres: materialesArr, cantidades: cantidadesArr } = obtenerMaterialesDesdeFormulario();
    const trabajosCompletadosArr = obtenerTrabajosCompletadosDesdeFormulario();
    const trabajosPendientesArr = obtenerTrabajosPendientesDesdeFormulario();

    const observaciones = (campoObservaciones.value || '').trim();

    if (!fecha || !localidad || !ubicacion || !horaInicio || !horaFin) {
      alert('Por favor, rellena al menos: Fecha, Localidad, Ubicación, Hora inicio y Hora fin.');
      return;
    }

    if (totalHoras === null || isNaN(totalHoras)) {
      alert('Revisa las horas y el descanso. No se ha podido calcular el total de horas.');
      return;
    }

    const registro = {
      id: idEditando || generarId(),
      fecha,
      empresa,
      localidad,
      ubicacion,
      horaInicio,
      horaFin,
      descanso,
      totalHoras,
      materiales: materialesArr,
      cantidades: cantidadesArr,
      trabajosCompletados: trabajosCompletadosArr,
      trabajosPendientes: trabajosPendientesArr,
      observaciones
    };

    if (idEditando) {
      const idx = registros.findIndex(r => r.id === idEditando);
      if (idx !== -1) {
        registros[idx] = registro;
      }
    } else {
      registros.push(registro);
    }

    guardarEnStorage();
    renderTabla();
    limpiarFormulario();
  }

  function cargarEnFormulario(id) {
    const reg = registros.find(r => r.id === id);
    if (!reg) return;

    campoFecha.value = reg.fecha || '';
    campoEmpresa.value = reg.empresa || '';
    campoLocalidad.value = reg.localidad || '';
    campoUbicacion.value = reg.ubicacion || '';
    campoHoraInicio.value = reg.horaInicio || '';
    campoHoraFin.value = reg.horaFin || '';
    if (campoDescanso) campoDescanso.value = reg.descanso || '00:00';
    campoObservaciones.value = reg.observaciones || '';

    // Total horas al formulario (solo decimal, como se guarda)
    if (reg.totalHoras != null && !isNaN(reg.totalHoras)) {
      campoTotalHoras.value = reg.totalHoras.toFixed(2).replace('.', ',');
    } else {
      campoTotalHoras.value = '';
    }

    // Materiales
    limpiarMateriales();
    if (Array.isArray(reg.materiales)) {
      materialesContainer.innerHTML = '';
      const nombres = reg.materiales || [];
      const cantidades = Array.isArray(reg.cantidades) ? reg.cantidades : [];
      const len = Math.max(nombres.length, cantidades.length);
      if (len === 0) {
        agregarFilaMaterial();
      } else {
        for (let i = 0; i < len; i++) {
          const nom = nombres[i] || '';
          const cant = (cantidades[i] !== undefined && cantidades[i] !== null) ? cantidades[i] : '';
          agregarFilaMaterial(nom, cant);
        }
      }
    } else {
      const nombre = reg.materiales || '';
      const cant = reg.cantidad != null ? reg.cantidad : '';
      materialesContainer.innerHTML = '';
      agregarFilaMaterial(nombre, cant);
    }

    // Trabajos completados
    limpiarTrabajosCompletados();
    if (Array.isArray(reg.trabajosCompletados)) {
      trabajosCompletadosContainer.innerHTML = '';
      if (reg.trabajosCompletados.length === 0) {
        agregarTrabajoCompletado();
      } else {
        reg.trabajosCompletados.forEach(txt => agregarTrabajoCompletado(txt));
      }
    } else {
      trabajosCompletadosContainer.innerHTML = '';
      agregarTrabajoCompletado(reg.trabajosCompletados || '');
    }

    // Trabajos pendientes
    limpiarTrabajosPendientes();
    if (Array.isArray(reg.trabajosPendientes)) {
      trabajosPendientesContainer.innerHTML = '';
      if (reg.trabajosPendientes.length === 0) {
        agregarTrabajoPendiente();
      } else {
        reg.trabajosPendientes.forEach(txt => agregarTrabajoPendiente(txt));
      }
    } else {
      trabajosPendientesContainer.innerHTML = '';
      agregarTrabajoPendiente(reg.trabajosPendientes || '');
    }

    actualizarTotalHoras();

    idEditando = reg.id;
    btnGuardar.textContent = 'Guardar cambios';
    modoEdicionInfo.classList.remove('oculto');
    editIdSpan.textContent = reg.id;
  }

  function eliminarRegistro(id) {
    if (!confirm('¿Seguro que quieres eliminar este registro?')) return;

    registros = registros.filter(r => r.id !== id);
    guardarEnStorage();
    renderTabla();

    if (idEditando === id) {
      limpiarFormulario();
    }
  }

  // ===============================
  // Renderizado
  // ===============================

  function tienePendientes(reg) {
    if (Array.isArray(reg.trabajosPendientes)) {
      return reg.trabajosPendientes.some(t => t && t.toString().trim() !== '');
    }
    if (reg.trabajosPendientes) {
      return reg.trabajosPendientes.toString().trim() !== '';
    }
    return false;
  }

  function renderTabla() {
    const filtroTexto = (inputBusqueda.value || '').toLowerCase().trim();
    const filtroPend = selectFiltroPendientes ? selectFiltroPendientes.value : 'todos';

    const listaFiltrada = registros.filter(reg => {
      if (filtroTexto) {
        const texto = [
          reg.fecha,
          reg.empresa,
          reg.localidad,
          reg.ubicacion,
          reg.horaInicio,
          reg.horaFin,
          reg.descanso,
          Array.isArray(reg.materiales) ? reg.materiales.join(' ') : reg.materiales,
          Array.isArray(reg.trabajosCompletados) ? reg.trabajosCompletados.join(' ') : reg.trabajosCompletados,
          Array.isArray(reg.trabajosPendientes) ? reg.trabajosPendientes.join(' ') : reg.trabajosPendientes,
          reg.observaciones
        ]
          .join(' ')
          .toLowerCase();
        if (!texto.includes(filtroTexto)) {
          return false;
        }
      }

      const hayPendientes = tienePendientes(reg);
      if (filtroPend === 'conPendientes' && !hayPendientes) return false;
      if (filtroPend === 'sinPendientes' && hayPendientes) return false;

      return true;
    });

    listaFiltrada.sort((a, b) => {
      const claveA = (a.fecha || '') + ' ' + (a.horaInicio || '');
      const claveB = (b.fecha || '') + ' ' + (b.horaInicio || '');
      if (claveA < claveB) return -1;
      if (claveA > claveB) return 1;
      return 0;
    });

    tbody.innerHTML = '';

    listaFiltrada.forEach(reg => {
      const tr = document.createElement('tr');

      const tdFecha = document.createElement('td');
      tdFecha.textContent = reg.fecha || '';

      const tdEmpresa = document.createElement('td');
      tdEmpresa.textContent = reg.empresa || '';

      const tdLocalidad = document.createElement('td');
      tdLocalidad.textContent = reg.localidad || '';

      const tdUbicacion = document.createElement('td');
      tdUbicacion.textContent = reg.ubicacion || '';

      const tdInicio = document.createElement('td');
      tdInicio.textContent = reg.horaInicio || '';

      const tdFin = document.createElement('td');
      tdFin.textContent = reg.horaFin || '';

      const tdDescanso = document.createElement('td');
      tdDescanso.textContent = reg.descanso || '00:00';

      const tdHoras = document.createElement('td');
      // 👉 AQUÍ USAMOS EL NUEVO FORMATO "HH:MM = x,xx h"
      tdHoras.textContent =
        reg.totalHoras != null && !isNaN(reg.totalHoras)
          ? formatearHorasTotal(reg.totalHoras)
          : '';

      const tdMateriales = document.createElement('td');
      const tdCantidad = document.createElement('td');

      if (Array.isArray(reg.materiales)) {
        tdMateriales.textContent = reg.materiales.join(' ');
        if (Array.isArray(reg.cantidades)) {
          tdCantidad.textContent = reg.cantidades
            .map(c => (c !== null && c !== undefined ? c : ''))
            .join(' ');
        } else {
          tdCantidad.textContent = '';
        }
      } else {
        tdMateriales.textContent = reg.materiales || '';
        tdCantidad.textContent = reg.cantidad != null ? reg.cantidad : '';
      }

      const tdCompletado = document.createElement('td');
      if (Array.isArray(reg.trabajosCompletados)) {
        tdCompletado.textContent = reg.trabajosCompletados.join(' | ');
      } else {
        tdCompletado.textContent = reg.trabajosCompletados || '';
      }

      const tdPendiente = document.createElement('td');
      if (Array.isArray(reg.trabajosPendientes)) {
        tdPendiente.textContent = reg.trabajosPendientes.join(' | ');
      } else {
        tdPendiente.textContent = reg.trabajosPendientes || '';
      }

      const tdObs = document.createElement('td');
      tdObs.textContent = reg.observaciones || '';

      const tdAcciones = document.createElement('td');
      tdAcciones.classList.add('acciones');

      const btnEdit = document.createElement('button');
      btnEdit.textContent = 'Editar';
      btnEdit.className = 'btn-secondary btn-small';
      btnEdit.addEventListener('click', () => cargarEnFormulario(reg.id));

      const btnDel = document.createElement('button');
      btnDel.textContent = 'Borrar';
      btnDel.className = 'btn-danger btn-small';
      btnDel.addEventListener('click', () => eliminarRegistro(reg.id));

      tdAcciones.appendChild(btnEdit);
      tdAcciones.appendChild(btnDel);

      tr.appendChild(tdFecha);
      tr.appendChild(tdEmpresa);
      tr.appendChild(tdLocalidad);
      tr.appendChild(tdUbicacion);
      tr.appendChild(tdInicio);
      tr.appendChild(tdFin);
      tr.appendChild(tdDescanso);
      tr.appendChild(tdHoras);
      tr.appendChild(tdMateriales);
      tr.appendChild(tdCantidad);
      tr.appendChild(tdCompletado);
      tr.appendChild(tdPendiente);
      tr.appendChild(tdObs);
      tr.appendChild(tdAcciones);

      tbody.appendChild(tr);
    });

    contadorRegistros.textContent =
      listaFiltrada.length === 1 ? '1 registro' : `${listaFiltrada.length} registros`;
  }

  // ===============================
  // Exportar / Importar
  // ===============================

  function exportarJSON() {
    if (!registros.length) {
      alert('No hay registros para exportar.');
      return;
    }

    const blob = new Blob([JSON.stringify(registros, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fecha = new Date().toISOString().slice(0, 10);

    a.href = url;
    a.download = `cuaderno_mantenimiento_${fecha}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importarJSON(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (ev) {
      try {
        const texto = ev.target.result;
        const data = JSON.parse(texto);

        if (!Array.isArray(data)) {
          alert('El archivo JSON no tiene el formato esperado (debe ser un array).');
          return;
        }

        if (!confirm('Esto sustituirá los registros actuales por los del archivo. ¿Continuar?')) {
          return;
        }

        registros = data;
        guardarEnStorage();
        renderTabla();
        limpiarFormulario();
        alert('Datos importados correctamente.');
      } catch (err) {
        console.error('Error importando JSON:', err);
        alert('Error al leer el archivo JSON. Revisa que sea correcto.');
      } finally {
        inputImport.value = '';
      }
    };

    reader.readAsText(file, 'utf-8');
  }

  function borrarTodosRegistros() {
    if (!registros.length) {
      alert('No hay registros que borrar.');
      return;
    }

    if (!confirm('¿Seguro que quieres borrar TODOS los registros? Esta acción no se puede deshacer.')) {
      return;
    }

    registros = [];
    guardarEnStorage();
    renderTabla();
    limpiarFormulario();
  }

  // Iniciar
  init();
})();
