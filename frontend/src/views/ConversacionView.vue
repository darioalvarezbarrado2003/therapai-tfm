<script setup>
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref
} from 'vue'

import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const MENSAJE_OCULTO_INICIAL =
  '[El terapeuta acaba de entrar a la consulta y se sienta en silencio. Inicia tú la conversación como paciente con una frase natural para romper el hielo, actuando estrictamente según tu trastorno y tu estado de ánimo.]'

const MAX_MENSAJES_ALUMNO = 20
const UMBRAL_AVISO_MENSAJES = 5
const DURACION_AVISO_MENSAJES = 6000

const trastornoSeleccionado = computed(() => route.params.trastorno)

const mostrarModal = ref(false)
const guardandoSesion = ref(false)

const mensajes = ref([])
const nuevoMensaje = ref('')
const escribiendo = ref(false)
const chatContainer = ref(null)

const mostrarAvisoMensajes = ref(false)

const segundos = ref(0)

let intervalo = null
let timeoutAvisoMensajes = null

const configuraciones = {
  depresion: {
    nombre: 'Depresión mayor',
    descripcion:
      'Perfil simulado caracterizado por baja energía, anhedonia, sentimientos de culpa y reticencia inicial.'
  },

  ansiedad: {
    nombre: 'Trastorno de ansiedad',
    descripcion:
      'Perfil simulado caracterizado por preocupación persistente, tensión y anticipación negativa.'
  },

  disruptivo: {
    nombre: 'Trastorno disruptivo',
    descripcion:
      'Perfil desafiante, irritable y poco colaborador, con resistencia ante las preguntas del estudiante.'
  }
}

const casoActual = computed(() => {
  return configuraciones[trastornoSeleccionado.value]
})

const numeroMensajesAlumno = computed(() => {
  return mensajes.value.filter(
    mensaje => mensaje.autor === 'alumno'
  ).length
})

const mensajesRestantes = computed(() => {
  return Math.max(
    MAX_MENSAJES_ALUMNO - numeroMensajesAlumno.value,
    0
  )
})

const limiteMensajesAlcanzado = computed(() => {
  return mensajesRestantes.value === 0
})

const tiempoFormateado = computed(() => {
  const minutos = Math.floor(segundos.value / 60)
  const segundosRestantes = segundos.value % 60

  return `${String(minutos).padStart(2, '0')}:${String(
    segundosRestantes
  ).padStart(2, '0')}`
})

function obtenerHora() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function desplazarAlFinal() {
  await nextTick()

  if (chatContainer.value) {
    chatContainer.value.scrollTop =
      chatContainer.value.scrollHeight
  }
}

function mostrarAvisoCincoMensajes() {
  mostrarAvisoMensajes.value = true

  clearTimeout(timeoutAvisoMensajes)

  timeoutAvisoMensajes = setTimeout(() => {
    mostrarAvisoMensajes.value = false
  }, DURACION_AVISO_MENSAJES)
}

async function enviarMensaje() {
  const texto = nuevoMensaje.value.trim()

  if (
    !texto ||
    escribiendo.value ||
    limiteMensajesAlcanzado.value
  ) {
    return
  }

  mensajes.value.push({
    autor: 'alumno',
    contenido: texto,
    hora: obtenerHora()
  })

  // Después de enviar el mensaje 15 quedan 5 mensajes.
  if (
    mensajesRestantes.value === UMBRAL_AVISO_MENSAJES
  ) {
    mostrarAvisoCincoMensajes()
  }

  nuevoMensaje.value = ''
  escribiendo.value = true

  await desplazarAlFinal()

  try {
    const historialParaAPI = []

    /*
     * Anthropic necesita que el primer mensaje del historial
     * sea del usuario.
     */
    historialParaAPI.push({
      role: 'user',
      content:
        'Hola, toma asiento por favor. Soy el terapeuta y vamos a comenzar la sesión.'
    })

    mensajes.value.forEach(mensaje => {
      historialParaAPI.push({
        role:
          mensaje.autor === 'alumno'
            ? 'user'
            : 'assistant',
        content: mensaje.contenido
      })
    })

    const response = await fetch(
      'https://therapai-tfm.onrender.com/api/simulacion',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trastorno: trastornoSeleccionado.value,
          historial: historialParaAPI
        })
      }
    )

    if (!response.ok) {
      throw new Error('Error al comunicar con el backend')
    }

    const data = await response.json()

    mensajes.value.push({
      autor: 'paciente',
      contenido: data.respuesta,
      hora: obtenerHora()
    })
  } catch (error) {
    console.error('Error en la simulación:', error)

    mensajes.value.push({
      autor: 'paciente',
      contenido:
        '[Error de conexión: No he podido formular una respuesta. Comprueba que el backend está encendido y prueba de nuevo.]',
      hora: obtenerHora()
    })
  } finally {
    escribiendo.value = false
    await desplazarAlFinal()
  }
}

