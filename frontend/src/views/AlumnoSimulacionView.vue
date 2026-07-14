<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"

import fotoDepresion from "../assets/img_depresion.png"
import fotoAnsiedad from "../assets/img_ansiedad.png"
import fotoDisruptivo from "../assets/img_disruptivo.png"

const router = useRouter()

const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"))

const usuario = ref({
  nombreCorto: usuarioGuardado?.nombre?.split(" ")[0] || "Alumno"
})

const pacientes = [
  {
    id: 1,
    trastorno: "depresion",
    nombre: "Depresión",
    imagen: fotoDepresion,
    alt: "Paciente virtual de depresión",
    tagClass: "tag-depresion",
    descripcion:
      "Simulación de un perfil con trastorno depresivo. Práctica de validación emocional, empatía y escucha activa sin generar presión."
  },
  {
    id: 2,
    trastorno: "ansiedad",
    nombre: "Ansiedad",
    imagen: fotoAnsiedad,
    alt: "Paciente virtual de ansiedad",
    tagClass: "tag-ansiedad",
    descripcion:
      "Agente parametrizado para mostrar agitación y preocupación. Evaluación de capacidad de contención y reducción de ansiedad."
  },
  {
    id: 3,
    trastorno: "disruptivo",
    nombre: "Disruptivos",
    imagen: fotoDisruptivo,
    alt: "Paciente virtual de trastornos disruptivos",
    tagClass: "tag-disruptivos",
    descripcion:
      "Perfil desafiante y poco colaborador. Reta al estudiante a establecer límites, mantener asertividad y no ceder ante provocaciones."
  }
]

function iniciarSimulacion(paciente) {
  router.push({
    name: "conversacion",
    params: {
      trastorno: paciente.trastorno
    }
  })
}
</script>

<template>
  <main class="view">
    <section class="content">
      <header class="welcome-section">
        <div class="welcome-text">
          <h1 class="welcome-title">
            Hola, {{ usuario.nombreCorto }}
          </h1>

          <p class="subtitle">
            Selecciona un paciente virtual para comenzar tu entrenamiento
            terapéutico de hoy.
          </p>
        </div>

        <div class="platform-features">
          <div class="feature">
            <strong>3</strong>
            <span>Casos clínicos</span>
          </div>

          <div class="feature">
            <strong>IA</strong>
            <span>Pacientes virtuales</span>
          </div>

          <div class="feature">
            <strong>✓</strong>
            <span>Evaluación automática</span>
          </div>
        </div>
      </header>

      <section class="cards">
        <article
          v-for="paciente in pacientes"
          :key="paciente.id"
          class="card"
          tabindex="0"
          role="button"
          @click="iniciarSimulacion(paciente)"
          @keydown.enter="iniciarSimulacion(paciente)"
          @keydown.space.prevent="iniciarSimulacion(paciente)"
        >
          <div class="image-wrapper">
            <img
              :src="paciente.imagen"
              :alt="paciente.alt"
              class="card-image"
            />

            <span class="image-label">
              Paciente virtual
            </span>
          </div>

          <div class="card-body">
            <div
              class="tag"
              :class="paciente.tagClass"
            >
              {{ paciente.nombre }}
            </div>

            <p class="card-text">
              {{ paciente.descripcion }}
            </p>

            <div class="card-details">
              <span>Sesión interactiva</span>
              <span>Feedback posterior</span>
            </div>

            <div class="start-button">
              <span>Iniciar simulación</span>
              <span class="button-arrow">→</span>
            </div>
          </div>
        </article>
      </section>
    </section>
  </main>
</template>

<style scoped>
.view {
  position: relative;
  min-height: calc(100vh - 88px);
  display: flex; 
  align-items: center; 
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
  width: 420px;
  height: 420px;
  right: -120px;
  bottom: -160px;
  border-radius: 50%;
  background: rgba(56, 189, 248, 0.08);
  filter: blur(10px);
  pointer-events: none;
}

.content {
  position: relative;
  z-index: 1;
  width: min(1150px, calc(100% - 60px));
  margin: 0 auto;
  padding: 20px 0; 
  box-sizing: border-box;
}

