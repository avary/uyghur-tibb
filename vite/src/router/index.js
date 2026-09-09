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
  { path: '/search', redirect: '/' },
  { path: '/pdf', redirect: '/books' },
  { path: '/wrong', redirect: '/me' },
  { path: '/marks', redirect: '/me' },
  { path: '/tehlil', redirect: '/me' },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() { return { top: 0 } }
})