async function iniciarConversacion() {
  escribiendo.value = true

  try {
    const historialParaAPI = [
      {
        role: 'user',
        content: MENSAJE_OCULTO_INICIAL
      }
    ]

    const response = await fetch(
      'https://therapai-tfm.onrender.com/api/simulacion',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trastorno: trastornoSeleccionado.value,
          historial: historialParaAPI
        })
      }
    )

    if (!response.ok) {
      throw new Error('Error al conectar con la IA')
    }

    const data = await response.json()

    mensajes.value.push({
      autor: 'paciente',
      contenido: data.respuesta,
      hora: obtenerHora()
    })

    await desplazarAlFinal()
  } catch (error) {
    console.error('Error al iniciar:', error)

    mensajes.value.push({
      autor: 'paciente',
      contenido:
        '⚠️ [El paciente virtual no ha podido entrar a la sala. Revisa el backend.]',
      hora: obtenerHora()
    })
  } finally {
    escribiendo.value = false
    await desplazarAlFinal()
  }
}

function abrirModalFinalizar() {
  mostrarModal.value = true
}

function cerrarModal() {
  if (!guardandoSesion.value) {
    mostrarModal.value = false
  }
}

async function confirmarFinalizarSesion() {
  guardandoSesion.value = true
  clearInterval(intervalo)

  const usuarioRaw = localStorage.getItem('usuario')
  const usuarioInfo = usuarioRaw
    ? JSON.parse(usuarioRaw)
    : {
        _id: 'id_demo_alumno',
        idp: 'id_demo_profesor'
      }

  
  const idProfesorReal = usuarioInfo.idp || usuarioInfo.id_profesor || usuarioInfo.profesor_id || 'profesor_demo';

  const historialParaEvaluar = mensajes.value.map(
    mensaje => ({
      role: mensaje.autor === 'alumno' ? 'user' : 'assistant',
      content: mensaje.contenido
    })
  )

  try {
    const response = await fetch(
      'https://therapai-tfm.onrender.com/api/evaluacion',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id_alumno: usuarioInfo._id,
          id_profesor: idProfesorReal, 
          trastorno: trastornoSeleccionado.value,
          historial: historialParaEvaluar
        })
      }
    )

    if (!response.ok) {
      throw new Error('Error al guardar la sesión')
    }

    router.push('/mi-historial')
  } catch (error) {
    console.error('Error al finalizar la sesión:', error)
    alert('Hubo un problema al evaluar la transcripción.')
    
    guardandoSesion.value = false
    mostrarModal.value = false
    
    intervalo = setInterval(() => {
      segundos.value++
    }, 1000)
  }
}

onMounted(() => {
  if (!casoActual.value) {
    router.replace('/simulacion')
    return
  }

  intervalo = setInterval(() => {
    segundos.value++
  }, 1000)

  iniciarConversacion()
})

onUnmounted(() => {
  clearInterval(intervalo)
  clearTimeout(timeoutAvisoMensajes)
})
</script>

