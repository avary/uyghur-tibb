<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '../../stores/api'
import { useToast } from '../../composables/toast'

const router = useRouter()
const api = useApi()
const { toast } = useToast()

const username = ref('')
const password = ref('')
const showPass = ref(false)
const loading = ref(false)
const err = ref('')

const TOKEN_KEY = 'uytibb_admin_token'

async function doLogin() {
  let user = username.value.trim()
  let pass = password.value.trim()
  if (user && !pass) { pass = user; user = '' } // forgiving: pass pasted into username box
  if (!pass) { err.value = '⚠️ مەخپىي نومۇرنى كىرگۈزۈڭ.'; return }
  err.value = ''
  loading.value = true
  try {
    const d = await api.adminLogin(user || 'admin', pass)
    if (d && d.status === 'ok' && d.token) {
      sessionStorage.setItem(TOKEN_KEY, d.token)
      sessionStorage.setItem('uytibb_admin_user_name', (d.user && d.user.name) || 'باشقۇرغۇچى')
      sessionStorage.setItem('uytibb_admin_user_role', (d.user && d.user.role) || 'super')
      toast('✅ مۇۋەپپەقىيەتلىك كىردىڭىز')
      router.replace('/admin')
      return
    }
    err.value = '⚠️ مەخپىي نومۇر ياكى كىرىش نامى خاتا بولدى!<br><small>ADMIN_PASSWORD مۇھىت ئۆزگەرگۈچىسى تەڭشەلگەنلىكىنى تەكشۈرۈڭ.</small>'
  } catch (e) {
    err.value = '⚠️ مۇلازىمەت ئۇلىنىشى مەغلۇپ بولدى.<br><small>توردا ئىشلەپ تۇرغانلىقىڭىزنى تەكشۈرۈڭ.</small>'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="admin-login">
    <div class="alogin-card">
      <img class="alogin-logo" src="/icon.svg" alt="">
      <h1>باشقۇرۇش مەركىزى</h1>
      <p class="alogin-sub">ئۇيغۇر تېبابىتى مائارىپ سۇپىسى</p>

      <label class="field">
        <span>كىرىش نامى (ئىختىيارى)</span>
        <input v-model="username" type="text" placeholder="admin" autocomplete="username" @keydown.enter="doLogin">
      </label>

      <label class="field">
        <span>مەخپىي نومۇر</span>
        <div class="pass-row">
          <input v-model="password" :type="showPass ? 'text' : 'password'" placeholder="ADMIN_PASSWORD"
            autocomplete="current-password" @keydown.enter="doLogin">
          <button class="pass-toggle" type="button" @click="showPass = !showPass">{{ showPass ? '🙈' : '👁️' }}</button>
        </div>
      </label>

      <div v-if="err" class="alogin-err" v-html="err"></div>

      <button class="btn btn-gold alogin-btn" :disabled="loading" @click="doLogin">
        {{ loading ? '⏳ تەكشۈرۈلىۋاتىدۇ...' : '🔓 كىرىش' }}
      </button>

      <RouterLink class="alogin-back" to="/">← ئوقۇغۇچى ئەپىگە قايتىش</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.admin-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background:
    radial-gradient(1200px 600px at 20% -10%, rgba(14, 124, 111, .28), transparent 60%),
    radial-gradient(900px 500px at 110% 110%, rgba(201, 162, 39, .18), transparent 60%),
    var(--bg);
}
.alogin-card {
  width: 100%;
  max-width: 380px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 2rem 1.7rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, .10);
  text-align: center;
}
.alogin-logo { width: 68px; height: 68px; margin-bottom: .6rem; }
.alogin-card h1 { font-size: 1.35rem; margin: 0 0 .15rem; color: var(--ink); }
.alogin-sub { color: var(--muted); margin: 0 0 1.4rem; font-size: .9rem; }
.field { display: block; text-align: right; margin-bottom: .9rem; font-size: .85rem; color: var(--muted); }
.field span { display: block; margin-bottom: .35rem; }
.field input {
  width: 100%;
  padding: .7rem .9rem;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--bg);
  color: var(--ink);
  font: inherit;
  direction: ltr;
  text-align: center;
}
.field input:focus { outline: none; border-color: var(--teal); box-shadow: 0 0 0 3px rgba(14, 124, 111, .18); }
.pass-row { position: relative; }
.pass-toggle {
  position: absolute;
  inset-inline-start: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
}
.alogin-err {
  background: #ffebee;
  border: 1px solid #e57373;
  color: var(--red);
  border-radius: 12px;
  padding: .6rem .8rem;
  font-size: .85rem;
  line-height: 1.7;
  margin-bottom: 1rem;
}
.alogin-btn { width: 100%; padding: .8rem; font-size: 1rem; margin-top: .2rem; }
.alogin-back { display: inline-block; margin-top: 1.1rem; color: var(--muted); font-size: .85rem; }
</style>