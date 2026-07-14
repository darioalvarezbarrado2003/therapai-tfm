<script setup>
import { computed, onMounted, ref } from 'vue'

const searchText = ref('')
const ordenSeleccionado = ref('reciente')

const cargando = ref(true)
const errorCarga = ref('')

const registrosAlumnos = ref([])
const selectedTeacherSession = ref(null)
const vistaSeleccionada = ref('alumno')

const registrosFiltrados = computed(() => {
  const texto = searchText.value
    .toLowerCase()
    .trim()

  //filtramos por alumno, caso o título
  let registros = registrosAlumnos.value.filter(registro => {
    if (!texto) return true

    const alumno =
      registro.nombre_alumno?.toLowerCase() || ''

    const caso =
      registro.trastorno?.toLowerCase() || ''

    const titulo =
      registro.titulo?.toLowerCase() || ''

    return (
      alumno.includes(texto) ||
      caso.includes(texto) ||
      titulo.includes(texto)
    )
  })

  registros = [...registros]

  switch (ordenSeleccionado.value) {
    case 'antiguo':
      return registros.reverse()

    case 'az':
      return registros.sort((a, b) =>
        (a.nombre_alumno || '').localeCompare(
          b.nombre_alumno || '',
          'es',
          { sensitivity: 'base' }
        )
      )

    case 'za':
      return registros.sort((a, b) =>
        (b.nombre_alumno || '').localeCompare(
          a.nombre_alumno || '',
          'es',
          { sensitivity: 'base' }
        )
      )

    case 'puntuacion_alta':
      return registros.sort((a, b) => {
        const puntuacionA =
          a.informe_evaluador?.informe_alumno
            ?.puntuacion_global ?? -1

        const puntuacionB =
          b.informe_evaluador?.informe_alumno
            ?.puntuacion_global ?? -1

        return puntuacionB - puntuacionA
      })

    case 'puntuacion_baja':
      return registros.sort((a, b) => {
        const puntuacionA =
          a.informe_evaluador?.informe_alumno
            ?.puntuacion_global ?? Infinity

        const puntuacionB =
          b.informe_evaluador?.informe_alumno
            ?.puntuacion_global ?? Infinity

        return puntuacionA - puntuacionB
      })

    case 'reciente':
    default:
      return registros
  }
})

async function cargarHistorialProfesor() {
  cargando.value = true
  errorCarga.value = ''

  try {
    const usuarioRaw = localStorage.getItem('usuario')

    if (!usuarioRaw) {
      throw new Error('No hay ningún profesor autenticado.')
    }

    const profesor = JSON.parse(usuarioRaw)

    if (!profesor?._id || profesor.rol !== 'profesor') {
      throw new Error('No se ha podido identificar al profesor.')
    }

    const response = await fetch(
      `https://therapai-tfm.onrender.com/api/sesiones/profesor/${profesor._id}`
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.detail || 'No se pudo obtener el historial de alumnos.'
      )
    }

    registrosAlumnos.value = data
  } catch (error) {
    console.error('Error cargando historial del profesor:', error)
    errorCarga.value = error.message
    registrosAlumnos.value = []
  } finally {
    cargando.value = false
  }
}

function verInformeProfesor(registro) {
  selectedTeacherSession.value = registro
  vistaSeleccionada.value = 'alumno'
}

function cerrarInformeProfesor() {
  selectedTeacherSession.value = null
  vistaSeleccionada.value = 'alumno'
}

function getScoreClass(score) {
  if (score >= 80) return 'good'
  if (score >= 50) return 'medium'
  return 'bad'
}

function getBarColor(score) {
  if (score >= 75) return 'green'
  if (score >= 50) return 'orange'
  return 'red'
}