<template>
  <main
    v-if="casoActual"
    class="pagina-conversacion"
  >
    <section class="zona-chat">
      <header class="cabecera-chat">
        <div class="avatar-paciente">
          <span>♙</span>
        </div>

        <div class="informacion-cabecera">
          <div class="titulo-caso">
            <span>Caso clínico:</span>

            <h1>
              {{ casoActual.nombre }}
            </h1>
          </div>

          <p class="descripcion-caso">
            {{ casoActual.descripcion }}
          </p>
        </div>
      </header>

      <section
        ref="chatContainer"
        class="mensajes"
      >
        <article
          v-for="(mensaje, index) in mensajes"
          :key="index"
          class="fila-mensaje"
          :class="mensaje.autor"
        >
          <div class="avatar-mensaje">
            {{
              mensaje.autor === 'alumno'
                ? 'CF'
                : 'P'
            }}
          </div>

          <div class="contenido-mensaje">
            <p class="burbuja">
              {{ mensaje.contenido }}
            </p>

            <span class="hora">
              {{ mensaje.hora }}
            </span>
          </div>
        </article>

        <p
          v-if="escribiendo"
          class="escribiendo"
        >
          El paciente está escribiendo...
        </p>
      </section>

      <div class="contenedor-escritura">
        <Transition name="aviso">
          <div
            v-if="mostrarAvisoMensajes"
            class="aviso-mensajes"
            role="alert"
          >
            Te quedan 5 mensajes. Empieza a
            preparar el cierre de la sesión.
          </div>
        </Transition>

        <div
          v-if="limiteMensajesAlcanzado"
          class="aviso-limite"
          role="alert"
        >
          Has alcanzado el máximo de 20 mensajes.
          Finaliza la sesión para generar la
          evaluación.
        </div>

        <form
          class="zona-escritura"
          @submit.prevent="enviarMensaje"
        >
          <textarea
            v-model="nuevoMensaje"
            :placeholder="
              limiteMensajesAlcanzado
                ? 'Límite de mensajes alcanzado'
                : 'Escribe tu intervención terapéutica aquí...'
            "
            rows="1"
            :disabled="
              escribiendo ||
              limiteMensajesAlcanzado
            "
            @keydown.enter.exact.prevent="
              enviarMensaje
            "
          />

          <button
            type="submit"
            :disabled="
              !nuevoMensaje.trim() ||
              escribiendo ||
              limiteMensajesAlcanzado
            "
            aria-label="Enviar mensaje"
          >
            ➤
          </button>
        </form>
      </div>
    </section>

    <aside class="panel-lateral">
      <section
        class="panel-informacion panel-etica"
      >
        <h2>Aviso de uso</h2>

        <p>
          Esta simulación utiliza un paciente
          virtual generado mediante inteligencia
          artificial.
        </p>

        <p>
          No representa a una persona real y no
          debe utilizarse para realizar
          diagnósticos, tratamientos ni decisiones
          clínicas reales.
        </p>

        <p>
          Es una herramienta destinada
          exclusivamente a la formación y práctica
          con fines pedagógicos.
        </p>
      </section>

      <section
        class="panel-informacion panel-mensajes-restantes"
        :class="{
          agotado: limiteMensajesAlcanzado,
          pocos:
            mensajesRestantes <= 5 &&
            !limiteMensajesAlcanzado
        }"
      >
        <h2>Mensajes disponibles</h2>

        <div class="contador-mensajes">
          <strong>
            {{ mensajesRestantes }}
          </strong>

          <span>
            de {{ MAX_MENSAJES_ALUMNO }}
            restantes
          </span>
        </div>

        <p v-if="limiteMensajesAlcanzado">
          Debes finalizar la sesión para continuar.
        </p>

        <p v-else-if="mensajesRestantes <= 5">
          Ve preparando el cierre de la sesión.
        </p>
      </section>

      <div class="temporizador">
        <span class="reloj">◷</span>

        <strong>
          {{ tiempoFormateado }}
        </strong>
      </div>

      <button
        type="button"
        class="boton-finalizar"
        @click="abrirModalFinalizar"
      >
        Finalizar sesión
      </button>
    </aside>

    <div
      v-if="mostrarModal"
      class="modal-overlay"
    >
      <div class="modal-content">
        <button
          v-if="!guardandoSesion"
          class="close-btn"
          type="button"
          @click="cerrarModal"
        >
          ✖
        </button>

        <h2 v-if="!guardandoSesion">
          Finalizar sesión
        </h2>

        <h2 v-else>
          Evaluando sesión...
        </h2>

        <p v-if="!guardandoSesion">
          ¿Seguro que quieres terminar la consulta
          y enviar la transcripción al juez
          evaluador?
        </p>

        <p v-else>
          La inteligencia artificial está
          analizando tus competencias. Por favor,
          no cierres esta ventana. El proceso puede
          tardar unos 15 segundos.
        </p>

        <div
          v-if="!guardandoSesion"
          class="modal-buttons"
        >
          <button
            type="button"
            class="btn-cancelar"
            @click="cerrarModal"
          >
            Cancelar
          </button>

          <button
            type="button"
            class="btn-aceptar"
            @click="confirmarFinalizarSesion"
          >
            Aceptar
          </button>
        </div>

        <div
          v-else
          class="loader-container"
        >
          <div class="spinner"></div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.pagina-conversacion {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;

  height: calc(100vh - 88px);
  min-height: 0;

  overflow: hidden;
  background: #f7fafc;
}

.zona-chat {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;

  overflow: hidden;
  border-right: 2px solid #85929b;
}

/* Cabecera del caso clínico */

.cabecera-chat {
  display: flex;
  min-height: 88px;
  flex-shrink: 0;
  align-items: center;

  padding: 14px 24px;
  gap: 14px;

  border-bottom: 1px solid #e1e8ec;
  background: #f7fafc;
}

