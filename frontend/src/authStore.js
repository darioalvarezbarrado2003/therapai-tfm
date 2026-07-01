import { reactive } from 'vue'

function cargarUsuarioGuardado() {
  try {
    const usuarioRaw = localStorage.getItem('usuario')
    return usuarioRaw ? JSON.parse(usuarioRaw) : null
  } catch (error) {
    console.error('Error leyendo el usuario guardado:', error)
    localStorage.removeItem('usuario')
    return null
  }
}

export const authState = reactive({
  usuario: cargarUsuarioGuardado()
})

export const authActions = {
  login(datosUsuario) {
    authState.usuario = datosUsuario

    localStorage.setItem(
      'usuario',
      JSON.stringify(datosUsuario)
    )
  },

  logout() {
    authState.usuario = null
    localStorage.removeItem('usuario')
  }
}