function capitalizar(texto) {
  if (!texto) return 'Caso no especificado'

  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function esMensajeAlumno(mensaje) {
  return mensaje.role === 'user'
}

function obtenerIniciales(nombre) {
  if (!nombre) return 'A'

  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(parte => parte.charAt(0).toUpperCase())
    .join('')
}

function obtenerAutorMensaje(mensaje) {
  return esMensajeAlumno(mensaje)
    ? selectedTeacherSession.value?.nombre_alumno || 'Alumno'
    : 'Paciente'
}

function obtenerAvatarMensaje(mensaje) {
  return esMensajeAlumno(mensaje)
    ? obtenerIniciales(selectedTeacherSession.value?.nombre_alumno)
    : 'P'
}

onMounted(() => {
  cargarHistorialProfesor()
})
</script>

<template>
  <main class="view">
    <section class="teacher-history-page">
      <div class="teacher-history-header">
        <div>
          <h1>Registro de Simulaciones</h1>

          <p>
            Mostrando las últimas interacciones de los estudiantes
            con los agentes virtuales.
          </p>
        </div>

        <div class="teacher-actions">
  <div class="search-wrapper">
    <span class="search-icon">⌕</span>

    <input
      v-model="searchText"
      class="search-input"
      type="search"
      placeholder="Buscar por alumno o caso..."
      aria-label="Buscar por alumno o caso"
    />

    <button
      v-if="searchText"
      type="button"
      class="clear-search"
      aria-label="Borrar búsqueda"
      @click="searchText = ''"
    >
      ×
    </button>
  </div>

  <div class="order-control">
    <label for="orden-informes">
      Ordenar por
    </label>

    <select
      id="orden-informes"
      v-model="ordenSeleccionado"
      class="order-select"
    >
      <option value="reciente">
        Más reciente
      </option>

      <option value="antiguo">
        Más antiguo
      </option>

      <option value="az">
        A-Z
      </option>

      <option value="za">
        Z-A
      </option>

      <option value="puntuacion_alta">
        Mayor puntuación
      </option>

      <option value="puntuacion_baja">
        Menor puntuación
      </option>
    </select>
  </div>
</div>
        
      </div>

      <section class="teacher-table-card">
        <div
          v-if="cargando"
          class="table-state"
        >
          Cargando registros...
        </div>

        <div
          v-else-if="errorCarga"
          class="table-state error-state"
        >
          {{ errorCarga }}
        </div>

        <div
  v-else-if="registrosFiltrados.length === 0"
  class="table-state"
>
  <div class="empty-results">
    <strong>
      {{
        searchText
          ? 'No se encontraron coincidencias'
          : 'No hay simulaciones registradas'
      }}
    </strong>

    <p v-if="searchText">
      Prueba con otro nombre de alumno o caso clínico.
    </p>

    <button
      v-if="searchText"
      type="button"
      class="reset-results"
      @click="limpiarFiltros"
    >
      Mostrar todos los registros
    </button>
  </div>
</div>

        <div
          v-else
          class="table-scroll"
        >
          <table class="teacher-table">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Caso simulado</th>
                <th>Fecha</th>
                <th>Desempeño alumno</th>
                <th>Fidelidad IA</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="registro in registrosFiltrados"
                :key="registro._id"
              >
                <td class="student-name">
                  <div class="student-cell">
                    <div class="student-avatar">
                      {{ obtenerIniciales(registro.nombre_alumno) }}
                    </div>

                    <span>
                      {{ registro.nombre_alumno }}
                    </span>
                  </div>
                </td>

                <td>
                  {{ capitalizar(registro.trastorno) }}
                </td>

                <td>
                  <div class="date-cell">
                    <span>{{ registro.fecha_creacion }}</span>
                    <small>{{ registro.hora_creacion }}</small>
                  </div>
                </td>

                <td>
                  <span
                    v-if="
                      registro.estado === 'completado' &&
                      registro.informe_evaluador?.informe_alumno
                    "
                    class="score"
                    :class="
                      getScoreClass(
                        registro.informe_evaluador
                          .informe_alumno.puntuacion_global
                      )
                    "
                  >
                    {{
                      Math.round(
                        registro.informe_evaluador
                          .informe_alumno.puntuacion_global
                      )
                    }}/100 ·
                    {{
                      registro.informe_evaluador.informe_alumno.nivel
                    }}
                  </span>

                  <span
                    v-else
                    class="score pending"
                  >
                    Evaluando
                  </span>
                </td>

                <td>
                  <span
                    v-if="
                      registro.estado === 'completado' &&
                      registro.informe_evaluador?.informe_agente
                    "
                    class="score"
                    :class="
                      getScoreClass(
                        registro.informe_evaluador
                          .informe_agente.puntuacion_global
                      )
                    "
                  >
                    {{
                      Math.round(
                        registro.informe_evaluador
                          .informe_agente.puntuacion_global
                      )
                    }}% ·
                    {{
                      registro.informe_evaluador.informe_agente.nivel
                    }}
                  </span>

                  <span
                    v-else
                    class="score pending"
                  >
                    Evaluando
                  </span>
                </td>

                <td>
                  <button
                    v-if="registro.estado === 'completado'"
                    class="report-link"
                    type="button"
                    @click="verInformeProfesor(registro)"
                  >
                    Ver informe ›
                  </button>

                  <span
                    v-else
                    class="unavailable-report"
                  >
                    No disponible
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>

    <!-- MODAL DEL INFORME -->
    <div
      v-if="selectedTeacherSession"
      class="modal-backdrop"
      @click.self="cerrarInformeProfesor"
    >
      <section class="teacher-report-modal">
        <button
          class="close-modal"
          type="button"
          aria-label="Cerrar informe"
          @click="cerrarInformeProfesor"
        >
          ×
        </button>

        <!-- PESTAÑAS -->
        <div class="report-tabs">
          <button
            type="button"
            class="report-tab"
            :class="{ active: vistaSeleccionada === 'alumno' }"
            @click="vistaSeleccionada = 'alumno'"
          >
            Informe pedagógico
          </button>

          <button
            type="button"
            class="report-tab"
            :class="{ active: vistaSeleccionada === 'agente' }"
            @click="vistaSeleccionada = 'agente'"
          >
            Informe del agente
          </button>

          <button
            type="button"
            class="report-tab"
            :class="{ active: vistaSeleccionada === 'transcripcion' }"
            @click="vistaSeleccionada = 'transcripcion'"
          >
            Transcripción
          </button>
        </div>

        <!-- INFORME DEL ALUMNO -->
        <div
          v-if="vistaSeleccionada === 'alumno'"
          class="modal-scroll-content"
        >
          <div class="report-top">
            <div>
              <h1>{{ selectedTeacherSession.titulo }}</h1>

              <p>
                Alumno:
                {{ selectedTeacherSession.nombre_alumno }}
              </p>

              <p>
                Fecha de sesión:
                {{ selectedTeacherSession.fecha_creacion }}
                ·
                {{ selectedTeacherSession.hora_creacion }}
              </p>

              <p>
                Evaluador: Inteligencia Artificial
                (LLM-as-a-Judge)
              </p>
            </div>

            <div class="circle-score">
              <div class="circle">
                {{
                  Math.round(
                    selectedTeacherSession.informe_evaluador
                      .informe_alumno.puntuacion_global
                  )
                }}
              </div>

              <p>Puntuación</p>
            </div>
          </div>

          <div class="summary-box student-summary">
            <p>
              <strong>Resumen de actuación:</strong>
              {{
                selectedTeacherSession.informe_evaluador
                  .informe_alumno.resumen_general
              }}
            </p>
          </div>

          <hr />

          <h3 class="section-title">
            ANÁLISIS DE COMPETENCIAS
          </h3>

          <div
            v-for="competencia in selectedTeacherSession
              .informe_evaluador.informe_alumno.competencias"
            :key="competencia.nombre"
            class="metric-wrapper"
          >
            <template v-if="competencia.evaluable">
              <div class="metric-header">
                <span>{{ competencia.nombre }}</span>
                <span>{{ competencia.puntuacion }}%</span>
              </div>

              <div class="bar">
                <div
                  class="bar-fill"
                  :class="getBarColor(competencia.puntuacion)"
                  :style="{
                    width: competencia.puntuacion + '%'
                  }"
                ></div>
              </div>

              <div class="metric-feedback">
                <p>
                  <strong>Justificación:</strong>
                  {{ competencia.justificacion }}
                </p>

                <p class="evidence">
                  <strong>Evidencia:</strong>
                  <em>"{{ competencia.evidencia }}"</em>
                </p>
              </div>
            </template>

            <div
              v-else
              class="not-evaluable"
            >
              <strong>{{ competencia.nombre }}:</strong>
              {{ competencia.justificacion }}
            </div>
          </div>

          <h3 class="section-title">
            FEEDBACK CUALITATIVO
          </h3>

          <div class="feedback-box">
            <p>
              <strong>Fortalezas:</strong>
              {{
                selectedTeacherSession.informe_evaluador
                  .informe_alumno.fortalezas
              }}
            </p>

            <p>
              <strong>Aspectos a mejorar:</strong>
              {{
                selectedTeacherSession.informe_evaluador
                  .informe_alumno.aspectos_a_mejorar
              }}
            </p>

            <p>
              <strong>Recomendación:</strong>
              {{
                selectedTeacherSession.informe_evaluador
                  .informe_alumno.recomendacion_pedagogica
              }}
            </p>
          </div>
        </div>

        <!-- INFORME DEL AGENTE -->
        <div
          v-else-if="vistaSeleccionada === 'agente'"
          class="modal-scroll-content"
        >
          <div class="report-top">
            <div>
              <h1>Informe técnico del agente paciente</h1>

              <p>
                Sesión:
                {{ selectedTeacherSession.titulo }}
              </p>

              <p>
                Caso clínico:
                {{ capitalizar(selectedTeacherSession.trastorno) }}
              </p>

              <p>
                Alumno:
                {{ selectedTeacherSession.nombre_alumno }}
              </p>
            </div>

            <div class="circle-score">
              <div class="circle agent-circle">
                {{
                  Math.round(
                    selectedTeacherSession.informe_evaluador
                      .informe_agente.puntuacion_global
                  )
                }}
              </div>

              <p>Fidelidad</p>
            </div>
          </div>

          <div class="summary-box agent-summary">
            <p>
              <strong>Conclusión técnica:</strong>
              {{
                selectedTeacherSession.informe_evaluador
                  .informe_agente.conclusion_tecnica
              }}
            </p>
          </div>

          <hr />

          <h3 class="section-title">
            MÉTRICAS DEL AGENTE
          </h3>

          <div
            v-for="metrica in selectedTeacherSession
              .informe_evaluador.informe_agente.metricas"
            :key="metrica.nombre"
            class="metric-wrapper"
          >
            <template v-if="metrica.evaluable">
              <div class="metric-header">
                <span>{{ metrica.nombre }}</span>
                <span>{{ metrica.puntuacion }}%</span>
              </div>

              <div class="bar">
                <div
                  class="bar-fill"
                  :class="getBarColor(metrica.puntuacion)"
                  :style="{
                    width: metrica.puntuacion + '%'
                  }"
                ></div>
              </div>

              <div class="metric-feedback">
                <p>
                  <strong>Justificación:</strong>
                  {{ metrica.justificacion }}
                </p>

                <p class="evidence">
                  <strong>Evidencia:</strong>
                  <em>"{{ metrica.evidencia }}"</em>
                </p>
              </div>
            </template>

            <div
              v-else
              class="not-evaluable"
            >
              <strong>{{ metrica.nombre }}:</strong>
              {{ metrica.justificacion }}
            </div>
          </div>

          <h3 class="section-title">
            CONCLUSIONES
          </h3>

          <div class="feedback-box agent-feedback">
            <p>
              <strong>Incidencias detectadas:</strong>
              {{
                selectedTeacherSession.informe_evaluador
                  .informe_agente.incidencias_detectadas
              }}
            </p>

            <p>
              <strong>Conclusión técnica:</strong>
              {{
                selectedTeacherSession.informe_evaluador
                  .informe_agente.conclusion_tecnica
              }}
            </p>

            <p>
              <strong>Recomendación para el profesor:</strong>
              {{
                selectedTeacherSession.informe_evaluador
                  .informe_agente.recomendacion_para_profesor
              }}
            </p>
          </div>
        </div>

        <!-- TRANSCRIPCIÓN -->
        <div
          v-else
          class="modal-scroll-content"
        >
          <div class="transcript-header">
            <div>
              <h1>{{ selectedTeacherSession.titulo }}</h1>

              <p>
                {{ selectedTeacherSession.fecha_creacion }}
                ·
                {{ selectedTeacherSession.hora_creacion }}
              </p>
            </div>

            <span class="turn-count">
              {{
                Math.floor(
                  (
                    selectedTeacherSession.transcripcion?.length || 0
                  ) / 2
                )
              }}
              turnos
            </span>
          </div>

          <div
            v-if="!selectedTeacherSession.transcripcion?.length"
            class="empty-transcript"
          >
            No hay mensajes registrados en esta sesión.
          </div>

          <section
            v-else
            class="transcript-messages"
          >
            <article
              v-for="(mensaje, index) in selectedTeacherSession.transcripcion"
              :key="index"
              class="transcript-row"
              :class="{
                alumno: esMensajeAlumno(mensaje),
                paciente: !esMensajeAlumno(mensaje)
              }"
            >
              <div class="transcript-avatar">
                {{ obtenerAvatarMensaje(mensaje) }}
              </div>

              <div class="transcript-message-wrapper">
                <span class="transcript-author">
                  {{ obtenerAutorMensaje(mensaje) }}
                </span>

                <p class="transcript-bubble">
                  {{ mensaje.content }}
                </p>
              </div>
            </article>
          </section>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.view {
  position: relative;
  height: calc(100vh - 88px);
  overflow: hidden;
  background:
    radial-gradient(
      circle at 18% 18%,
      rgba(56, 189, 248, 0.12),
      transparent 28%
    ),
    radial-gradient(
      circle at 82% 16%,
      rgba(45, 212, 191, 0.1),
      transparent 26%
    ),
    linear-gradient(
      180deg,
      #f7fbfd 0%,
      #eef7fb 100%
    );
}

