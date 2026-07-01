<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const nombre = ref('')
const email = ref('')
const password = ref('')
const errorMsg = ref('')
const successMsg = ref('')

async function registrarProfesor() {
  try {
    errorMsg.value = ''
    successMsg.value = ''

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    
    if (!passwordRegex.test(password.value)) {
      throw new Error('La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número.')
    }

    const response = await fetch('https://therapai-tfm.onrender.com/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nombre: nombre.value,
        email: email.value,
        password: password.value,
        rol: 'profesor'
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || 'No se ha podido registrar el profesor')
    }

    successMsg.value = 'Profesor registrado correctamente'

    setTimeout(() => {
      router.push('/')
    }, 1500)

  } catch (error) {
    errorMsg.value = error.message
    console.error('Error en el registro:', error)
  }
}

function volverLogin() {
  router.push('/')
}
</script>

<template>
  <main class="register-layout">
    <section class="register-left">
      <div class="brand-container">
        <img src="../assets/logo.png" alt="Logo TherapAI" class="logo-large" />
        <h1 class="brand-title">Therap<span>AI</span></h1>
      </div>

      <div class="left-content">
        <h2>Bienvenido,</h2>
        <p class="intro">
          Practica tus habilidades clínicas o supervisa el progreso de tus alumnos.
        </p>
        <div class="left-separator"></div>
        <p class="claim">Aprende. Simula. Evalúa.</p>
        <p class="support-text">TherapAI te acompaña en cada sesión clínica.</p>
      </div>

      <div class="footer-link">
        <a href="#">Un proyecto de Dario Álvarez Barrado y Carlos Fernández Calderón</a>
      </div>
    </section>

    <section class="register-right">
      <div class="form-container">
        <h2 class="form-title">Registrarse</h2>

        <form @submit.prevent="registrarProfesor" class="register-form">
          <div class="input-group">
            <input v-model="nombre" type="text" placeholder="Nombre" required />
          </div>
          <div class="input-group">
            <input v-model="email" type="email" placeholder="Correo electrónico" required />
          </div>
          <div class="input-group">
            <input v-model="password" type="password" placeholder="Contraseña" required />
          </div>

          <p v-if="errorMsg" class="error-message">{{ errorMsg }}</p>
          <p v-if="successMsg" class="success-message">{{ successMsg }}</p>

          <button type="submit" class="btn-primary">
            <span>Continuar</span>
            <span class="arrow">›</span>
          </button>
        </form>

        <div class="login-area">
          <p>¿Ya tienes cuenta?</p>
          <button @click="volverLogin" class="btn-secondary">
            Iniciar sesión
          </button>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.register-layout {
  width: 100%;
  height: 100vh;
  display: grid;
  grid-template-columns: 42% 58%;
  background: #ffffff;
  font-family: Arial, Helvetica, sans-serif;
  overflow: hidden;
}

.register-left {
  height: 100%;
  background: linear-gradient(135deg, #1eaee8 0%, #255b8e 100%);
  color: white;
  padding: 42px 52px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.register-left::before {
  content: '';
  position: absolute;
  top: -10%;
  left: -10%;
  width: 500px;
  height: 500px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  z-index: 0;
}

.brand-container, .left-content, .footer-link { z-index: 1; }
.brand-container { display: flex; align-items: center; gap: 14px; }
.logo-large { width: 58px; height: 58px; object-fit: contain; background: white; border-radius: 50%; padding: 5px; }
.brand-title { font-size: 27px; font-weight: 800; color: #ffffff; margin: 0; }
.brand-title span { color: #aae0f5; }
.left-content { margin-top: 110px; max-width: 410px; }
.left-content h2 { font-size: 52px; line-height: 1; color: #ffffff; font-weight: 800; margin: 0 0 34px; }
.intro { font-size: 21px; line-height: 1.35; font-weight: 800; color: #e0f2fe; margin: 0; }
.left-separator { height: 92px; }
.claim { font-size: 27px; line-height: 1.25; font-weight: 800; color: #ffffff; margin: 0 0 42px; }
.support-text { font-size: 26px; line-height: 1.25; font-weight: 800; color: #e0f2fe; margin: 0; }
.footer-link { margin-top: auto; border-top: 2px solid rgba(255,255,255,0.3); padding-top: 15px; width: max-content; }
.footer-link a { color: white; text-decoration: none; font-weight: 600; letter-spacing: 1px; font-size: 14px; }

/* PANEL DERECHO AJUSTADO */
.register-right { height: 100%; background: #ffffff; display: flex; align-items: center; justify-content: center; padding: 60px; }
.form-container { width: 100%; max-width: 440px; margin-top: -20px; }

.form-title {
  font-size: 36px;
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #000000;
  margin: 0 0 32px 4px;
}

.register-form { display: flex; flex-direction: column; gap: 18px; }

.input-group input {
  width: 100%;
  height: 54px;
  border: none;
  border-radius: 999px;
  background: #cfd6dc;
  padding: 0 24px;
  font-size: 16px;
  font-weight: 700;
  color: #2f3a42;
  outline: none;
  box-sizing: border-box;
}

.input-group input:focus { background: #dbe2e7; box-shadow: 0 0 0 4px rgba(159, 213, 243, 0.55); }

.error-message { color: #ef4444; font-size: 14px; font-weight: 700; text-align: center; margin: -2px 0; }
.success-message { color: #77a38b; font-size: 14px; font-weight: 700; text-align: center; margin: -2px 0; }

.btn-primary {
  width: 100%;
  height: 54px;
  border: none;
  border-radius: 999px;
  background: #5ba8c9;
  color: #ffffff;
  font-size: 17px;
  font-weight: 800;
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, background 0.2s;
}

.btn-primary .arrow { position: absolute; right: 22px; font-size: 42px; line-height: 0; font-weight: 300; transform: translateY(-2px); }
.btn-primary:hover { transform: translateY(-2px); background: #4a94b3; }

.login-area { margin-top: 40px; text-align: center; }
.login-area p { font-size: 15px; font-weight: 700; color: #4b5563; margin: 0 0 16px; }

.btn-secondary {
  width: 100%;
  height: 54px;
  border: none;
  border-radius: 999px;
  background: #77a38b;
  color: #ffffff;
  font-size: 17px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.3s, transform 0.2s;
}

.btn-secondary:hover { background: #668f7a; transform: translateY(-2px); }

@media (max-width: 1000px) {
  .register-layout { grid-template-columns: 1fr; height: auto; overflow: auto; }
  .register-left { height: auto; min-height: auto; padding: 36px; }
  .left-content { margin-top: 55px; max-width: 100%; }
  .register-right { height: auto; min-height: auto; padding: 48px 28px; }
  .form-container { max-width: 440px; margin-top: 0; }
}
</style>