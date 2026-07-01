import { createRouter, createWebHistory } from 'vue-router'

import LoginView from '../views/LoginView.vue'
import AlumnoSimulacionView from '../views/AlumnoSimulacionView.vue'
import AlumnoHistorialView from '../views/AlumnoHistorialView.vue'
import ProfesorRegistroView from '../views/ProfesorRegistroView.vue'
import ProfesorHistorialView from '../views/ProfesorHistorialView.vue'
import ProfesorSignInView from '../views/ProfesorSignInView.vue'
import ConversacionView from "../views/ConversacionView.vue"

import { authState } from '../authStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  linkActiveClass: 'active',
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView,
      meta: { public: true }
    },

    {
      path: '/registrarse',
      name: 'registro-profesor',
      component: ProfesorSignInView,
      meta: { public: true }
    },

    {
      path: '/simulacion',
      name: 'simulacion',
      component: AlumnoSimulacionView,
      meta: { requiresAuth: true, rol: 'alumno' }
    },
    {
      path: '/mi-historial',
      name: 'historial-alumno',
      component: AlumnoHistorialView,
      meta: { requiresAuth: true, rol: 'alumno' }
    },

    {
      path: '/registrar-alumno',
      name: 'registrar-alumno',
      component: ProfesorRegistroView,
      meta: { requiresAuth: true, rol: 'profesor' }
    },
    {
      path: '/historial-alumnos',
      name: 'historial-profesor',
      component: ProfesorHistorialView,
      meta: { requiresAuth: true, rol: 'profesor' }
    },
    {
      path: '/simulacion/:trastorno',
      name: 'conversacion',
      component: ConversacionView,
      props: true,
      meta: { requiresAuth: true, rol: 'alumno' }
    }
  ]
})

router.beforeEach((to) => {
  const usuario = authState.usuario

  // Si intenta entrar a una ruta privada sin sesión, vuelve al login
  if (to.meta.requiresAuth && !usuario) {
    return '/'
  }

  // Si intenta entrar a una ruta de otro rol, lo mandamos a su zona
  if (to.meta.rol && usuario && usuario.rol !== to.meta.rol) {
    if (usuario.rol === 'profesor') {
      return '/historial-alumnos'
    }

    if (usuario.rol === 'alumno') {
      return '/mi-historial'
    }
  }
})

export default router