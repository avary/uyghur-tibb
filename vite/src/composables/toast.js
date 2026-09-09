import { ref } from 'vue'

const toasts = ref([])
let id = 0

function toast(msg, type = 'ok') {
  const t = { id: ++id, msg, type }
  toasts.value.push(t)
  setTimeout(() => {
    toasts.value = toasts.value.filter(x => x.id !== t.id)
  }, 3200)
}

export function useToast() {
  return { toasts, toast }
}

export function useToastRender() {
  return { toasts }
}