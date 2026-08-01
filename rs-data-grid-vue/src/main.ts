import { createApp } from 'vue'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import './style.css'
import App from './App.vue'

const vuetify = createVuetify({
  icons: {
    defaultSet: 'mdi',
  },
})

createApp(App).use(vuetify).mount('#app')