.informacion-cabecera {
  min-width: 0;
}

.titulo-caso {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;

  margin-bottom: 5px;
  gap: 6px;
}

.titulo-caso span {
  color: #15232d;

  font-size: 20px;
  font-weight: 600;
}

.titulo-caso h1 {
  margin: 0;

  color: #197da6;

  font-size: 22px;
  font-weight: 750;
}

.descripcion-caso {
  max-width: 900px;
  margin: 0;

  color: #667780;

  font-size: 14px;
  line-height: 1.4;
}

.avatar-paciente {
  display: flex;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  align-items: center;
  justify-content: center;

  border: 3px solid #29363d;
  border-radius: 50%;

  font-size: 27px;
}

/* Zona de mensajes */

.mensajes {
  flex: 1;
  min-height: 0;

  overflow-x: hidden;
  overflow-y: auto;

  padding: 28px 24px;

  background: #ffffff;

  scrollbar-gutter: stable;
}

.fila-mensaje {
  display: flex;
  max-width: 72%;
  align-items: flex-end;

  margin-bottom: 24px;
  gap: 10px;
}

.fila-mensaje.alumno {
  margin-left: auto;
  flex-direction: row-reverse;
}

.avatar-mensaje {
  display: flex;
  width: 31px;
  height: 31px;
  flex: 0 0 31px;
  align-items: center;
  justify-content: center;

  border-radius: 50%;

  color: #476273;
  background: #dde8ee;

  font-size: 11px;
  font-weight: 700;
}

.alumno .avatar-mensaje {
  color: white;
  background: #1f79b5;
}

.contenido-mensaje {
  min-width: 0;
}

.burbuja {
  margin: 0;
  padding: 15px 18px;

  border-radius: 16px;

  color: #31414b;
  background: #edf1f6;

  line-height: 1.5;
  overflow-wrap: anywhere;
}

.alumno .burbuja {
  color: white;
  background: #15a9df;
}

.hora {
  display: block;

  margin-top: 5px;

  color: #9aa8b0;

  font-size: 11px;
}

.alumno .hora {
  text-align: right;
}

.escribiendo {
  color: #72818a;

  font-size: 14px;
  font-style: italic;
}

/* Zona de escritura */

.contenedor-escritura {
  position: relative;

  flex-shrink: 0;

  padding-top: 10px;

  border-top: 1px solid #d0dade;
  background: white;
}

.zona-escritura {
  display: flex;
  flex-shrink: 0;

  padding: 6px 16px 16px;
  gap: 12px;

  background: white;
}

.zona-escritura textarea {
  flex: 1;

  min-height: 52px;
  max-height: 120px;

  padding: 15px 17px;

  resize: none;

  border: 1px solid #cdd9df;
  border-radius: 12px;
  outline: none;

  background: white;

  font: inherit;
}

.zona-escritura textarea:focus {
  border-color: #16a9df;
}

.zona-escritura textarea:disabled {
  cursor: not-allowed;

  color: #78878f;
  background: #f1f4f6;
}

.zona-escritura button {
  width: 55px;

  border: none;
  border-radius: 12px;

  color: white;
  background: #16a9df;

  font-size: 23px;

  cursor: pointer;
}

.zona-escritura button:hover:not(:disabled) {
  background: #078fc1;
}

.zona-escritura button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Avisos de mensajes */

.aviso-mensajes,
.aviso-limite {
  margin: 0 16px 8px;
  padding: 12px 16px;

  border-radius: 10px;

  text-align: center;

  font-size: 14px;
  font-weight: 700;
}

.aviso-mensajes {
  border: 1px solid #ef4444;

  color: #991b1b;
  background: #fee2e2;
}

.aviso-limite {
  border: 1px solid #dc2626;

  color: #7f1d1d;
  background: #fecaca;
}

.aviso-enter-active,
.aviso-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.aviso-enter-from,
.aviso-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* Panel lateral */

.panel-lateral {
  min-height: 0;

  padding: 16px 18px;

  overflow-x: hidden;
  overflow-y: auto;

  background: #d8f4ff;

  scrollbar-gutter: stable;
}

.panel-informacion {
  margin-bottom: 14px;
  padding: 16px 18px;

  border-radius: 16px;

  background: white;
}

.panel-informacion h2 {
  margin: 0 0 12px;

  color: #26353e;

  font-size: 14px;
  text-transform: uppercase;
}

.panel-informacion p {
  margin-top: 0;

  color: #596a74;

  font-size: 13px;
  line-height: 1.4;
}

