const SAFETY_TERMS = ['دىياگنوز', 'دىئاگنوز', 'داۋالاش', 'مىقدار', 'دوزا', 'جىددى', 'ئېغىر', 'ھامىلدار', 'بالا']

export function isSafetyQuestion(value) {
  const text = String(value || '').toLowerCase()
  return SAFETY_TERMS.some(term => text.includes(term))
}

export const SAFETY_RESPONSE = 'مەن دىياگنوز قويالمايمەن، دورا ياكى مىقدار بەلگىلىمەيمەن. جىددىي ياكى ئېغىر ئالامەتتە دەرھال جىددىي قۇتقۇزۇش مۇلازىمىتىگە ياكى لاياقەتلىك دوختۇرغا مۇراجىئەت قىلىڭ. بۇ ئەپ پەقەت تەربىيەۋى مەنبە.'
