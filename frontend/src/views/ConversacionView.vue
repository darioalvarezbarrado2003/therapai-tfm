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
const MENSAJE_OCULTO_INICIAL = '[El terapeuta acaba de entrar a la consulta y se sienta en silencio. Inicia tú la conversación como paciente con una frase natural para romper el hielo, actuando estrictamente según tu trastorno y tu estado de ánimo.]'

const trastornoSeleccionado = computed(() => route.params.trastorno)
const mostrarModal = ref(false)
const guardandoSesion = ref(false)


const configuraciones = {
  depresion: {
    nombre: 'Depresión mayor',
    etiqueta: 'Depresión',
    descripcion:
      'Perfil simulado caracterizado por baja energía, anhedonia, sentimientos de culpa y reticencia inicial.',
    objetivos: [
      'Practicar escucha activa.',
      'Fomentar la validación emocional.',
      'Evitar presionar al paciente con soluciones rápidas.'
    ],
    mensajeInicial:
      'Hola... no sé muy bien por qué estoy aquí. Últimamente no tengo ganas de hacer nada. Me cuesta incluso levantarme de la cama por las mañanas.'
  },

  ansiedad: {
    nombre: 'Trastorno de ansiedad',
    etiqueta: 'Ansiedad',
    descripcion:
      'Perfil simulado caracterizado por preocupación persistente, tensión y anticipación negativa.',
    objetivos: [
      'Transmitir calma y seguridad.',
      'Explorar las preocupaciones del paciente.',
      'Evitar reforzar pensamientos catastróficos.'
    ],
    mensajeInicial:
      'No consigo dejar de preocuparme. Siento que en cualquier momento puede pasar algo malo, aunque realmente no sé explicar qué.'
  },

  disruptivo: {
    nombre: 'Trastorno disruptivo',
    etiqueta: 'Disruptivos',
    descripcion:
      'Perfil desafiante, irritable y poco colaborador, con resistencia ante las preguntas del estudiante.',
    objetivos: [
      'Mantener una comunicación asertiva.',
      'Establecer límites adecuados.',
      'No reaccionar emocionalmente ante provocaciones.'
    ],
    mensajeInicial:
      'No sé para qué me han obligado a venir aquí. No tengo ningún problema y no pienso contarle mi vida a nadie.'
  }
}

const casoActual = computed(() => {
  return configuraciones[trastornoSeleccionado.value]
})

const mensajes = ref([])
const nuevoMensaje = ref('')
const escribiendo = ref(false)
const chatContainer = ref(null)

const segundos = ref(0)
let intervalo = null

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
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

async function enviarMensaje() {
  const texto = nuevoMensaje.value.trim()

  if (!texto || escribiendo.value) {
    return
  }

  // 1. Guardamos el mensaje del alumno en la interfaz
  mensajes.value.push({
    autor: 'alumno',
    contenido: texto,
    hora: obtenerHora()
  })

  nuevoMensaje.value = ''
  escribiendo.value = true
  await desplazarAlFinal()

  try {
    // 2. Preparar historial para Anthropic
    const historialParaAPI = []
    
    // TRUCO VITAL: Anthropic OBLIGA a que el primer mensaje sea del 'user'.
    // Añadimos un mensaje inicial invisible para cumplir la regla.
    historialParaAPI.push({
      role: 'user',
      content: 'Hola, toma asiento por favor. Soy el terapeuta y vamos a comenzar la sesión.'
    })

    // Ahora añadimos el resto del historial real de la pantalla
    mensajes.value.forEach(msg => {
      historialParaAPI.push({
        role: msg.autor === 'alumno' ? 'user' : 'assistant',
        content: msg.contenido
      })
    })

    // 3. Disparamos la petición HTTP al backend
    const response = await fetch('https://therapai-tfm.onrender.com/api/simulacion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        trastorno: trastornoSeleccionado.value, 
        historial: historialParaAPI 
      })
    })

    if (!response.ok) {
      throw new Error('Error al comunicar con el backend')
    }

    const data = await response.json()

    // 4. Mostramos la respuesta real de la Inteligencia Artificial
    mensajes.value.push({
      autor: 'paciente',
      contenido: data.respuesta,
      hora: obtenerHora()
    })

  } catch (error) {
    console.error("Error en la simulación:", error)
    // Este es el mensaje que salta si algo falla (¡No es un placeholder!)
    mensajes.value.push({
      autor: 'paciente',
      contenido: "[Error de conexión: No he podido formular una respuesta. Comprueba que el backend está encendido y prueba de nuevo.]",
      hora: obtenerHora()
    })
  } finally {
    // 5. Apagamos el estado de "escribiendo"
    escribiendo.value = false
    await desplazarAlFinal()
  }
}

