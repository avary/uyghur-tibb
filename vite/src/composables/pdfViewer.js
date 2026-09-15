import { ref } from 'vue'

// App-wide PDF viewer state — mount <PdfViewerModal /> once at the app root
// and call openPdfViewer() from anywhere (books page, admin PDF library, ...).
const visible = ref(false)
const url = ref('')
const title = ref('PDF كىتاب ئوقۇغۇچ')

export function openPdfViewer(u, t) {
  url.value = u || ''
  title.value = t || 'PDF كىتاب ئوقۇغۇچ'
  visible.value = true
}

export function closePdfViewer() {
  visible.value = false
  url.value = ''
}

export function usePdfViewer() {
  return { visible, url, title, closePdfViewer }
}