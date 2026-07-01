<script setup>
import { computed, onMounted, ref } from 'vue'

const sesionesAlumno = ref([])
const selectedSession = ref(null)
const cargando = ref(true)
const vistaSeleccionada = ref('informe')
const usuarioActual = ref(null)
const ordenSeleccionado = ref('reciente')

const sesionesOrdenadas = computed(() => {
  const sesiones = [...sesionesAlumno.value]

  switch (ordenSeleccionado.value) {
    case 'antiguo':
      return sesiones.reverse()

    case 'az':
      return sesiones.sort((a, b) =>
        (a.titulo || '').localeCompare(
          b.titulo || '',
          'es',
          { sensitivity: 'base' }
        )
      )

    case 'za':
      return sesiones.sort((a, b) =>
        (b.titulo || '').localeCompare(
          a.titulo || '',
          'es',
          { sensitivity: 'base' }
        )
      )

    case 'reciente':
    default:
      return sesiones
  }
})

function obtenerIniciales(nombre) {
  if (!nombre) return 'A'

  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(parte => parte.charAt(0).toUpperCase())
    .join('')
}

function obtenerAutor(mensaje) {
  return esMensajeAlumno(mensaje)
    ? usuarioActual.value?.nombre || 'Alumno'
    : 'Paciente'
}

function obtenerAvatar(mensaje) {
  return esMensajeAlumno(mensaje)
    ? obtenerIniciales(usuarioActual.value?.nombre)
    : 'P'
}

async function cargarHistorial() {
  cargando.value = true

  try {
    const usuarioRaw = localStorage.getItem('usuario')

    if (!usuarioRaw) {
      throw new Error('No hay ningún usuario autenticado')
    }

    const usuarioInfo = JSON.parse(usuarioRaw)

    if (!usuarioInfo?._id) {
      throw new Error('No se ha podido identificar al alumno')
    }

    const response = await fetch(
      `http://localhost:8000/api/sesiones/alumno/${usuarioInfo._id}`
    )

    if (!response.ok) {
      throw new Error('Error al obtener el historial')
    }

    const data = await response.json()

    sesionesAlumno.value = data

    if (data.length > 0) {
      selectedSession.value = data[0]
      vistaSeleccionada.value = 'informe'
    } else {
      selectedSession.value = null
    }
  } catch (error) {
    console.error('Error cargando historial:', error)
    sesionesAlumno.value = []
    selectedSession.value = null
  } finally {
    cargando.value = false
  }
}

function seleccionarSesion(sesion) {
  selectedSession.value = sesion
  vistaSeleccionada.value = 'informe'
}