.view::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    linear-gradient(
      rgba(37, 91, 142, 0.035) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      rgba(37, 91, 142, 0.035) 1px,
      transparent 1px
    );
  background-size: 46px 46px;
  mask-image: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.65),
    transparent 85%
  );
}

.view::after {
  content: "";
  position: absolute;
  right: -120px;
  bottom: -160px;
  z-index: 0;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  background: rgba(56, 189, 248, 0.08);
  filter: blur(10px);
  pointer-events: none;
}

.teacher-history-page {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 42px 56px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}

.teacher-history-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  gap: 24px;
}

.teacher-history-header h1 {
  margin: 0 0 8px;
  color: #1f2937;
  font-size: 34px;
}

.teacher-history-header p {
  margin: 0;
  color: #64748b;
  font-size: 17px;
}

.teacher-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  flex-wrap: wrap;
}

.search-wrapper {
  position: relative;
  width: 320px;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 14px;
  color: #94a3b8;
  font-size: 20px;
  line-height: 1;
  transform: translateY(-50%);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 44px;
  padding: 0 42px 0 40px;
  border: 1px solid rgba(209, 219, 227, 0.95);
  border-radius: 10px;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.88);
  color: #1f2937;
  outline: none;
  backdrop-filter: blur(8px);
}

.search-input:focus {
  border-color: #1eaee8;
  box-shadow: 0 0 0 3px rgba(30, 174, 232, 0.14);
}

