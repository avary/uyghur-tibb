<script setup>
import { ref, reactive } from 'vue'
import { useContent } from '../../stores/content'
import { useToast } from '../../composables/toast'

const store = useContent()
store.init()
const { toast } = useToast()

const tModal = ref(false)
const editingIdx = ref(null)
const form = reactive({ name: '', years: '', field: '', tag: '', bio: '', works: '' })

function resetForm() {
  form.name = ''
  form.years = ''
  form.field = 'تېبابەت ئالىمى'
  form.tag = 'تېبابەت پېشۋاسى'
  form.bio = ''
  form.works = ''
}

function openAdd() {
  editingIdx.value = null
  resetForm()
  tModal.value = true
}

function openEdit(t, idx) {
  editingIdx.value = idx
  form.name = t.name || ''
  form.years = t.years || ''
  form.field = t.field || ''
  form.tag = t.tag || ''
  form.bio = t.bio || ''
  form.works = t.works || ''
  tModal.value = true
}

function delTeacher(idx) {
  if (!confirm('بۇ ئۇستازنىڭ ئۇچۇرىنى ئۆچۈرەمسىز؟')) return
  store.teachers.splice(idx, 1)
  store.saveAll()
  toast('🗑️ ئۇستاز ئۆچۈرۈلدى.')
}

function saveTeacher() {
  const nm = form.name.trim()
  if (!nm) { toast('ئۇستازنىڭ ئىسمىنى كىرگۈزۈڭ!', 'err'); return }
  const obj = {
    name: nm,
    years: form.years.trim(),
    field: form.field.trim(),
    tag: form.tag.trim(),
    bio: form.bio.trim() || (nm + ' ئۇيغۇر تېبابىتىنىڭ ئەزىمەتلىرىدىندۇر.'),
    works: form.works.trim()
  }
  if (editingIdx.value != null && store.teachers[editingIdx.value]) {
    store.teachers[editingIdx.value] = obj
    toast('✏️ «' + nm + '» ئۇستاز ئۇچۇرى تەھرىرلەندى!')
  } else {
    store.teachers.unshift(obj)
    toast('➕ «' + nm + '» ئۇستاز سىستېمىغا قوشۇلدى!')
  }
  store.saveAll()
  tModal.value = false
}
</script>

<template>
  <div>
    <div class="card">
      <div class="card-head">
        <h3>👨‍🏫 ئۇستازلار ({{ store.teachers.length }})</h3>
        <button class="btn btn-gold btn-sm" @click="openAdd">➕ يېڭى ئۇستاز قوشۇش</button>
      </div>
      <div v-if="!store.teachers.length" class="empty">تېخى ئۇستاز قېتىلمىدى.</div>
      <div v-else class="table-card">
        <table class="tbl">
          <thead>
            <tr><th>ئىسمى</th><th>تەجرىبە</th><th>ساھە</th><th>خەتكۈچ</th><th>ئەسەرلىرى</th><th>ھەرىكەت</th></tr>
          </thead>
          <tbody>
            <tr v-for="(t, idx) in store.teachers" :key="idx">
              <td><b>{{ t.name }}</b></td>
              <td>{{ t.years || '' }}</td>
              <td>{{ t.field || '' }}</td>
              <td><span class="tag">{{ t.tag || '' }}</span></td>
              <td><small class="works">{{ t.works || '' }}</small></td>
              <td class="cell-actions">
                <button class="btn btn-gold btn-sm" @click="openEdit(t, idx)">✏️ تەھرىرلەش</button>
                <button class="btn btn-red btn-sm" @click="delTeacher(idx)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TEACHER MODAL -->
    <div v-if="tModal" class="overlay" @click.self="tModal = false">
      <div class="modal t-modal">
        <h3>{{ editingIdx != null ? '✏️ ئۇستاز ئۇچۇرىنى تەھرىرلەش' : '➕ يېڭى ئۇستاز قوشۇش' }}</h3>
        <div class="fld">
          <label>ئىسمى</label>
          <input v-model="form.name" class="input" type="text">
        </div>
        <div class="fld">
          <label>تەجرىبە يىللىرى</label>
          <input v-model="form.years" class="input" type="text" placeholder="مەسىلەن: 40+ يىل">
        </div>
        <div class="fld">
          <label>ساھە (Field)</label>
          <input v-model="form.field" class="input" type="text">
        </div>
        <div class="fld">
          <label>خەتكۈچ (Tag)</label>
          <input v-model="form.tag" class="input" type="text">
        </div>
        <div class="fld">
          <label>تەرجىمھالى (Bio)</label>
          <textarea v-model="form.bio" class="input" rows="3"></textarea>
        </div>
        <div class="fld">
          <label>ئەسەرلىرى (Works)</label>
          <input v-model="form.works" class="input" type="text">
        </div>
        <div class="qa-row">
          <button class="btn btn-ghost" @click="tModal = false">بىكار قىلىش</button>
          <button class="btn btn-gold" @click="saveTeacher">💾 ساقلاش</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-head { display: flex; align-items: center; justify-content: space-between; gap: .5rem; margin-bottom: .8rem; flex-wrap: wrap; }
.qa-row { display: flex; flex-wrap: wrap; gap: .55rem; }
.table-card { overflow-x: auto; }
.tag { display: inline-block; background: rgba(201, 162, 39, .16); color: #8a6d15; border-radius: 20px; padding: .15rem .55rem; font-size: .72rem; font-weight: 700; }
.works { color: var(--muted); max-width: 220px; white-space: normal; line-height: 1.6; }
.cell-actions { white-space: nowrap; text-align: center; }
.cell-actions .btn { margin: .15rem; }
.empty { text-align: center; color: var(--muted); padding: 1.2rem; }
.fld { margin-bottom: .7rem; }
.fld label { display: block; font-size: .82rem; font-weight: 800; color: var(--muted); margin-bottom: .3rem; }
.t-modal { max-width: 520px; max-height: 92vh; overflow-y: auto; }
.qa-row { justify-content: flex-end; }
</style>