function esMensajeAlumno(mensaje) {
  return mensaje.role === 'user'
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

onMounted(() => {
  const usuarioRaw = localStorage.getItem('usuario')

  if (usuarioRaw) {
    usuarioActual.value = JSON.parse(usuarioRaw)
  }

  cargarHistorial()
})
</script>

<template>
  <main class="view">
    <section class="history-page">

      <!-- LISTADO DE SESIONES -->
      <section class="sessions-panel">
        <div class="panel-header">
          <h2>Sesiones Clínicas</h2>

          <select
            v-model="ordenSeleccionado"
            class="order-select"
            aria-label="Ordenar sesiones"
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
          </select>
        </div>

        <div v-if="cargando" class="loading-text">
          Cargando historial...
        </div>

        <div
          v-else-if="sesionesAlumno.length === 0"
          class="loading-text"
        >
          Aún no hay sesiones registradas.
        </div>

        <article
          v-for="sesion in sesionesOrdenadas"
          :key="sesion._id"
          class="session-card"
          :class="{ selected: selectedSession?._id === sesion._id }"
          @click="seleccionarSesion(sesion)"
        >
          <div>
            <p class="session-date">
              {{ sesion.fecha_creacion }} · {{ sesion.hora_creacion }}
            </p>

            <h3>{{ sesion.titulo }}</h3>

            <p class="session-info">
              {{ Math.floor((sesion.transcripcion?.length || 0) / 2) }}
              turnos
            </p>
          </div>

          <div
            v-if="
              sesion.estado === 'completado' &&
              sesion.informe_evaluador?.informe_alumno
            "
            class="score-block"
          >
            <span
              class="score"
              :class="
                getScoreClass(
                  sesion.informe_evaluador.informe_alumno.puntuacion_global
                )
              "
            >
              {{
                Math.round(
                  sesion.informe_evaluador.informe_alumno.puntuacion_global
                )
              }}/100
            </span>

            <p>
              {{ sesion.informe_evaluador.informe_alumno.nivel }}
            </p>
          </div>

          <div v-else class="score-block">
            <span class="score pending">
              ⏳ Evaluando
            </span>
          </div>
        </article>
      </section>

      <!-- PANEL DERECHO -->
      <section
        v-if="
          selectedSession &&
          selectedSession.estado === 'completado'
        "
        class="report-panel"
      >
        <div class="panel-header report-tabs">
          <button
            type="button"
            class="report-tab"
            :class="{ active: vistaSeleccionada === 'informe' }"
            @click="vistaSeleccionada = 'informe'"
          >
            Informe pedagógico
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

        <!-- INFORME PEDAGÓGICO -->
        <div
          v-if="vistaSeleccionada === 'informe'"
          class="report-content"
        >
          <div class="report-top">
            <div>
              <h1>{{ selectedSession.titulo }}</h1>

              <p>
                Fecha de sesión:
                {{ selectedSession.fecha_creacion }}
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
                    selectedSession.informe_evaluador
                      .informe_alumno.puntuacion_global
                  )
                }}
              </div>

              <p>Puntuación</p>
            </div>
          </div>

          <div class="resumen-general">
            <p>
              <strong>Resumen de actuación:</strong>
              {{
                selectedSession.informe_evaluador
                  .informe_alumno.resumen_general
              }}
            </p>
          </div>

          <hr />

          <h3 class="section-title">
            ANÁLISIS DE COMPETENCIAS
          </h3>

          <div
            v-for="competencia in selectedSession.informe_evaluador
              .informe_alumno.competencias"
            :key="competencia.nombre"
            class="competence-wrapper"
          >
            <template v-if="competencia.evaluable">
              <div class="competence-header">
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

              <div class="competence-feedback">
                <p>
                  <strong>Justificación:</strong>
                  {{ competencia.justificacion }}
                </p>

                <p class="evidencia">
                  <strong>Evidencia:</strong>
                  <em>"{{ competencia.evidencia }}"</em>
                </p>
              </div>
            </template>
          </div>

          <h3 class="section-title">
            FEEDBACK CUALITATIVO
          </h3>

          <div class="feedback-box">
            <p>
              <strong>Fortalezas:</strong>
              {{
                selectedSession.informe_evaluador
                  .informe_alumno.fortalezas
              }}
            </p>

            <p>
              <strong>Aspectos a mejorar:</strong>
              {{
                selectedSession.informe_evaluador
                  .informe_alumno.aspectos_a_mejorar
              }}
            </p>

            <p>
              <strong>Recomendación:</strong>
              {{
                selectedSession.informe_evaluador
                  .informe_alumno.recomendacion_pedagogica
              }}
            </p>
          </div>
        </div>

        <!-- TRANSCRIPCIÓN -->
        <div
          v-else-if="vistaSeleccionada === 'transcripcion'"
          class="transcript-content"
        >
          <div class="transcript-header">
            <div>
              <h1>{{ selectedSession.titulo }}</h1>

              <p>
                {{ selectedSession.fecha_creacion }}
                ·
                {{ selectedSession.hora_creacion }}
              </p>
            </div>

            <span class="turn-count">
              {{
                Math.floor(
                  (selectedSession.transcripcion?.length || 0) / 2
                )
              }}
              turnos
            </span>
          </div>

          <div
            v-if="!selectedSession.transcripcion?.length"
            class="empty-transcript"
          >
            No hay mensajes registrados en esta sesión.
          </div>

          <section
            v-else
            class="transcript-messages"
          >
            <article
              v-for="(mensaje, index) in selectedSession.transcripcion"
              :key="index"
              class="transcript-row"
              :class="{
                alumno: esMensajeAlumno(mensaje),
                paciente: !esMensajeAlumno(mensaje)
              }"
            >
              <div class="transcript-avatar">
                {{ obtenerAvatar(mensaje) }}
              </div>

              <div class="transcript-message-wrapper">
                <span class="transcript-author">
                  {{ obtenerAutor(mensaje) }}
                </span>

                <p class="transcript-bubble">
                  {{ mensaje.content }}
                </p>
              </div>
            </article>
          </section>
        </div>
      </section>

      <!-- SESIÓN PROCESÁNDOSE -->
      <section
        v-else-if="
          selectedSession &&
          selectedSession.estado === 'procesando'
        "
        class="report-panel loading-panel"
      >
        <div class="loading-message">
          <h2>Evaluando sesión...</h2>

          <p>
            El juez algorítmico está analizando la
            transcripción. Esto puede tardar unos segundos.
          </p>
        </div>
      </section>

    </section>
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