async function iniciarConversacion() {
  escribiendo.value = true // Muestra el "escribiendo..." al entrar

  try {
    // El "empujón" invisible para que Claude hable primero cumpliendo sus reglas
    const historialParaAPI = [{
      role: 'user',
      content: MENSAJE_OCULTO_INICIAL
    }]

    const response = await fetch('https://therapai-tfm.onrender.com/api/simulacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trastorno: trastornoSeleccionado.value,
        historial: historialParaAPI
      })
    })

    if (!response.ok) throw new Error('Error al conectar con la IA')

    const data = await response.json()

    // Mostramos la primera frase 100% original generada por Claude
    mensajes.value.push({
      autor: 'paciente',
      contenido: data.respuesta,
      hora: obtenerHora()
    })

  } catch (error) {
    console.error("Error al iniciar:", error)
    mensajes.value.push({
      autor: 'paciente',
      contenido: "⚠️ [El paciente virtual no ha podido entrar a la sala. Revisa el backend.]",
      hora: obtenerHora()
    })
  } finally {
    escribiendo.value = false
  }
}

// Función para abrir el modal al pulsar el botón rojo
function abrirModalFinalizar() {
  mostrarModal.value = true
}

// Función para cerrar el modal si se arrepiente
function cerrarModal() {
  if (!guardandoSesion.value) {
    mostrarModal.value = false
  }
}

// La función real que llama al backend
async function confirmarFinalizarSesion() {
  guardandoSesion.value = true // Muestra el spinner y bloquea clics
  clearInterval(intervalo)
  
  // OJO: Comprueba que 'usuario' es la clave correcta de tu login
  const usuarioRaw = localStorage.getItem('usuario')
  const usuarioInfo = usuarioRaw ? JSON.parse(usuarioRaw) : { _id: 'id_demo_alumno', idp: 'id_demo_profesor' }

  const historialParaEvaluar = mensajes.value.map(msg => ({
    role: msg.autor === 'alumno' ? 'user' : 'assistant',
    content: msg.contenido
  }))

  try {
    const response = await fetch('https://therapai-tfm.onrender.com/api/evaluacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_alumno: usuarioInfo._id, // Si esto falla, revisa si tu JSON usa ._id o .id
        id_profesor: usuarioInfo.idp || 'profesor_demo',
        trastorno: trastornoSeleccionado.value,
        historial: historialParaEvaluar
      })
    })

    if (!response.ok) throw new Error('Error al guardar la sesión')

    // Éxito -> Redirigimos
    router.push('/mi-historial')

  } catch (error) {
    console.error("Error al finalizar la sesión:", error)
    alert("Hubo un problema al evaluar la transcripción.")
    guardandoSesion.value = false
    mostrarModal.value = false
  }
}

onMounted(() => {
  if (!casoActual.value) {
    router.replace('/simulacion')
    return
  }

  // Arrancamos el cronómetro de la sesión
  intervalo = setInterval(() => {
    segundos.value++
  }, 1000)

  // Disparamos la IA para que genere el primer mensaje
  iniciarConversacion()
})

onUnmounted(() => {
  clearInterval(intervalo)
})
</script>

