
const fs = require('fs');

global.window = global;
global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; }
};
global.sessionStorage = global.localStorage;
global.document = {
  getElementById(id) {
    return {
      textContent: '',
      style: {},
      value: '',
      innerHTML: '',
      appendChild() {},
      querySelectorAll() { return []; }
    };
  },
  querySelectorAll() { return []; }
};

require('./data.js');

console.log('DEFAULT_LESSONS count:', window.DEFAULT_LESSONS ? window.DEFAULT_LESSONS.length : 'undefined');
let totalQ = 0;
(window.DEFAULT_LESSONS || []).forEach(l => {
  if (l.quiz) totalQ += l.quiz.length;
});
console.log('Total Quiz Questions:', totalQ);

const adminHtml = fs.readFileSync('admin.html', 'utf8');
const scriptMatches = adminHtml.match(/<script>([\s\S]*?)<\/script>/g);
for (let s of scriptMatches) {
  const code = s.replace(/<script>|<\/script>/g, '');
  if (code.includes('var LESSONS_DATA')) {
    eval(code);
  }
}

console.log('LESSONS_DATA length after eval:', LESSONS_DATA.length);
initAdmin();
console.log('LESSONS_DATA length after initAdmin:', LESSONS_DATA.length);

let qCount = 0, pdfCount = 0;
LESSONS_DATA.forEach(L => {
  if (L.pdfUrl || L.pdfData) pdfCount++;
  if (L.quiz) qCount += L.quiz.length;
});
console.log('Calculated pdfCount:', pdfCount, 'qCount:', qCount);