.history-page {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 34px 56px;
  display: grid;
  grid-template-columns: 470px minmax(0, 1fr);
  gap: 30px;
  box-sizing: border-box;
  overflow: hidden;
}

.sessions-panel,
.report-panel {
  min-width: 0;
  min-height: 0;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(210, 226, 235, 0.95);
  border-radius: 14px;
  box-shadow:
    0 14px 34px rgba(31, 78, 124, 0.1),
    0 2px 8px rgba(31, 78, 124, 0.04);
  backdrop-filter: blur(8px);
  overflow: hidden;
}

.sessions-panel {
  overflow-y: auto;
  overflow-x: hidden;
}

.report-panel {
  display: flex;
  flex-direction: column;
}

.panel-header {
  height: 62px;
  min-height: 62px;
  flex-shrink: 0;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(250, 252, 253, 0.95);
  border-bottom: 1px solid #dfe7ec;
  box-sizing: border-box;
}

.panel-header h2 {
  font-size: 22px;
  color: #1f2937;
  font-weight: 800;
}

.order-select {
  width: 170px;
  min-width: 170px;
  height: 38px;
  padding: 0 34px 0 14px;
  border: 1px solid #d1dbe3;
  border-radius: 999px;
  background: #e4ebf0;
  color: #111827;
  font-size: 14px;
  font-weight: 800;
  outline: none;
  cursor: pointer;
}

.order-select:hover {
  border-color: #38bdf8;
}

.order-select:focus {
  border-color: #1eaee8;
  box-shadow: 0 0 0 3px rgba(30, 174, 232, 0.14);
}

.loading-text {
  padding: 24px;
  text-align: center;
  color: #6b7280;
}

.session-card {
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5edf2;
  background: white;
  cursor: pointer;
}

.session-card:hover {
  background: #f8fbff;
}

.session-card.selected {
  background: #eef5ff;
  border-left: 5px solid #18aee3;
}

.session-date {
  color: #7b8a9a;
  font-size: 14px;
  margin-bottom: 6px;
}

.session-card h3 {
  color: #1f2937;
  font-size: 17px;
  font-weight: 800;
  margin-bottom: 6px;
  text-transform: capitalize;
}

.session-info {
  color: #8a98a8;
  font-size: 14px;
}

.score-block {
  text-align: center;
}

.score {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 18px;
  font-size: 15px;
  font-weight: 800;
}

.score.good {
  background: #d7f7df;
  color: #168a44;
}

.score.medium {
  background: #fff0a8;
  color: #b48400;
}

.score.bad {
  background: #fee2e2;
  color: #b91c1c;
}

.score.pending {
  background: #f3f4f6;
  color: #4b5563;
  font-weight: 600;
}