.search-input::-webkit-search-cancel-button {
  appearance: none;
}

.clear-search {
  position: absolute;
  top: 50%;
  right: 10px;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #64748b;
  font-size: 21px;
  line-height: 1;
  cursor: pointer;
  transform: translateY(-50%);
}

.clear-search:hover {
  background: #e2e8f0;
  color: #111827;
}

.order-control {
  display: flex;
  align-items: center;
  gap: 9px;
}

.order-control label {
  color: #64748b;
  font-size: 14px;
  font-weight: 800;
  white-space: nowrap;
}

.order-select {
  min-width: 170px;
  height: 44px;
  padding: 0 38px 0 15px;
  border: 1px solid rgba(209, 219, 227, 0.95);
  border-radius: 999px;
  background: rgba(228, 235, 240, 0.88);
  color: #111827;
  font-size: 14px;
  font-weight: 800;
  outline: none;
  cursor: pointer;
  backdrop-filter: blur(8px);
}

.order-select:hover {
  border-color: #38bdf8;
}

.order-select:focus {
  border-color: #1eaee8;
  box-shadow: 0 0 0 3px rgba(30, 174, 232, 0.14);
}

.filter-btn {
  height: 44px;
  padding: 0 16px;
  border: 1px solid rgba(209, 219, 227, 0.95);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  color: #4b5563;
  font-weight: 700;
  cursor: pointer;
  backdrop-filter: blur(8px);
}