/* CABECERA */
.welcome-section {
  margin-bottom: 36px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 30px;
}

.welcome-text {
  min-width: 0;
}

.welcome-title {
  margin: 0 0 8px;
  color: #1a2b3c; 
  font-size: clamp(32px, 3.5vw, 44px);
  line-height: 1.1;
  font-weight: 700; 
  letter-spacing: -0.02em; 
}

.subtitle {
  max-width: 700px;
  margin: 0;
  color: #64748b;
  font-size: clamp(16px, 1.25vw, 18px);
  line-height: 1.45;
  font-weight: 500; 
}


.platform-features {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
}

.feature {
  min-width: 100px;
  padding: 10px 14px;
  border: 1px solid rgba(213, 229, 238, 0.95);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 9px 24px rgba(37, 91, 142, 0.08);
  backdrop-filter: blur(10px);
  text-align: center;
}

.feature strong {
  display: block;
  margin-bottom: 2px;
  color: #1689bd;
  font-size: 18px;
  font-weight: 900;
}

.feature span {
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}


.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(260px, 1fr));
  gap: 24px;
  align-items: stretch;
}

.card {
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(210, 226, 235, 0.95);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow:
    0 10px 24px rgba(31, 78, 124, 0.08),
    0 2px 6px rgba(31, 78, 124, 0.04);
  backdrop-filter: blur(8px);
  cursor: pointer;
  outline: none;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

.card:hover,
.card:focus-visible {
  border-color: #38bdf8;
  box-shadow: 0 14px 32px rgba(31, 121, 181, 0.14);
  transform: translateY(-6px);
}

/* IMÁGENES */
.image-wrapper {
  position: relative;
  height: 180px;
  overflow: hidden;
  background: #eaf6fb;
}

.card-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transition: transform 0.35s ease;
}

.card:hover .card-image {
  transform: scale(1.04);
}

.image-label {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 5px 10px;
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(8px);
  color: #24465f;
  font-size: 11px;
  font-weight: 800;
}


.card-body {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.tag {
  align-self: flex-start;
  min-width: 110px;
  margin-bottom: 14px;
  padding: 6px 14px;
  border-radius: 999px;
  box-sizing: border-box;
  text-align: center;
  font-size: 14px;
  font-weight: 900;
}

.tag-depresion {
  color: #397a91;
  background: #d8eef5;
}

.tag-ansiedad {
  color: #146e68;
  background: #7ce1d8;
}

.tag-disruptivos {
  color: #97423b;
  background: #ffc1b9;
}

.card-text {
  flex: 1;
  margin: 0 0 18px;
  color: #344454;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
}

.card-details {
  margin-bottom: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.card-details span {
  padding: 5px 8px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}

.card-details span::before {
  margin-right: 4px;
  color: #0ea5e9;
  content: "✓";
  font-weight: 900;
}


.start-button {
  min-height: 42px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 10px;
  background: linear-gradient(135deg, #19afe6, #2584c2);
  box-shadow: 0 5px 12px rgba(37, 132, 194, 0.15);
  color: #ffffff;
  font-size: 14px;
  font-weight: 900;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.card:hover .start-button {
  box-shadow: 0 8px 18px rgba(37, 132, 194, 0.25);
  transform: translateY(-2px);
}

.button-arrow {
  font-size: 20px;
  line-height: 1;
}


@media (max-width: 992px) {
  .content {
    width: min(100% - 40px, 850px);
  }

  .welcome-section {
    align-items: flex-start;
    flex-direction: column;
  }

  .cards {
    grid-template-columns: repeat(2, minmax(260px, 1fr));
  }
}


@media (max-width: 600px) {
  .view {
    align-items: flex-start;
    overflow-y: auto;
  }

  .content {
    width: calc(100% - 24px);
    padding: 24px 0 40px;
  }

  .welcome-section {
    margin-bottom: 24px;
  }

  .platform-features {
    width: 100%;
    padding-bottom: 5px;
    overflow-x: auto;
  }

  .cards {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .image-wrapper {
    height: 160px;
  }
}
</style>

```