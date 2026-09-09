import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { loadData } from './data/loader'
import './styles/main.css'

loadData()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// Register the service worker (PWA) on production builds / secure contexts.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}