.score-block p {
  margin-top: 6px;
  font-size: 13px;
  color: #6b7280;
}

.report-tabs {
  flex: 0 0 62px;
  justify-content: flex-start;
  gap: 34px;
}

.report-tab {
  position: relative;
  height: 100%;
  padding: 0 4px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
}

.report-tab:hover {
  color: #0ea5e9;
}

.report-tab.active {
  color: #111827;
  font-weight: 800;
}

.report-tab.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 4px;
  border-radius: 999px 999px 0 0;
  background: #18aee3;
}

.report-content {
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
  font-size: 28px;
  color: #111827;
  margin-bottom: 10px;
  text-transform: capitalize;
}

.report-top p {
  color: #6b7280;
  font-size: 15px;
  line-height: 1.4;
}

.circle-score {
  text-align: center;
}

.circle {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  border: 8px solid #12b886;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 800;
  color: #111827;
}

.circle-score p {
  margin-top: 8px;
  font-size: 13px;
  color: #6b7280;
}

.resumen-general {
  margin-top: 20px;
  background: #f9fafb;
  padding: 15px;
  border-radius: 8px;
  color: #374151;
  font-size: 15px;
  border-left: 4px solid #10b981;
}

.report-content hr {
  margin: 28px 0;
  border: none;
  border-top: 1px solid #e5e7eb;
}

.section-title {
  font-size: 17px;
  color: #1f2937;
  font-weight: 900;
  margin-bottom: 18px;
  text-transform: uppercase;
}

.competence-wrapper {
  margin-bottom: 24px;
}

.competence-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #374151;
  font-weight: 700;
}

.bar {
  height: 8px;
  border-radius: 8px;
  background: #dde6ee;
  overflow: hidden;
  margin-bottom: 10px;
}

.bar-fill {
  height: 100%;
  border-radius: 8px;
  transition: width 0.5s ease;
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

.competence-feedback {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
  font-size: 14px;
  color: #475569;
}

.competence-feedback p {
  margin-bottom: 6px;
  line-height: 1.4;
}

.competence-feedback .evidencia {
  color: #64748b;
  margin-bottom: 0;
}

.feedback-box {
  border-left: 5px solid #14b8e8;
  background: #f8fbfd;
  border-radius: 6px;
  padding: 18px 20px;
  color: #4b5563;
}

.feedback-box p {
  margin-bottom: 12px;
  line-height: 1.5;
}

.transcript-content {
  flex: 1;
  min-height: 0;
  padding: 28px;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
}

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
  font-size: 14px;
}

.turn-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  display: flex;
  align-items: flex-end;
  max-width: 78%;
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
  display: flex;
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #dce7ed;
  color: #476273;
  font-size: 12px;
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
  font-size: 15px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.transcript-row.alumno .transcript-bubble {
  background: #15a9df;
  color: white;
}

.empty-transcript {
  padding: 40px 20px;
  color: #6b7280;
  text-align: center;
}

.loading-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
  min-height: 0;
}

.loading-message h2 {
  color: #1f2937;
  margin-bottom: 10px;
}

@media (max-width: 1100px) {
  .view {
    height: auto;
    min-height: calc(100vh - 88px);
    overflow: visible;
  }

  .history-page {
    height: auto;
    grid-template-columns: 1fr;
    padding: 28px;
    overflow: visible;
  }

  .sessions-panel,
  .report-panel {
    overflow: visible;
  }

  .report-content,
  .transcript-content {
    overflow: visible;
  }
}

@media (max-width: 700px) {
  .history-page {
    padding: 18px;
  }

  .panel-header {
    padding: 0 16px;
  }

  .order-select {
  width: 155px;
  min-width: 155px;
  font-size: 13px;
}

  .report-top,
  .transcript-header {
    flex-direction: column;
  }

  .report-tabs {
    gap: 18px;
  }

  .report-tab {
    font-size: 15px;
  }

  .report-content,
  .transcript-content {
    padding: 20px;
  }

  .transcript-row {
    max-width: 92%;
  }
}
</style>