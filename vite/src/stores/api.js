import { defineStore } from 'pinia'

// Port of supabase.js — thin client that proxies ALL DB work through the
// serverless API (/api/students). Holds no DB credentials, no keys.
// Public actions need no token; admin actions attach the session token.

const ENDPOINT = '/api/students'
const TOKEN_KEY = 'uytibb_admin_token'
const CFG_KEY = 'uytibb_supabase_config'

function token() {
  try { return sessionStorage.getItem(TOKEN_KEY) || '' } catch (e) { return '' }
}

async function post(body) {
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: 'Bearer ' + token() } : {}) },
      body: JSON.stringify(body)
    })
    return r.json().catch(() => ({}))
  } catch (e) {
    return null
  }
}

export const useApi = defineStore('api', {
  state: () => ({
    connected: true,
    lastError: null
  }),
  actions: {
    async testConnection() {
      try {
        const r = await fetch(ENDPOINT + '?probe=1', { cache: 'no-store' })
        if (!r.ok) throw new Error('API unreachable (' + r.status + ')')
        this.connected = true
        return await r.json()
      } catch (e) {
        this.connected = false
        this.lastError = e.message
        throw e
      }
    },

    async adminLogin(username, password) {
      const d = await post({ action: 'login', username: username || 'admin', password })
      return d
    },
    async registerStudent(user) {
      await post({ action: 'register', user })
    },
    async checkStudentStatus(phone) {
      try {
        const r = await fetch(ENDPOINT + '?phone=' + encodeURIComponent(phone), { headers: token() ? { Authorization: 'Bearer ' + token() } : {} })
        if (!r.ok) return null
        const d = await r.json()
        return typeof d.studentStatus !== 'undefined' ? d.studentStatus : null
      } catch (e) { return null }
    },
    async getFeedback() {
      try {
        const r = await fetch(ENDPOINT, { headers: token() ? { Authorization: 'Bearer ' + token() } : {} })
        if (!r.ok) return null
        const d = await r.json()
        return d.feedback || null
      } catch (e) { return null }
    },
    async addFeedback(name, phone, question) {
      return post({ action: 'feedback', feedback: { name: name || '', phone: phone || '', text: question || '' } })
    },
    async replyFeedback(id, reply, repliedBy) {
      return post({ action: 'reply_feedback', id, reply, replied_by: repliedBy })
    },
    async getStudents() {
      try {
        const r = await fetch(ENDPOINT, { headers: token() ? { Authorization: 'Bearer ' + token() } : {} })
        if (!r.ok) return null
        const d = await r.json()
        return d.students || null
      } catch (e) { return null }
    },
    async updateStudentStatus(phone, status) {
      return post({ action: 'update_status', phone, status })
    },
    async deleteStudent(phone) {
      return post({ action: 'delete_student', phone })
    },
    getConfig() {
      try { return JSON.parse(localStorage.getItem(CFG_KEY) || '{}') } catch (e) { return {} }
    },
    saveConfig(url, key) {
      localStorage.setItem(CFG_KEY, JSON.stringify({ url: url || '', key: key || '' }))
    }
  }
})