.filter-btn:hover {
  border-color: #38bdf8;
  color: #0284c7;
  background: #f0f9ff;
}

.empty-results {
  text-align: center;
}

.empty-results strong {
  display: block;
  margin-bottom: 7px;
  color: #374151;
  font-size: 17px;
}

.empty-results p {
  margin: 0 0 16px;
  color: #94a3b8;
}

.reset-results {
  padding: 9px 15px;
  border: none;
  border-radius: 8px;
  background: #38bdf8;
  color: white;
  font-weight: 800;
  cursor: pointer;
}

.reset-results:hover {
  background: #0ea5e9;
}

/* TABLA CON SCROLL PROPIO */
.teacher-table-card {
  flex: 1;
  min-height: 0;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(210, 226, 235, 0.95);
  border-radius: 16px;
  box-shadow:
    0 14px 34px rgba(31, 78, 124, 0.1),
    0 2px 8px rgba(31, 78, 124, 0.04);
  backdrop-filter: blur(10px);
  overflow: hidden;
}

.table-scroll {
  width: 100%;
  height: 100%;
  overflow: auto;
  scrollbar-gutter: stable;
}

.teacher-table {
  width: 100%;
  border-collapse: collapse;
}

.teacher-table thead {
  position: sticky;
  top: 0;
  z-index: 2;
}

