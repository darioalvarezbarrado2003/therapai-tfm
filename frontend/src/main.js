import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // Importamos el GPS
import './style.css'

const app = createApp(App)

app.use(router) // Le decimos a Vue que lo use
app.mount('#app')