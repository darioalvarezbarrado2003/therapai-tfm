<script setup>
import { ref, onMounted, computed } from "vue"
import { authState } from "../authStore"

const nuevoAlumno = ref({
  nombre: "",
  email: "",
  password: ""
})

const alumnos = ref([])
const ordenAlumnos = ref("reciente")
const errorMsg = ref("")
const successMsg = ref("")
const cargando = ref(false)

const alumnoEditando = ref(null)

const alumnoAEliminar = ref(null)
const eliminandoAlumno = ref(false)
const deleteErrorMsg = ref("")

const editarForm = ref({
  nombre: "",
  email: "",
  password: ""
})

const editErrorMsg = ref("")
const editSuccessMsg = ref("")

async function cargarAlumnos() {
  try {
    errorMsg.value = ""
    cargando.value = true

    const idProfesor = authState.usuario?._id

    if (!idProfesor) {
      throw new Error("No se ha encontrado el ID del profesor.")
    }

    const response = await fetch(
      `https://therapai-tfm.onrender.com/api/profesores/${idProfesor}/alumnos`
    )

    if (!response.ok) {
      const errorData = await response.json()

      throw new Error(
        errorData.detail || "No se han podido cargar los alumnos."
      )
    }

    alumnos.value = await response.json()
  } catch (error) {
    errorMsg.value = error.message
    console.error("Error cargando alumnos:", error)
  } finally {
    cargando.value = false
  }
}

async function registrarAlumno() {
  try {
    errorMsg.value = ""
    successMsg.value = ""

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

    if (!passwordRegex.test(nuevoAlumno.value.password)) {
      throw new Error(
        "La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número."
      )
    }

    const idProfesor = authState.usuario?._id

    if (!idProfesor) {
      throw new Error("No se ha encontrado el ID del profesor.")
    }

    const response = await fetch(
      "https://therapai-tfm.onrender.com/api/alumnos",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre: nuevoAlumno.value.nombre,
          email: nuevoAlumno.value.email,
          password: nuevoAlumno.value.password,
          rol: "alumno",
          idp: idProfesor
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json()

      throw new Error(
        errorData.detail || "No se ha podido registrar el alumno."
      )
    }

    const alumnoCreado = await response.json()

    alumnos.value.push(alumnoCreado)

    nuevoAlumno.value = {
      nombre: "",
      email: "",
      password: ""
    }

    successMsg.value = "Alumno registrado correctamente."
  } catch (error) {
    errorMsg.value = error.message
    console.error("Error registrando alumno:", error)
  }
}

function abrirModalEliminar(alumno) {
  alumnoAEliminar.value = alumno
  deleteErrorMsg.value = ""
}

function cerrarModalEliminar() {
  if (eliminandoAlumno.value) {
    return
  }

  alumnoAEliminar.value = null
  deleteErrorMsg.value = ""
}

async function confirmarEliminarAlumno() {
  if (!alumnoAEliminar.value?._id) {
    return
  }

  try {
    eliminandoAlumno.value = true
    deleteErrorMsg.value = ""
    errorMsg.value = ""
    successMsg.value = ""

    const idAlumno = alumnoAEliminar.value._id

    const response = await fetch(
      `https://therapai-tfm.onrender.com/api/alumnos/${idAlumno}`,
      {
        method: "DELETE"
      }
    )

    if (!response.ok) {
      const errorData = await response.json()

      throw new Error(
        errorData.detail ||
          "No se ha podido eliminar el alumno."
      )
    }

    alumnos.value = alumnos.value.filter(
      alumno => alumno._id !== idAlumno
    )

    alumnoAEliminar.value = null
    successMsg.value = "Alumno eliminado correctamente."
  } catch (error) {
    deleteErrorMsg.value = error.message
    console.error("Error eliminando alumno:", error)
  } finally {
    eliminandoAlumno.value = false
  }
}

function editarAlumno(alumno) {
  alumnoEditando.value = alumno

  editarForm.value = {
    nombre: alumno.nombre,
    email: alumno.email,
    password: ""
  }

  editErrorMsg.value = ""
  editSuccessMsg.value = ""
}