.teacher-table th {
  text-align: left;
  background: rgba(248, 251, 253, 0.96);
  color: #6b7280;
  padding: 20px 24px;
  border-bottom: 1px solid #dfe7ec;
  white-space: nowrap;
  backdrop-filter: blur(10px);
}

.teacher-table td {
  padding: 20px 24px;
  border-bottom: 1px solid #e5edf2;
  background: rgba(255, 255, 255, 0.9);
  vertical-align: middle;
}

.teacher-table tbody tr:hover td {
  background: rgba(241, 248, 252, 0.96);
}

.student-name {
  color: #111827;
  font-weight: 900;
}

.student-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.student-avatar {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 50%;
  background: #255b8e;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 5px 12px rgba(37, 91, 142, 0.2);
}

.date-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
  color: #374151;
}

.date-cell small {
  color: #94a3b8;
}

.report-link {
  border: none;
  background: none;
  color: #7c3aed;
  font-weight: 900;
  cursor: pointer;
  white-space: nowrap;
}

.report-link:hover {
  color: #5b21b6;
  text-decoration: underline;
}

.unavailable-report {
  color: #94a3b8;
  font-size: 13px;
}

.score {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 18px;
  font-weight: 800;
  white-space: nowrap;
}

.score.good {
  background: #d7f7df;
  color: #168a44;
}

