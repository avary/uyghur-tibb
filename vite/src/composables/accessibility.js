import { ref } from 'vue'
const KEY='uytibb_font_scale'; const scale=ref('normal')
function apply(){document.documentElement.setAttribute('data-font-scale',scale.value);try{localStorage.setItem(KEY,scale.value)}catch{}}
function init(){try{scale.value=['normal','large','xlarge'].includes(localStorage.getItem(KEY))?localStorage.getItem(KEY):'normal'}catch{scale.value='normal'}apply()}
function cycle(){scale.value=scale.value==='normal'?'large':scale.value==='large'?'xlarge':'normal';apply()}
export function useAccessibility(){return{scale,init,cycle}}