.panel-informacion p:last-child {
  margin-bottom: 0;
}

.panel-etica {
  border-left: 4px solid #17abd2;
}

.panel-etica p {
  margin-bottom: 9px;
}

.panel-mensajes-restantes {
  text-align: center;

  transition:
    border-color 0.25s ease,
    background 0.25s ease;
}

.panel-mensajes-restantes.pocos {
  border: 2px solid #f0a929;
  background: #fffaf0;
}

.panel-mensajes-restantes.agotado {
  border: 2px solid #ef5050;
  background: #fff1f1;
}

.contador-mensajes {
  display: flex;
  align-items: baseline;
  justify-content: center;

  margin-bottom: 8px;
  gap: 6px;
}

.contador-mensajes strong {
  color: #197da6;

  font-size: 35px;
  line-height: 1;
}

.contador-mensajes span {
  color: #596a74;

  font-size: 14px;
}

.panel-mensajes-restantes.pocos
  .contador-mensajes
  strong {
  color: #d98a00;
}

.panel-mensajes-restantes.agotado
  .contador-mensajes
  strong {
  color: #d62f2f;
}

/* Temporizador y botón */

.temporizador {
  display: flex;
  align-items: center;
  justify-content: center;

  margin: 18px 0 14px;
  gap: 10px;

  color: #111;

  font-size: 27px;
}

.reloj {
  font-size: 32px;
}

.boton-finalizar {
  display: block;

  width: 100%;

  padding: 15px;

  border: none;
  border-radius: 18px;

  color: #111;
  background: #ef5050;

  font-size: 18px;
  font-weight: 800;

  cursor: pointer;
}

.boton-finalizar:hover {
  background: #df4141;
}

/* Modal */

.modal-overlay {
  position: fixed;
  z-index: 1000;
  inset: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  width: 100vw;
  height: 100vh;

  background: rgba(0, 0, 0, 0.4);

  backdrop-filter: blur(4px);
}

.modal-content {
  position: relative;

  width: min(400px, calc(100vw - 40px));

  padding: 30px 40px;

  border-radius: 12px;

  background: white;

  text-align: center;

  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.close-btn {
  position: absolute;
  top: 15px;
  right: 15px;

  border: none;

  color: #6b7280;
  background: none;

  font-size: 18px;

  cursor: pointer;
}

.modal-content h2 {
  margin-bottom: 12px;

  color: #1f2937;
}

.modal-content p {
  margin-bottom: 24px;

  color: #4b5563;

  font-size: 15px;
  line-height: 1.5;
}

.modal-buttons {
  display: flex;
  justify-content: center;

  gap: 15px;
}

.btn-cancelar {
  padding: 10px 20px;

  border: 1px solid #d1dbe3;
  border-radius: 8px;

  color: #374151;
  background: #f3f4f6;

  font-weight: bold;

  cursor: pointer;
}

.btn-aceptar {
  padding: 10px 20px;

  border: none;
  border-radius: 8px;

  color: white;
  background: #38bdf8;

  font-weight: bold;

  cursor: pointer;
}

.btn-aceptar:hover {
  background: #0284c7;
}

.loader-container {
  display: flex;
  justify-content: center;

  margin-top: 20px;
}

.spinner {
  width: 40px;
  height: 40px;

  border: 4px solid #e5e7eb;
  border-top-color: #38bdf8;
  border-radius: 50%;

  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* Diseño adaptable */

@media (max-width: 900px) {
  .pagina-conversacion {
    grid-template-columns: 1fr;

    height: auto;
    min-height: calc(100vh - 88px);

    overflow: visible;
  }

  .zona-chat {
    min-height: 75vh;

    overflow: visible;

    border-right: none;
  }

  .mensajes {
    max-height: 65vh;

    overflow-y: auto;
  }

  .panel-lateral {
    overflow: visible;

    border-top: 2px solid #85929b;
  }

  .fila-mensaje {
    max-width: 88%;
  }
}

@media (max-width: 560px) {
  .cabecera-chat {
    min-height: auto;
    align-items: flex-start;

    padding: 14px 16px;
  }

  .titulo-caso span,
  .titulo-caso h1 {
    font-size: 18px;
  }

  .descripcion-caso {
    font-size: 13px;
  }

  .mensajes {
    padding: 20px 14px;
  }

  .fila-mensaje {
    max-width: 94%;
  }

  .modal-content {
    padding: 28px 22px;
  }

  .modal-buttons {
    flex-direction: column;
  }

  .btn-cancelar,
  .btn-aceptar {
    width: 100%;
  }
}
</style>