.score.medium {
  background: #fff0a8;
  color: #9a6b00;
}

.score.bad {
  background: #fee2e2;
  color: #b91c1c;
}

.score.pending {
  background: #f3f4f6;
  color: #6b7280;
}

.table-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px;
  box-sizing: border-box;
  color: #6b7280;
}

.error-state {
  color: #dc2626;
}

/* MODAL */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  padding: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  background: rgba(15, 23, 42, 0.38);
  backdrop-filter: blur(4px);
}

.teacher-report-modal {
  position: relative;
  width: min(1500px, 96vw);
  height: min(900px, 92vh);
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid rgba(210, 226, 235, 0.95);
  border-radius: 16px;
  box-shadow: 0 22px 60px rgba(15, 23, 42, 0.25);
  backdrop-filter: blur(12px);
  overflow: hidden;
}

.close-modal {
  position: absolute;
  top: 12px;
  right: 18px;
  z-index: 5;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #111827;
  font-size: 30px;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
}

.close-modal:hover {
  color: #dc2626;
  background: #fee2e2;
}

/* PESTAÑAS DEL MODAL */
.report-tabs {
  height: 62px;
  min-height: 62px;
  flex-shrink: 0;
  padding: 0 60px 0 18px;
  display: flex;
  align-items: center;
  gap: 34px;
  background: rgba(248, 251, 253, 0.92);
  border-bottom: 1px solid #dfe7ec;
  backdrop-filter: blur(10px);
}

.report-tab {
  position: relative;
  height: 100%;
  padding: 0 3px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
}

.report-tab:hover {
  color: #0ea5e9;
}

.report-tab.active {
  color: #111827;
  font-weight: 900;
}

.report-tab.active::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 4px;
  border-radius: 999px 999px 0 0;
  background: #18aee3;
}

/* CONTENIDO INTERIOR DESPLAZABLE */
.modal-scroll-content {
  flex: 1;
  min-height: 0;
  padding: 28px;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
}

.report-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.report-top h1 {
  margin: 0 0 12px;
  color: #111827;
  font-size: 28px;
  text-transform: capitalize;
}

.report-top p {
  margin: 6px 0;
  color: #6b7280;
  font-size: 15px;
}

.circle-score {
  text-align: center;
}

.circle {
  width: 76px;
  height: 76px;
  border: 8px solid #12b886;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #111827;
  font-size: 26px;
  font-weight: 800;
}

.agent-circle {
  border-color: #38bdf8;
}

.circle-score p {
  margin-top: 8px;
  color: #6b7280;
  font-size: 13px;
}

.summary-box {
  margin-top: 22px;
  padding: 16px;
  border-radius: 8px;
  background: #f9fafb;
  color: #374151;
  line-height: 1.5;
}

.student-summary {
  border-left: 4px solid #10b981;
}

.agent-summary {
  border-left: 4px solid #38bdf8;
}

.modal-scroll-content hr {
  margin: 28px 0;
  border: none;
  border-top: 1px solid #e5e7eb;
}

.section-title {
  margin: 0 0 18px;
  color: #1f2937;
  font-size: 17px;
  font-weight: 900;
}

.metric-wrapper {
  margin-bottom: 24px;
}

.metric-header {
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  color: #374151;
  font-weight: 700;
}

.bar {
  height: 8px;
  margin-bottom: 10px;
  border-radius: 8px;
  background: #dde6ee;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 8px;
}

.bar-fill.green {
  background: #12b886;
}

