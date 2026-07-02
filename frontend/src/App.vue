<script setup>
import { ref } from 'vue'
import { RouterView, RouterLink, useRouter } from 'vue-router'
import { authState, authActions } from './authStore'

const router = useRouter()

const menuUsuarioAbierto = ref(false)
const editandoPerfil = ref(false)

const perfilForm = ref({
  nombre: '',
  email: '',
  password: ''
})

const perfilErrorMsg = ref('')
const perfilSuccessMsg = ref('')

function toggleMenuUsuario() {
  menuUsuarioAbierto.value = !menuUsuarioAbierto.value
}

function abrirEditarPerfil() {
  menuUsuarioAbierto.value = false
  editandoPerfil.value = true

  perfilForm.value = {
    nombre: authState.usuario.nombre,
    email: authState.usuario.email,
    password: ''
  }

  perfilErrorMsg.value = ''
  perfilSuccessMsg.value = ''
}

function cerrarEditarPerfil() {
  editandoPerfil.value = false

  perfilForm.value = {
    nombre: '',
    email: '',
    password: ''
  }

  perfilErrorMsg.value = ''
  perfilSuccessMsg.value = ''
}

async function guardarPerfil() {
  try {
    perfilErrorMsg.value = ''
    perfilSuccessMsg.value = ''

    if (!authState.usuario?._id) {
      throw new Error('No se ha encontrado el usuario actual.')
    }

    // Si se escribe contraseña nueva, se valida.
    // Si se deja vacía, no se modifica.
    if (perfilForm.value.password.trim() !== '') {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

      if (!passwordRegex.test(perfilForm.value.password)) {
        throw new Error('La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número.')
      }
    }

    const response = await fetch(`https://therapai-tfm.onrender.com/api/usuarios/${authState.usuario._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nombre: perfilForm.value.nombre,
        email: perfilForm.value.email,
        password: perfilForm.value.password
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || 'No se han podido guardar los cambios.')
    }

    const usuarioActualizado = await response.json()

    authActions.login(usuarioActualizado)

    cerrarEditarPerfil()
  } catch (error) {
    perfilErrorMsg.value = error.message
    console.error('Error editando perfil:', error)
  }
}

function salir() {
  menuUsuarioAbierto.value = false
  authActions.logout()
  router.push('/')
}
</script>

<template>
  <div class="app">
    <header class="navbar" v-if="!$route.meta.public && authState.usuario">
      <div class="brand">
        <img src="./assets/logo.png" alt="Logo TherapAI" class="logo" />
        <div class="brand-name">Therap<span>AI</span></div>
      </div>

      <nav class="nav-links">
        <template v-if="authState.usuario.rol === 'alumno'">
          <RouterLink to="/simulacion" class="nav-link">Nueva Simulación</RouterLink>
          <RouterLink to="/mi-historial" class="nav-link">Mi historial</RouterLink>
        </template>

        <template v-else-if="authState.usuario.rol === 'profesor'">
          <RouterLink to="/registrar-alumno" class="nav-link">Mi Aula</RouterLink>
          <RouterLink to="/historial-alumnos" class="nav-link">Historial Alumnos</RouterLink>
        </template>
      </nav>

      <div class="user-area">
        <button class="user-button" @click="toggleMenuUsuario">
          <span>{{ authState.usuario.nombre }}</span>

          <div class="avatar">
            {{ authState.usuario.nombre.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() }}
          </div>
        </button>

        <div v-if="menuUsuarioAbierto" class="user-dropdown">
          <button class="dropdown-item" @click="abrirEditarPerfil">
            Editar información
          </button>

          <button class="dropdown-item logout" @click="salir">
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>

    <div v-if="editandoPerfil" class="modal-backdrop">
      <section class="edit-modal">
        <button class="close-modal" type="button" @click="cerrarEditarPerfil">
          ×
        </button>

        <h2>Editar información</h2>

        <form class="edit-form" @submit.prevent="guardarPerfil">
          <input
            v-model="perfilForm.nombre"
            type="text"
            placeholder="Nombre"
            required
          />

          <input
            v-model="perfilForm.email"
            type="email"
            placeholder="Correo electrónico"
            required
          />

          <input
            v-model="perfilForm.password"
            type="password"
            placeholder="Nueva contraseña"
          />

          <p v-if="perfilErrorMsg" class="error-message">
            {{ perfilErrorMsg }}
          </p>

          <p v-if="perfilSuccessMsg" class="success-message">
            {{ perfilSuccessMsg }}
          </p>

          <button class="save-btn" type="submit">
            Guardar cambios
          </button>
        </form>
      </section>
    </div>

    <RouterView />
  </div>
</template>

<style scoped>
.app {
  width: 100%;
  min-height: 100vh;
  background: #f8fbfd;
  font-family: Arial, Helvetica, sans-serif;
}

/* CABECERA */
.navbar {
  width: 100%;
  height: 88px;
  background: linear-gradient(90deg, #ffffff 0%, #f3fbff 45%, #eef8fc 100%);
  border-bottom: 1px solid #d9e5ee;
  display: grid;
  grid-template-columns: 260px 1fr auto;
  align-items: center;
  padding: 0 28px;
  box-sizing: border-box;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo {
  width: 58px;
  height: 58px;
  object-fit: contain;
}

.brand-name {
  font-size: 24px;
  font-weight: 800;
  color: #77a38b;
  white-space: nowrap;
}

.brand-name span {
  color: #5ba8c9;
}

/* NAVEGACIÓN */
.nav-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 34px;
}

.nav-link {
  color: #111827;
  text-decoration: none;
  font-size: 17px;
  font-weight: 500;
  padding: 31px 0 30px;
  border-radius: 0;
  transition: color 0.2s, transform 0.2s;
  white-space: nowrap;
  position: relative;
}

.nav-link:hover {
  color: #0ea5e9;
  transform: translateY(-1px);
}

.nav-link.active {
  color: #0ea5e9;
  font-weight: 800;
  background: transparent;
}

.nav-link.active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -1px;
  width: 75%;
  height: 4px;
  background: #0ea5e9;
  border-radius: 999px 999px 0 0;
  transform: translateX(-50%);
}

.nav-link:not(.active):hover::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -1px;
  width: 55%;
  height: 4px;
  background: rgba(14, 165, 233, 0.35);
  border-radius: 999px 999px 0 0;
  transform: translateX(-50%);
}

/* USUARIO */
.user-area {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 18px;
  color: #111827;
  font-size: 20px;
  font-weight: 500;
  white-space: nowrap;
}

.user-button {
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 18px;
  color: #111827;
  font-size: 20px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
}

.user-button:hover span {
  color: #0ea5e9;
}

.avatar {
  width: 62px;
  height: 62px;
  border-radius: 50%;
  background: #255b8e;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
}

.user-button:hover .avatar {
  background: #1f4e7c;
  transform: translateY(-1px);
}

/* DROPDOWN */
.user-dropdown {
  position: absolute;
  top: 76px;
  right: 0;
  width: 230px;
  background: #ffffff;
  border: 1px solid #d9e5ee;
  border-radius: 16px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
  padding: 10px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dropdown-item {
  width: 100%;
  display: block;
  border: none;
  background: transparent;
  color: #111827;
  font-size: 15px;
  font-weight: 700;
  text-align: left;
  padding: 13px 14px;
  border-radius: 12px;
  cursor: pointer;
  box-sizing: border-box;
  white-space: nowrap;
}

.dropdown-item:hover {
  background: #e6f3fa;
  color: #0ea5e9;
}

.dropdown-item.logout {
  color: #ef4444;
}

.dropdown-item.logout:hover {
  background: #fee2e2;
  color: #dc2626;
}

/* MODAL EDITAR PERFIL */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
  backdrop-filter: blur(2px);
}

.edit-modal {
  width: 500px;
  background: #f4f9fc;
  border-radius: 42px;
  padding: 52px 50px;
  box-sizing: border-box;
  position: relative;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.22);
}

.edit-modal h2 {
  font-size: 38px;
  line-height: 1;
  font-weight: 800;
  color: #111111;
  margin: 0 0 42px;
}

.close-modal {
  position: absolute;
  top: 22px;
  right: 28px;
  border: none;
  background: transparent;
  color: #111111;
  font-size: 34px;
  font-weight: 800;
  cursor: pointer;
  line-height: 1;
}

.close-modal:hover {
  color: #dc2626;
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
  border: none;
  border-radius: 999px;
  background: #cfd6dc;
  padding: 0 36px;
  box-sizing: border-box;
  font-size: 17px;
  font-weight: 800;
  color: #2f3a42;
  outline: none;
}

.edit-form input::placeholder {
  color: #7a838c;
  opacity: 1;
}

.edit-form input:focus {
  background: #dbe2e7;
  box-shadow: 0 0 0 4px rgba(91, 168, 201, 0.22);
}

.save-btn {
  width: 100%;
  height: 62px;
  border: none;
  border-radius: 999px;
  background: #38b5f2;
  color: #ffffff;
  font-size: 20px;
  font-weight: 800;
  cursor: pointer;
  margin-top: 6px;
  transition: background 0.2s, transform 0.2s;
}

.save-btn:hover {
  background: #20a7e8;
  transform: translateY(-2px);
}

.error-message {
  color: #dc2626;
  font-size: 15px;
  font-weight: 800;
  text-align: center;
  margin: -8px 0 2px;
}

.success-message {
  color: #15803d;
  font-size: 15px;
  font-weight: 800;
  text-align: center;
  margin: -8px 0 2px;
}

@media (max-width: 650px) {
  .navbar {
    grid-template-columns: auto 1fr auto;
    padding: 0 16px;
  }

  .brand-name {
    display: none;
  }

  .nav-links {
    gap: 18px;
  }

  .nav-link {
    font-size: 14px;
  }

  .user-button span {
    display: none;
  }

  .avatar {
    width: 52px;
    height: 52px;
    font-size: 19px;
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