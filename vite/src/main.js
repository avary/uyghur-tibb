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