.bar-fill.orange {
  background: #f59e0b;
}

.bar-fill.red {
  background: #ef4444;
}

.metric-feedback {
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
  color: #475569;
  font-size: 14px;
}

.metric-feedback p {
  margin: 0 0 7px;
  line-height: 1.45;
}

.metric-feedback p:last-child {
  margin-bottom: 0;
}

.evidence {
  color: #64748b;
}

.not-evaluable {
  padding: 14px;
  border-radius: 7px;
  background: #f3f4f6;
  color: #6b7280;
}

.feedback-box {
  padding: 18px 20px;
  border-left: 5px solid #14b8e8;
  border-radius: 6px;
  background: #f8fbfd;
  color: #4b5563;
}

.agent-feedback {
  border-left-color: #8b5cf6;
}

.feedback-box p {
  margin: 0 0 12px;
  line-height: 1.5;
}

.feedback-box p:last-child {
  margin-bottom: 0;
}

/* TRANSCRIPCIÓN */
.transcript-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 22px;
  margin-bottom: 28px;
  border-bottom: 1px solid #e5e7eb;
}

.transcript-header h1 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 28px;
  text-transform: capitalize;
}

.transcript-header p {
  margin: 0;
  color: #6b7280;
}

.turn-count {
  padding: 8px 14px;
  border-radius: 999px;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 14px;
  font-weight: 800;
  white-space: nowrap;
}

.transcript-messages {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.transcript-row {
  max-width: 78%;
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.transcript-row.paciente {
  align-self: flex-start;
}

.transcript-row.alumno {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.transcript-avatar {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dce7ed;
  color: #476273;
  font-size: 11px;
  font-weight: 800;
}

.transcript-row.alumno .transcript-avatar {
  background: #1f79b5;
  color: white;
}

.transcript-message-wrapper {
  min-width: 0;
}

.transcript-author {
  display: block;
  margin: 0 0 5px 4px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.transcript-row.alumno .transcript-author {
  margin-right: 4px;
  text-align: right;
}

.transcript-bubble {
  margin: 0;
  padding: 14px 18px;
  border-radius: 16px;
  background: #edf1f6;
  color: #31414b;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.transcript-row.alumno .transcript-bubble {
  background: #15a9df;
  color: white;
}

.empty-transcript {
  padding: 40px;
  color: #6b7280;
  text-align: center;
}

@media (max-width: 1100px) {
  .teacher-history-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .teacher-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .search-wrapper {
    flex: 1;
    width: auto;
    min-width: 260px;
  }

  .search-input {
    flex: 1;
    width: auto;
  }

  .teacher-table {
    min-width: 1100px;
  }
}

@media (max-width: 700px) {
  .view {
    height: auto;
    min-height: calc(100vh - 88px);
    overflow: visible;
  }

  .teacher-history-page {
    height: auto;
    min-height: calc(100vh - 88px);
    padding: 24px 18px;
    overflow: visible;
  }

  .teacher-table-card {
    min-height: 450px;
  }

  .teacher-actions {
    width: 100%;
    align-items: stretch;
    flex-direction: column;
  }

  .search-wrapper {
    width: 100%;
    min-width: 0;
  }

  .order-control {
    width: 100%;
    justify-content: space-between;
  }

  .order-select {
    flex: 1;
  }

  .filter-btn {
    width: 100%;
  }

  .modal-backdrop {
    padding: 10px;
  }

  .teacher-report-modal {
    width: 100%;
    height: 95vh;
  }

  .report-tabs {
    padding-left: 12px;
    gap: 13px;
    overflow-x: auto;
  }

  .report-tab {
    flex-shrink: 0;
    font-size: 14px;
  }

  .modal-scroll-content {
    padding: 20px;
  }

  .report-top,
  .transcript-header {
    flex-direction: column;
  }

  .transcript-row {
    max-width: 94%;
  }
}
</style>