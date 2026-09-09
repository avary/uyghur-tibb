// Allowlist-based HTML sanitizer for lesson content rendered via v-html.
// Lesson bodies are authored HTML (defaults come from root data.js), but an
// admin can also paste arbitrary HTML and a restored backup could be crafted —
// so every v-html render goes through here. All attributes are dropped.
//
// Filtering strategy:
//   - tags in ALLOWED are kept (children preserved)
//   - tags in DROP are removed entirely (with their children)
//   - any other tag is unwrapped (children preserved, tag itself removed)
//
// Node-safe: returns the input unchanged when no DOM is available, so the
// content store stays SSR-testable.

const ALLOWED = new Set([
  'p', 'div', 'span', 'br', 'hr',
  'b', 'strong', 'i', 'em', 'u', 's', 'small', 'sub', 'sup',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code'
])

const DROP = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'form', 'input',
  'button', 'textarea', 'select', 'option', 'link', 'meta', 'base',
  'svg', 'math', 'noscript', 'template', 'picture', 'audio', 'video',
  'source', 'track'
])

export function sanitizeHtml(html) {
  const src = String(html == null ? '' : html)
  if (typeof DOMParser === 'undefined') return src
  const doc = new DOMParser().parseFromString(src, 'text/html')
  const root = doc.body

  const walk = (el) => {
    const k = el.tagName ? el.tagName.toLowerCase() : ''
    if (DROP.has(k)) {
      el.parentNode && el.parentNode.removeChild(el)
      return
    }
    if (k === 'table') {
      const wrapper = doc.createElement('div')
      while (el.firstChild) wrapper.appendChild(el.firstChild)
      el.parentNode && el.parentNode.replaceChild(wrapper, el)
      walk(wrapper)
      return
    }
    while (el.attributes && el.attributes.length) el.removeAttribute(el.attributes[0].name)

    Array.from(el.childNodes).forEach(child => {
      if (child.childNodes && child.childNodes.length) {
        walk(child)
      } else if (child.nodeType === Node.TEXT_NODE) {
        // keep text
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const ck = child.tagName.toLowerCase()
        if (DROP.has(ck)) {
          child.parentNode && child.parentNode.removeChild(child)
        } else if (!ALLOWED.has(ck)) {
          while (child.firstChild) {
            const grand = child.parentNode
            if (grand) grand.insertBefore(child.firstChild, child)
          }
          child.parentNode && child.parentNode.removeChild(child)
        } else {
          while (child.attributes && child.attributes.length) child.removeAttribute(child.attributes[0].name)
        }
      }
    })
  }

  walk(root)

  const out = root.innerHTML
  // guard against anything that survived (e.g. event-handler attributes)
  return out
    .replace(/\son[a-z]+\s*=/gi, ' data-stripped=')
    .replace(/javascript:/gi, '')
    .replace(/<body[^>]*>/gi, '')
    .replace(/<\/body>/gi, '')
}