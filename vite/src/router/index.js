import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
  { path: '/lessons', name: 'lessons', component: () => import('../views/LessonsView.vue') },
  { path: '/lesson/:id', name: 'lesson', component: () => import('../views/LessonView.vue'), props: true },
  { path: '/lesson/:id/quiz', name: 'quiz', component: () => import('../views/QuizView.vue'), props: true },
  { path: '/books', name: 'books', component: () => import('../views/BooksView.vue') },
  { path: '/exam', name: 'exam', component: () => import('../views/ExamView.vue') },
  { path: '/teachers', name: 'teachers', component: () => import('../views/TeachersView.vue') },
  { path: '/me', name: 'me', component: () => import('../views/MeView.vue') },
  { path: '/ai', name: 'ai', component: () => import('../views/AiView.vue') },
  { path: '/install', name: 'install', component: () => import('../views/InstallView.vue') },
  { path: '/admin', name: 'admin', component: () => import('../views/admin/AdminDashboard.vue'), meta: { bare: true } },
  { path: '/admin/login', name: 'admin-login', component: () => import('../views/admin/AdminLogin.vue'), meta: { bare: true } },
  { path: '/search', redirect: '/' },
  { path: '/pdf', redirect: '/books' },
  { path: '/wrong', redirect: '/me' },
  { path: '/marks', redirect: '/me' },
  { path: '/tehlil', redirect: '/me' },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

function hasToken() {
  try { return !!sessionStorage.getItem('uytibb_admin_token') } catch (e) { return false }
}

function clearAdminSession() {
  try {
    sessionStorage.removeItem('uytibb_admin_token')
    sessionStorage.removeItem('uytibb_admin_user_name')
    sessionStorage.removeItem('uytibb_admin_user_role')
  } catch (e) {}
}

// Ask the API to validate the admin token server-side (HMAC signature + expiry).
// A token only sitting in sessionStorage is NOT trusted — forged/expired tokens must
// not open the admin UI. Network failure fails closed (returns false -> login page).
async function verifyToken() {
  let token = ''
  try { token = sessionStorage.getItem('uytibb_admin_token') || '' } catch (e) {}
  if (!token) return false
  try {
    const r = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ action: 'verify_token' })
    })
    const d = await r.json().catch(() => ({}))
    return r.ok && d.status === 'ok'
  } catch (e) {
    return false
  }
}

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() { return { top: 0 } }
})

// Admin auth guard: /admin requires a valid server-verified token; /admin/login
// redirects when a valid token is present and kicks out forged/expired ones.
router.beforeEach(async (to) => {
  const admin = to.path.startsWith('/admin')
  const authed = hasToken()
  if (admin && authed) {
    if (await verifyToken()) {
      return to.path === '/admin/login' ? '/admin' : true
    }
    clearAdminSession()
    return to.path !== '/admin/login' ? '/admin/login' : true
  }
  if (admin && !authed && to.path !== '/admin/login') return '/admin/login'
  return true
})

export default router