function cerrarModalEdicion() {
  alumnoEditando.value = null

  editarForm.value = {
    nombre: "",
    email: "",
    password: ""
  }

  editErrorMsg.value = ""
  editSuccessMsg.value = ""
}

async function guardarCambiosAlumno() {
  try {
    editErrorMsg.value = ""
    editSuccessMsg.value = ""

    if (!alumnoEditando.value?._id) {
      throw new Error("No se ha encontrado el alumno a editar.")
    }

    if (editarForm.value.password.trim() !== "") {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

      if (!passwordRegex.test(editarForm.value.password)) {
        throw new Error(
          "La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número."
        )
      }
    }

    const response = await fetch(
      `https://therapai-tfm.onrender.com/api/alumnos/${alumnoEditando.value._id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre: editarForm.value.nombre,
          email: editarForm.value.email,
          password: editarForm.value.password
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json()

      throw new Error(
        errorData.detail || "No se han podido guardar los cambios."
      )
    }

    const alumnoActualizado = await response.json()

    const index = alumnos.value.findIndex(
      alumno => alumno._id === alumnoActualizado._id
    )

    if (index !== -1) {
      alumnos.value[index] = alumnoActualizado
    }

    cerrarModalEdicion()
  } catch (error) {
    editErrorMsg.value = error.message
    console.error("Error editando alumno:", error)
  }
}

function obtenerInicial(nombre) {
  return nombre?.trim()?.charAt(0)?.toUpperCase() || "A"
}

const alumnosOrdenados = computed(() => {
  const copia = [...alumnos.value]

  if (ordenAlumnos.value === "az") {
    return copia.sort((a, b) =>
      a.nombre.localeCompare(b.nombre)
    )
  }

  if (ordenAlumnos.value === "za") {
    return copia.sort((a, b) =>
      b.nombre.localeCompare(a.nombre)
    )
  }

  if (ordenAlumnos.value === "antiguo") {
    return copia.sort((a, b) =>
      a._id.localeCompare(b._id)
    )
  }

  return copia.sort((a, b) =>
    b._id.localeCompare(a._id)
  )
})

onMounted(() => {
  cargarAlumnos()
})
</script>

<template>
  <main class="classroom-view">
    <section class="classroom-layout">
      <section class="students-zone">
        <div class="title-block">
          <h1>Mi aula</h1>

          <p>
            Gestiona los alumnos asociados a tu perfil docente.
          </p>

          <span>Forma, registra, supervisa.</span>
        </div>

        <div class="list-toolbar">
          <label for="ordenAlumnos">
            Ordenar por
          </label>

          <select
            id="ordenAlumnos"
            v-model="ordenAlumnos"
            class="sort-select"
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

        <div class="students-list">
          <p
            v-if="cargando"
            class="empty-message"
          >
            Cargando alumnos...
          </p>

          <article
            v-for="alumno in alumnosOrdenados"
            :key="alumno._id"
            class="student-row"
          >
            <div class="student-avatar">
              {{ obtenerInicial(alumno.nombre) }}
            </div>

            <div class="student-info">
              <h2>
                {{ alumno.nombre }}
              </h2>

              <p>
                {{ alumno.email }}
              </p>
            </div>

            <div class="student-actions">
              <button
                type="button"
                class="icon-btn"
                title="Editar alumno"
                @click="editarAlumno(alumno)"
              >
                ✎
              </button>

              <button
                type="button"
                class="icon-btn delete"
                title="Eliminar alumno"
                @click="abrirModalEliminar(alumno)"
              >
                🗑
              </button>
            </div>
          </article>

          <p
            v-if="!cargando && alumnos.length === 0"
            class="empty-message"
          >
            Todavía no tienes alumnos registrados.
          </p>
        </div>
      </section>

      <aside class="register-zone">
        <form
          class="student-form"
          @submit.prevent="registrarAlumno"
        >
          <div class="register-card">
            <h2>
              Nuevo alumno
            </h2>

            <div class="fields-group">
              <input
                v-model="nuevoAlumno.nombre"
                type="text"
                placeholder="Nombre"
                required
              />

              <input
                v-model="nuevoAlumno.email"
                type="email"
                placeholder="Correo electrónico"
                required
              />

              <input
                v-model="nuevoAlumno.password"
                type="password"
                placeholder="Contraseña"
                required
              />
            </div>

            <p
              v-if="errorMsg"
              class="error-message"
            >
              {{ errorMsg }}
            </p>

            <p
              v-if="successMsg"
              class="success-message"
            >
              {{ successMsg }}
            </p>
          </div>

          <button
            class="primary-btn"
            type="submit"
          >
            <span>Añadir</span>
            <span class="arrow">›</span>
          </button>
        </form>
      </aside>
    </section>

    <div
      v-if="alumnoEditando"
      class="modal-backdrop"
    >
      <section class="edit-modal">
        <button
          class="close-modal"
          type="button"
          @click="cerrarModalEdicion"
        >
          ×
        </button>

        <h2>
          Editar alumno
        </h2>

        <form
          class="edit-form"
          @submit.prevent="guardarCambiosAlumno"
        >
          <input
            v-model="editarForm.nombre"
            type="text"
            placeholder="Nombre"
            required
          />

          <input
            v-model="editarForm.email"
            type="email"
            placeholder="Correo electrónico"
            required
          />

          <input
            v-model="editarForm.password"
            type="password"
            placeholder="Nueva contraseña"
          />

          <p
            v-if="editErrorMsg"
            class="error-message"
          >
            {{ editErrorMsg }}
          </p>

          <p
            v-if="editSuccessMsg"
            class="success-message"
          >
            {{ editSuccessMsg }}
          </p>

          <button
            class="save-btn"
            type="submit"
          >
            Guardar cambios
          </button>
        </form>
      </section>
    </div>

    <div
      v-if="alumnoAEliminar"
      class="modal-backdrop delete-modal-backdrop"
    >
      <section
        class="delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        <button
          v-if="!eliminandoAlumno"
          class="close-delete-modal"
          type="button"
          aria-label="Cerrar"
          @click="cerrarModalEliminar"
        >
          ×
        </button>

        <h2 id="delete-modal-title">
          Eliminar alumno
        </h2>

        <p class="delete-modal-text">
          ¿Seguro que quieres eliminar a
          <strong>{{ alumnoAEliminar.nombre }}</strong>?
        </p>

        <p class="delete-modal-warning">
          Esta acción no se puede deshacer.
        </p>

        <p
          v-if="deleteErrorMsg"
          class="error-message delete-error"
        >
          {{ deleteErrorMsg }}
        </p>

        <div class="delete-modal-actions">
          <button
            type="button"
            class="delete-cancel-btn"
            :disabled="eliminandoAlumno"
            @click="cerrarModalEliminar"
          >
            Cancelar
          </button>

          <button
            type="button"
            class="delete-confirm-btn"
            :disabled="eliminandoAlumno"
            @click="confirmarEliminarAlumno"
          >
            {{
              eliminandoAlumno
                ? "Eliminando..."
                : "Eliminar"
            }}
          </button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.classroom-view {
  position: relative;
  width: 100%;
  height: calc(100vh - 88px);
  min-height: 0;
  padding: 48px 70px 42px;
  box-sizing: border-box;
  overflow: hidden;
  font-family: Arial, Helvetica, sans-serif;
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

.classroom-view::before {
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

.classroom-view::after {
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

.classroom-layout {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  max-width: 1450px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(580px, 1fr) 430px;
  gap: 64px;
  align-items: start;
}

.students-zone {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.title-block {
  flex-shrink: 0;
  margin-bottom: 52px;
}

.title-block h1 {
  margin: 0 0 18px;
  color: #000000;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 48px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: -0.7px;
}

.title-block p {
  margin: 0 0 10px;
  color: #1f2937;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 19px;
  line-height: 1.35;
  font-weight: 700;
}

.title-block span {
  display: inline-block;
  color: #255b8e;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 18px;
  font-weight: 700;
}

.list-toolbar {
  width: 100%;
  flex-shrink: 0;
  margin: -28px 0 20px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.list-toolbar label {
  color: #4b5563;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 14px;
  font-weight: 700;
}

.sort-select {
  min-width: 180px;
  height: 46px;
  padding: 0 40px 0 20px;
  border: none;
  border-radius: 999px;
  background: #e7eefb;
  color: #000000;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 14px;
  font-weight: 700;
  outline: none;
  cursor: pointer;
  box-shadow: 0 5px 14px rgba(53, 137, 176, 0.1);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.sort-select:hover {
  background: #e0e9f8;
}

.sort-select:focus {
  background: #e7eefb;
  box-shadow: 0 0 0 4px rgba(92, 169, 203, 0.18);
}

.students-list {
  flex: 1;
  min-height: 0;
  width: 100%;
  padding: 2px 10px 18px 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
}

.students-list::-webkit-scrollbar {
  width: 8px;
}

.students-list::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(203, 213, 225, 0.35);
}

.students-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.45);
}

.students-list::-webkit-scrollbar-thumb:hover {
  background: rgba(71, 85, 105, 0.6);
}

.student-row {
  width: 100%;
  min-height: 76px;
  flex-shrink: 0;
  padding: 0 28px 0 22px;
  display: grid;
  grid-template-columns: 72px 1fr auto;
  align-items: center;
  box-sizing: border-box;
  border: none;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow:
    0 10px 24px rgba(31, 78, 124, 0.08),
    0 2px 7px rgba(31, 78, 124, 0.04);
  backdrop-filter: blur(9px);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.student-row:hover {
  background: #ffffff;
  box-shadow:
    0 14px 30px rgba(53, 137, 176, 0.14),
    0 3px 8px rgba(31, 78, 124, 0.05);
  transform: translateY(-2px);
}

.student-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #255f96;
  color: #ffffff;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 20px;
  font-weight: 700;
  box-shadow: 0 6px 14px rgba(37, 95, 150, 0.2);
}

.student-info {
  min-width: 0;
}

.student-info h2 {
  margin: 0 0 6px;
  color: #000000;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 24px;
  line-height: 1.1;
  font-weight: 700;
}

.student-info p {
  margin: 0;
  color: #5f7088;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 15px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.student-actions {
  display: flex;
  align-items: center;
  gap: 18px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #334155;
  font-size: 26px;
  font-weight: 700;
  cursor: pointer;
  line-height: 1;
  transition:
    transform 0.2s ease,
    color 0.2s ease,
    background 0.2s ease;
}

.icon-btn:hover {
  color: #3f99bd;
  background: #e7eefb;
  transform: translateY(-2px);
}

.icon-btn.delete:hover {
  color: #dc2626;
  background: #fee2e2;
}

.empty-message {
  margin-top: 20px;
  padding: 24px;
  border: none;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.75);
  color: #4b5563;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
  box-shadow: 0 8px 20px rgba(31, 78, 124, 0.06);
}

.register-zone {
  align-self: start;
  width: 100%;
  max-width: 430px;
  min-width: 0;
  margin-top: 50px;
}

.student-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.register-card {
  width: 100%;
  padding: 46px 38px 40px;
  box-sizing: border-box;
  border: 1px solid rgba(210, 226, 235, 0.9);
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow:
    0 16px 38px rgba(31, 78, 124, 0.11),
    0 3px 10px rgba(31, 78, 124, 0.04);
  backdrop-filter: blur(12px);
}

.register-card h2 {
  margin: 0 0 38px;
  color: #000000;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 36px;
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.fields-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.fields-group input {
  width: 100%;
  height: 58px;
  flex-shrink: 0;
  padding: 0 25px;
  box-sizing: border-box;
  border: none;
  border-radius: 999px;
  appearance: none;
  background: #e7eefb;
  color: #000000;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 16px;
  font-weight: 700;
  outline: none;
  box-shadow: none;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.fields-group input::placeholder {
  color: #737b84;
  font-weight: 700;
  opacity: 1;
}

.fields-group input:hover {
  background: #e0e9f8;
}

.fields-group input:focus {
  background: #e7eefb;
  box-shadow: 0 0 0 4px rgba(92, 169, 203, 0.18);
  transform: translateY(-1px);
}

.error-message,
.success-message {
  width: 100%;
  margin: 16px 0 0;
  padding: 10px 14px;
  box-sizing: border-box;
  border-radius: 12px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 13px;
  line-height: 1.35;
  font-weight: 700;
  text-align: center;
}

.error-message {
  border: 1px solid rgba(220, 38, 38, 0.16);
  background: rgba(254, 226, 226, 0.65);
  color: #dc2626;
}

.success-message {
  border: 1px solid rgba(21, 128, 61, 0.16);
  background: rgba(220, 252, 231, 0.68);
  color: #15803d;
}

.primary-btn {
  position: relative;
  width: calc(100% - 28px);
  height: 58px;
  flex-shrink: 0;
  margin: 0 auto;
  border: none;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #5da9ca;
  color: #ffffff;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 19px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 9px 20px rgba(53, 137, 176, 0.18);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.primary-btn:hover {
  background: #4d9bbb;
  box-shadow: 0 13px 26px rgba(53, 137, 176, 0.26);
  transform: translateY(-2px);
}

.primary-btn:active {
  transform: translateY(0);
}

.primary-btn .arrow {
  position: absolute;
  right: 24px;
  top: 50%;
  font-size: 48px;
  line-height: 1;
  font-weight: 300;
  transform: translateY(-54%);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(4px);
}

.edit-modal {
  position: relative;
  width: 500px;
  padding: 52px 50px;
  box-sizing: border-box;
  border: 1px solid rgba(210, 226, 235, 0.95);
  border-radius: 42px;
  background: rgba(248, 252, 254, 0.96);
  box-shadow: 0 22px 55px rgba(15, 23, 42, 0.24);
  backdrop-filter: blur(12px);
}

.edit-modal h2 {
  margin: 0 0 42px;
  color: #1f2937;
  font-size: 38px;
  line-height: 1;
  font-weight: 800;
}

.close-modal {
  position: absolute;
  top: 22px;
  right: 28px;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #111827;
  font-size: 34px;
  font-weight: 800;
  cursor: pointer;
  line-height: 1;
}

.close-modal:hover {
  color: #dc2626;
  background: #fee2e2;
}

.edit-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.edit-form input {
  width: 100%;
  height: 62px;
  padding: 0 36px;
  box-sizing: border-box;
  border: none;
  border-radius: 999px;
  background: #e7eefb;
  color: #000000;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 17px;
  font-weight: 700;
  outline: none;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.edit-form input::placeholder {
  color: #737b84;
  opacity: 1;
}

.edit-form input:hover {
  background: #e0e9f8;
}

.edit-form input:focus {
  background: #e7eefb;
  box-shadow: 0 0 0 4px rgba(92, 169, 203, 0.18);
}

.save-btn {
  width: 100%;
  height: 62px;
  margin-top: 6px;
  border: none;
  border-radius: 999px;
  background: #5da9ca;
  color: #ffffff;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 9px 20px rgba(53, 137, 176, 0.18);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.save-btn:hover {
  background: #4d9bbb;
  box-shadow: 0 13px 26px rgba(53, 137, 176, 0.26);
  transform: translateY(-2px);
}

/* MODAL DE ELIMINACIÓN */

.delete-modal-backdrop {
  z-index: 400;
}

.delete-modal {
  position: relative;
  width: min(500px, calc(100% - 40px));
  padding: 48px 46px 38px;
  box-sizing: border-box;
  border: 1px solid rgba(210, 226, 235, 0.95);
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 22px 55px rgba(15, 23, 42, 0.24);
  text-align: center;
}

.close-delete-modal {
  position: absolute;
  top: 16px;
  right: 20px;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #6b7280;
  font-size: 32px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease;
}

.close-delete-modal:hover {
  color: #dc2626;
  background: #fee2e2;
}

.delete-modal h2 {
  margin: 0 0 20px;
  color: #1f2937;
  font-size: 30px;
  line-height: 1.2;
  font-weight: 800;
}

.delete-modal-text {
  margin: 0;
  color: #4b5563;
  font-size: 17px;
  line-height: 1.5;
}

.delete-modal-text strong {
  color: #1f2937;
}

.delete-modal-warning {
  margin: 8px 0 26px;
  color: #dc2626;
  font-size: 14px;
  font-weight: 700;
}

.delete-error {
  margin: 0 0 20px;
}

.delete-modal-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.delete-cancel-btn,
.delete-confirm-btn {
  min-width: 120px;
  height: 48px;
  padding: 0 22px;
  border-radius: 10px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.delete-cancel-btn {
  border: 1px solid #cbd5e1;
  color: #374151;
  background: #f3f4f6;
}

.delete-cancel-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.delete-confirm-btn {
  border: none;
  color: #ffffff;
  background: #dc2626;
  box-shadow: 0 6px 14px rgba(220, 38, 38, 0.2);
}

.delete-confirm-btn:hover:not(:disabled) {
  background: #b91c1c;
  box-shadow: 0 9px 18px rgba(220, 38, 38, 0.28);
  transform: translateY(-1px);
}

.delete-cancel-btn:disabled,
.delete-confirm-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

@media (max-width: 1150px) {
  .classroom-view {
    height: auto;
    min-height: calc(100vh - 88px);
    padding: 46px 36px;
    overflow: visible;
  }

  .classroom-layout {
    height: auto;
    grid-template-columns: 1fr;
    gap: 46px;
    align-items: start;
  }

  .students-zone {
    min-height: 620px;
  }

  .students-list {
    max-height: 520px;
  }

  .register-zone {
    align-self: start;
    width: 100%;
    max-width: 560px;
  }
}

@media (max-width: 650px) {
  .classroom-view {
    height: auto;
    padding: 34px 20px;
    overflow: visible;
  }

  .students-zone {
    min-height: auto;
  }

  .title-block {
    margin-bottom: 46px;
  }

  .title-block h1 {
    font-size: 39px;
  }

  .title-block p {
    font-size: 18px;
  }

  .list-toolbar {
    margin: -24px 0 20px;
    align-items: stretch;
    flex-direction: column;
  }

  .list-toolbar label {
    align-self: flex-start;
  }

  .sort-select {
    width: 100%;
  }

  .students-list {
    max-height: 520px;
    padding-right: 5px;
  }

  .student-row {
    grid-template-columns: 58px 1fr;
    row-gap: 14px;
    padding: 18px;
  }

  .student-info h2 {
    font-size: 22px;
  }

  .student-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }

  .register-zone {
    width: 100%;
    max-width: none;
  }

  .student-form {
    gap: 20px;
  }

  .register-card {
    padding: 36px 24px 32px;
    border-radius: 26px;
  }

  .register-card h2 {
    margin-bottom: 30px;
    font-size: 32px;
  }

  .fields-group {
    gap: 16px;
  }

  .fields-group input {
    height: 56px;
    padding: 0 24px;
    font-size: 15px;
  }

  .primary-btn {
    width: calc(100% - 16px);
    height: 56px;
    font-size: 18px;
  }

  .edit-modal {
    width: calc(100% - 36px);
    padding: 42px 28px;
    border-radius: 30px;
  }

  .edit-modal h2 {
    font-size: 34px;
  }

  .delete-modal {
    width: calc(100% - 36px);
    padding: 44px 24px 30px;
  }

  .delete-modal h2 {
    font-size: 27px;
  }

  .delete-modal-actions {
    flex-direction: column-reverse;
  }

  .delete-cancel-btn,
  .delete-confirm-btn {
    width: 100%;
  }
}
</style>

