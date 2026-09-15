import { getLessons } from './loader'

export const LEARNING_PATHS = [
  { id: 'foundation', title: 'ئاساسىي نەزەرىيە', description: 'مىجەز، خىلىت ۋە ئۇيغۇر تېبابىتىنىڭ ئاساسلىرى.', lessonIds: [1, 2, 3] },
  { id: 'diagnosis', title: 'تەشخىس ۋە كۆزىتىش', description: 'بىمارنى كۆزىتىش، ئالامەتلەرنى چۈشىنىش ۋە خاتىرىلەش.', lessonIds: [4, 5, 6] },
  { id: 'practice', title: 'ئۆگىنىشتىن ئەمەلىيەتكە', description: 'ئالامەتلەرنى تەكرارلاش، رېتسېپلارنى ئوقۇش ۋە بىلىمنى سىناش.', lessonIds: [7, 8, 9, 10, 11] }
]

export function pathProgress(path, progress) {
  const total = path.lessonIds.length
  const done = path.lessonIds.filter(id => progress.isRead(id)).length
  return { done, total, percent: total ? Math.round(done / total * 100) : 0 }
}

export function pathLessons(path) {
  const lessons = getLessons()
  return path.lessonIds.map(id => lessons.find(lesson => Number(lesson.id) === id)).filter(Boolean)
}