<template>
  <main v-if="casoActual" class="pagina-conversacion">
    <section class="zona-chat">
      <header class="cabecera-chat">
        <div class="avatar-paciente">
          <span>♙</span>
        </div>

        <div>
          <h1>Paciente virtual</h1>
          <p>{{ casoActual.etiqueta }}</p>
        </div>
      </header>

      <section ref="chatContainer" class="mensajes">
        <article
          v-for="(mensaje, index) in mensajes"
          :key="index"
          class="fila-mensaje"
          :class="mensaje.autor"
        >
          <div class="avatar-mensaje">
            {{ mensaje.autor === 'alumno' ? 'CF' : 'P' }}
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

        <p v-if="escribiendo" class="escribiendo">
          El paciente está escribiendo...
        </p>
      </section>

      <form class="zona-escritura" @submit.prevent="enviarMensaje">
        <textarea
          v-model="nuevoMensaje"
          placeholder="Escribe tu intervención terapéutica aquí..."
          rows="1"
          :disabled="escribiendo"
          @keydown.enter.exact.prevent="enviarMensaje"
        />

        <button
          type="submit"
          :disabled="!nuevoMensaje.trim() || escribiendo"
          aria-label="Enviar mensaje"
        >
          ➤
        </button>
      </form>
    </section>

    <aside class="panel-lateral">
      <section class="panel-informacion">
        <h2>Caso clínico</h2>

        <span class="etiqueta-caso">
          {{ casoActual.nombre }}
        </span>

        <p>
          {{ casoActual.descripcion }}
        </p>
      </section>

      <section class="panel-informacion">
        <h2>Objetivos pedagógicos</h2>

        <ul>
          <li
            v-for="objetivo in casoActual.objetivos"
            :key="objetivo"
          >
            {{ objetivo }}
          </li>
        </ul>
      </section>

      <div class="temporizador">
        <span class="reloj">◷</span>
        <strong>{{ tiempoFormateado }}</strong>
      </div>

      <button
        type="button"
        class="boton-finalizar"
        @click="abrirModalFinalizar"
      >
        Finalizar sesión
      </button>



    </aside>


  <div v-if="mostrarModal" class="modal-overlay">
      <div class="modal-content">
        <button v-if="!guardandoSesion" class="close-btn" @click="cerrarModal">✖</button>
        
        <h2 v-if="!guardandoSesion">Finalizar sesión</h2>
        <h2 v-else>Evaluando sesión...</h2>

        <p v-if="!guardandoSesion">¿Seguro que quieres terminar la consulta y enviar la transcripción al juez evaluador?</p>
        <p v-else>La inteligencia artificial está analizando tus competencias. Por favor, no cierres esta ventana (puede tardar unos 15 segundos).</p>

        <div class="modal-buttons" v-if="!guardandoSesion">
          <button class="btn-cancelar" @click="cerrarModal">Cancelar</button>
          <button class="btn-aceptar" @click="confirmarFinalizarSesion">Aceptar</button>
        </div>
        
        <div class="loader-container" v-else>
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

  /* La cabecera principal mide 88px */
  height: calc(100vh - 88px);
  min-height: 0;

  background: #f7fafc;
  overflow: hidden;
}

.zona-chat {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;

  border-right: 2px solid #85929b;
  overflow: hidden;
}

.cabecera-chat {
  flex-shrink: 0;
}

.mensajes {
  flex: 1;
  min-height: 0;

  overflow-y: auto;
  overflow-x: hidden;

  padding: 28px 24px;
  background: #ffffff;

  scrollbar-gutter: stable;
}

.zona-escritura {
  flex-shrink: 0;
}

.cabecera-chat h1 {
  margin: 0;
  color: #15232d;
  font-size: 24px;
  font-weight: 600;
}

.cabecera-chat p {
  margin: 4px 0 0;
  color: #667780;
  font-size: 14px;
}

.avatar-paciente {
  display: flex;
  width: 46px;
  height: 46px;
  align-items: center;
  justify-content: center;
  border: 3px solid #29363d;
  border-radius: 50%;
  font-size: 27px;
}

.mensajes {
  flex: 1;
  overflow-y: auto;
  padding: 28px 24px;
  background: #ffffff;
}

