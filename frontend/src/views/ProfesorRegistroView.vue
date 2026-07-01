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

    const response = await fetch(`http://127.0.0.1:8000/api/profesores/${idProfesor}/alumnos`)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || "No se han podido cargar los alumnos.")
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
      throw new Error("La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número.")
    }

    const idProfesor = authState.usuario?._id

    if (!idProfesor) {
      throw new Error("No se ha encontrado el ID del profesor.")
    }

    const response = await fetch("http://127.0.0.1:8000/api/alumnos", {
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
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || "No se ha podido registrar el alumno.")
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

async function eliminarAlumno(idAlumno) {
  try {
    errorMsg.value = ""
    successMsg.value = ""

    const response = await fetch(`http://127.0.0.1:8000/api/alumnos/${idAlumno}`, {
      method: "DELETE"
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || "No se ha podido eliminar el alumno.")
    }

    alumnos.value = alumnos.value.filter(alumno => alumno._id !== idAlumno)

    successMsg.value = "Alumno eliminado correctamente."
  } catch (error) {
    errorMsg.value = error.message
    console.error("Error eliminando alumno:", error)
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
        throw new Error("La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número.")
      }
    }

    const response = await fetch(`http://127.0.0.1:8000/api/alumnos/${alumnoEditando.value._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nombre: editarForm.value.nombre,
        email: editarForm.value.email,
        password: editarForm.value.password
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || "No se han podido guardar los cambios.")
    }

    const alumnoActualizado = await response.json()

    const index = alumnos.value.findIndex(alumno => alumno._id === alumnoActualizado._id)

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
    return copia.sort((a, b) => a.nombre.localeCompare(b.nombre))
  }

  if (ordenAlumnos.value === "za") {
    return copia.sort((a, b) => b.nombre.localeCompare(a.nombre))
  }

  if (ordenAlumnos.value === "antiguo") {
    return copia.sort((a, b) => a._id.localeCompare(b._id))
  }

  // Por defecto: más reciente primero
  return copia.sort((a, b) => b._id.localeCompare(a._id))
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
  <p>Gestiona los alumnos asociados a tu perfil docente.</p>
  <span>Forma, registra, supervisa.</span>
</div>

<div class="list-toolbar">
  <label for="ordenAlumnos">Ordenar por</label>

  <select id="ordenAlumnos" v-model="ordenAlumnos" class="sort-select">
    <option value="reciente">Más reciente</option>
    <option value="antiguo">Más antiguo</option>
    <option value="az">A-Z</option>
    <option value="za">Z-A</option>
  </select>
</div>

<div class="students-list">
          <p v-if="cargando" class="empty-message">
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
              <h2>{{ alumno.nombre }}</h2>
              <p>{{ alumno.email }}</p>
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
                @click="eliminarAlumno(alumno._id)"
              >
                🗑
              </button>
            </div>
          </article>

          <p v-if="!cargando && alumnos.length === 0" class="empty-message">
            Todavía no tienes alumnos registrados.
          </p>
        </div>
      </section>

      <aside class="register-card">
        <h2>Nuevo alumno</h2>

        <form class="student-form" @submit.prevent="registrarAlumno">
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

          <p v-if="errorMsg" class="error-message">
            {{ errorMsg }}
          </p>

          <p v-if="successMsg" class="success-message">
            {{ successMsg }}
          </p>

          <button class="primary-btn" type="submit">
            <span>Añadir</span>
            <span class="arrow">›</span>
          </button>
        </form>
      </aside>
    </section>

    <div v-if="alumnoEditando" class="modal-backdrop">
      <section class="edit-modal">
        <button class="close-modal" type="button" @click="cerrarModalEdicion">
          ×
        </button>

        <h2>Editar alumno</h2>

        <form class="edit-form" @submit.prevent="guardarCambiosAlumno">
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

          <p v-if="editErrorMsg" class="error-message">
            {{ editErrorMsg }}
          </p>

          <p v-if="editSuccessMsg" class="success-message">
            {{ editSuccessMsg }}
          </p>

          <button class="save-btn" type="submit">
            Guardar cambios
          </button>
        </form>
      </section>
    </div>
  </main>
</template>

<style scoped>
.classroom-view {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 88px);
  padding: 70px 80px 50px;
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
  max-width: 1450px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(600px, 1fr) 520px;
  gap: 90px;
  align-items: start;
}

.students-zone {
  width: 100%;
  min-width: 0;
}

.title-block {
  margin-bottom: 70px;
}

.title-block h1 {
  margin: 0 0 26px;
  color: #1f2937;
  font-size: 52px;
  line-height: 1;
  font-weight: 800;
}

.title-block p {
  margin: 0 0 12px;
  color: #253746;
  font-size: 21px;
  line-height: 1.35;
  font-weight: 800;
}

.title-block span {
  display: inline-block;
  color: #255b8e;
  font-size: 18px;
  font-weight: 800;
}

/* ORDENACIÓN */
.list-toolbar {
  width: 100%;
  margin: -36px 0 24px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.list-toolbar label {
  color: #64748b;
  font-size: 14px;
  font-weight: 800;
}

.sort-select {
  min-width: 170px;
  height: 42px;
  padding: 0 38px 0 18px;
  border: 1px solid rgba(209, 219, 227, 0.95);
  border-radius: 999px;
  background: rgba(228, 235, 240, 0.88);
  color: #111827;
  font-size: 14px;
  font-weight: 800;
  outline: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(37, 91, 142, 0.08);
  backdrop-filter: blur(8px);
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.sort-select:hover {
  border-color: #38bdf8;
  background: rgba(218, 231, 239, 0.95);
}

.sort-select:focus {
  border-color: #1eaee8;
  box-shadow: 0 0 0 4px rgba(91, 168, 201, 0.2);
}

/* LISTA DE ALUMNOS */
.students-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.student-row {
  width: 100%;
  min-height: 82px;
  padding: 0 28px 0 22px;
  display: grid;
  grid-template-columns: 72px 1fr auto;
  align-items: center;
  box-sizing: border-box;
  border: 1px solid rgba(210, 226, 235, 0.95);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow:
    0 10px 24px rgba(31, 78, 124, 0.08),
    0 2px 7px rgba(31, 78, 124, 0.04);
  backdrop-filter: blur(9px);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.student-row:hover {
  border-color: rgba(56, 189, 248, 0.7);
  box-shadow:
    0 14px 30px rgba(31, 121, 181, 0.13),
    0 3px 8px rgba(31, 78, 124, 0.05);
  transform: translateY(-2px);
}

.student-avatar {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #255b8e;
  color: #ffffff;
  font-size: 22px;
  font-weight: 800;
  box-shadow: 0 6px 14px rgba(37, 91, 142, 0.2);
}

.student-info {
  min-width: 0;
}

.student-info h2 {
  margin: 0 0 6px;
  color: #1f2937;
  font-size: 27px;
  line-height: 1.1;
  font-weight: 800;
}

.student-info p {
  margin: 0;
  color: #64748b;
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
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #334155;
  font-size: 26px;
  font-weight: 800;
  cursor: pointer;
  line-height: 1;
  transition:
    transform 0.2s ease,
    color 0.2s ease,
    background 0.2s ease;
}

.icon-btn:hover {
  color: #0ea5e9;
  background: #e0f2fe;
  transform: translateY(-2px);
}

.icon-btn.delete:hover {
  color: #dc2626;
  background: #fee2e2;
}

.empty-message {
  margin-top: 20px;
  padding: 24px;
  border: 1px dashed rgba(148, 163, 184, 0.5);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.56);
  color: #64748b;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
}

/* FORMULARIO DE REGISTRO */
.register-card {
  width: 100%;
  padding: 62px 56px;
  box-sizing: border-box;
  border: 1px solid rgba(210, 226, 235, 0.95);
  border-radius: 42px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow:
    0 16px 38px rgba(31, 78, 124, 0.11),
    0 3px 10px rgba(31, 78, 124, 0.04);
  backdrop-filter: blur(12px);
}

.register-card h2 {
  margin: 0 0 58px;
  color: #1f2937;
  font-size: 44px;
  line-height: 1;
  font-weight: 800;
}

.student-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.student-form input {
  width: 100%;
  height: 64px;
  padding: 0 36px;
  box-sizing: border-box;
  border: 1px solid rgba(203, 213, 225, 0.85);
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.88);
  color: #2f3a42;
  font-size: 17px;
  font-weight: 800;
  outline: none;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.student-form input::placeholder {
  color: #7a838c;
  opacity: 1;
}

.student-form input:focus {
  border-color: #38bdf8;
  background: rgba(241, 245, 249, 0.96);
  box-shadow: 0 0 0 4px rgba(91, 168, 201, 0.2);
}

.primary-btn {
  position: relative;
  width: 100%;
  height: 64px;
  margin-top: 6px;
  border: none;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #38b5f2, #2584c2);
  color: #ffffff;
  font-size: 22px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 9px 20px rgba(37, 132, 194, 0.22);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.primary-btn:hover {
  background: linear-gradient(135deg, #20a7e8, #1f78b2);
  box-shadow: 0 13px 26px rgba(37, 132, 194, 0.3);
  transform: translateY(-2px);
}

.primary-btn .arrow {
  position: absolute;
  right: 32px;
  font-size: 62px;
  line-height: 0;
  font-weight: 300;
  transform: translateY(-2px);
}

.error-message {
  margin: -8px 0 2px;
  color: #dc2626;
  font-size: 15px;
  font-weight: 800;
  text-align: center;
}

.success-message {
  margin: -8px 0 2px;
  color: #15803d;
  font-size: 15px;
  font-weight: 800;
  text-align: center;
}

/* MODAL DE EDICIÓN */
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
  border: 1px solid rgba(203, 213, 225, 0.85);
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.9);
  color: #2f3a42;
  font-size: 17px;
  font-weight: 800;
  outline: none;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.edit-form input::placeholder {
  color: #7a838c;
  opacity: 1;
}

.edit-form input:focus {
  border-color: #38bdf8;
  background: rgba(241, 245, 249, 0.98);
  box-shadow: 0 0 0 4px rgba(91, 168, 201, 0.2);
}

.save-btn {
  width: 100%;
  height: 62px;
  margin-top: 6px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #38b5f2, #2584c2);
  color: #ffffff;
  font-size: 20px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 9px 20px rgba(37, 132, 194, 0.22);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.save-btn:hover {
  background: linear-gradient(135deg, #20a7e8, #1f78b2);
  box-shadow: 0 13px 26px rgba(37, 132, 194, 0.3);
  transform: translateY(-2px);
}

/* TABLET */
@media (max-width: 1150px) {
  .classroom-view {
    padding: 50px 36px;
  }

  .classroom-layout {
    grid-template-columns: 1fr;
    gap: 55px;
  }

  .register-card {
    max-width: 620px;
  }

  .title-block {
    margin-bottom: 56px;
  }
}

/* MÓVIL */
@media (max-width: 650px) {
  .classroom-view {
    padding: 38px 22px;
    overflow: visible;
  }

  .title-block {
    margin-bottom: 50px;
  }

  .title-block h1 {
    font-size: 40px;
  }

  .title-block p {
    font-size: 18px;
  }

  .list-toolbar {
    margin: -28px 0 22px;
    align-items: stretch;
    flex-direction: column;
  }

  .list-toolbar label {
    align-self: flex-start;
  }

  .sort-select {
    width: 100%;
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

  .register-card {
    padding: 42px 28px;
    border-radius: 30px;
  }

  .register-card h2 {
    font-size: 36px;
  }

  .edit-modal {
    width: calc(100% - 36px);
    padding: 42px 28px;
    border-radius: 30px;
  }

  .edit-modal h2 {
    font-size: 34px;
  }
}
</style>