.fila-mensaje {
  display: flex;
  align-items: flex-end;
  max-width: 72%;
  margin-bottom: 24px;
  gap: 10px;
}

.fila-mensaje.alumno {
  margin-left: auto;
  flex-direction: row-reverse;
}

.avatar-mensaje {
  display: flex;
  flex: 0 0 31px;
  width: 31px;
  height: 31px;
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

.zona-escritura {
  display: flex;
  padding: 16px;
  gap: 12px;
  background: white;
  border-top: 1px solid #d0dade;
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
  font: inherit;
}

.zona-escritura textarea:focus {
  border-color: #16a9df;
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

.zona-escritura button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.panel-lateral {
  min-height: 0;
  padding: 20px 22px;

  overflow-y: auto;
  overflow-x: hidden;

  background: #d8f4ff;
  scrollbar-gutter: stable;
}

.panel-informacion {
  margin-bottom: 16px;
  padding: 20px;
  border-radius: 18px;
  background: white;
}

.panel-informacion h2 {
  margin: 0 0 14px;
  color: #26353e;
  font-size: 14px;
  text-transform: uppercase;
}

.panel-informacion p,
.panel-informacion li {
  color: #596a74;
  font-size: 14px;
  line-height: 1.5;
}

.etiqueta-caso {
  display: inline-block;
  margin-bottom: 14px;
  padding: 7px 12px;
  border-radius: 20px;
  color: #197da6;
  background: #d7f1fc;
  font-weight: 700;
}

.panel-informacion ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.panel-informacion li {
  position: relative;
  margin-bottom: 10px;
  padding-left: 22px;
}

.panel-informacion li::before {
  position: absolute;
  left: 0;
  color: #17abd2;
  content: "✓";
  font-weight: 800;
}

.temporizador {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 25px 0 18px;
  gap: 10px;
  color: #111;
  font-size: 31px;
}

.reloj {
  font-size: 37px;
}

.boton-finalizar {
  display: block;
  width: 100%;
  padding: 17px;
  border: none;
  border-radius: 20px;
  color: #111;
  background: #ef5050;
  font-size: 20px;
  font-weight: 800;
  cursor: pointer;
}

.boton-finalizar:hover {
  background: #df4141;
}

@media (max-width: 900px) {
  .pagina-conversacion {
    grid-template-columns: 1fr;
    height: auto;
    min-height: calc(100vh - 88px);
    overflow: visible;
  }

  .zona-chat {
    min-height: 75vh;
    border-right: none;
    overflow: visible;
  }

  .mensajes {
    max-height: 65vh;
    overflow-y: auto;
  }

  .panel-lateral {
    border-top: 2px solid #85929b;
    overflow: visible;
  }

  .fila-mensaje {
    max-width: 88%;
  }
}

/* Estilos del Modal */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px); /* El efecto difuminado que pedías */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px 40px;
  border-radius: 12px;
  width: 400px;
  text-align: center;
  position: relative;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}

.close-btn {
  position: absolute;
  top: 15px; right: 15px;
  background: none; border: none; font-size: 18px; cursor: pointer; color: #6b7280;
}

.modal-content h2 { margin-bottom: 12px; color: #1f2937; }
.modal-content p { margin-bottom: 24px; color: #4b5563; font-size: 15px; line-height: 1.5; }

.modal-buttons {
  display: flex; gap: 15px; justify-content: center;
}

.btn-cancelar {
  padding: 10px 20px; border-radius: 8px; border: 1px solid #d1dbe3;
  background: #f3f4f6; color: #374151; font-weight: bold; cursor: pointer;
}

.btn-aceptar {
  padding: 10px 20px; border-radius: 8px; border: none;
  background: #38bdf8; color: white; font-weight: bold; cursor: pointer;
}

.btn-aceptar:hover { background: #0284c7; }

/* Animación de carga */
.loader-container {
  display: flex; justify-content: center; margin-top: 20px;
}
.spinner {
  width: 40px; height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #38bdf8;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }



</style>