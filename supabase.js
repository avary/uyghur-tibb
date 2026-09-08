var SUPABASE_SETUP_SQL = '-- =========================================================================\n-- «ئۇيغۇر تېبابىتى مائارىپ سۇپىسى» — Supabase PostgreSQL ساندان لايىھەسى\n-- بۇ كودنى Supabase تۈرىڭىزدىكى SQL Editor غا چاپلاپ «RUN» كۇنۇپكىسىنى باسسىڭىزلا پۈتىدۇ.\n-- =========================================================================\n\n-- 1. ئوقۇغۇچىلار جەدۋىلى (Students & Approvals)\nCREATE TABLE IF NOT EXISTS public.students (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    name TEXT NOT NULL,\n    phone TEXT NOT NULL UNIQUE,\n    status TEXT NOT NULL DEFAULT \'pending\', -- \'pending\' (كۈتۈۋاتىدۇ), \'approved\' (تەستىقلاندى), \'blocked\' (چەكلەندى)\n    registered_at TIMESTAMPTZ DEFAULT NOW(),\n    last_active TIMESTAMPTZ DEFAULT NOW(),\n    notes TEXT\n);\n\n-- 2. سوئال-جاۋاب ۋە ئوقۇغۇچى پىكىرلىرى (Q&A & Feedback)\nCREATE TABLE IF NOT EXISTS public.feedback (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    student_name TEXT NOT NULL,\n    student_phone TEXT,\n    question TEXT NOT NULL,\n    reply TEXT,\n    reply_at TIMESTAMPTZ,\n    replied_by TEXT,\n    is_public BOOLEAN DEFAULT TRUE,\n    created_at TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- 3. باشقۇرغۇچى ھېساباتلىرى (Admin Accounts)\nCREATE TABLE IF NOT EXISTS public.admins (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    username TEXT NOT NULL UNIQUE,\n    full_name TEXT NOT NULL,\n    password_hash TEXT NOT NULL,\n    role TEXT NOT NULL DEFAULT \'teacher\', -- \'super\' (ئالىي باشقۇرغۇچى), \'teacher\' (ئوقۇتۇش مەسئۇلى)\n    created_at TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- دەسلەپكى ئاساسىي باشقۇرغۇچىنى قىستۇرۇش (ئەگەر بولمىسا)\nINSERT INTO public.admins (username, full_name, password_hash, role)\nVALUES (\'admin\', \'ئاساسىي باشقۇرغۇچى\', \'tibb2026\', \'super\')\nON CONFLICT (username) DO NOTHING;\n\n-- 4. دەرسلىك ۋە PDF كىتابلار جەدۋىلى (Lessons & PDFs)\nCREATE TABLE IF NOT EXISTS public.lessons (\n    id INT PRIMARY KEY,\n    title TEXT NOT NULL,\n    subtitle TEXT,\n    short_title TEXT,\n    description TEXT,\n    pdf_url TEXT,\n    pdf_title TEXT,\n    data JSONB, -- پۈتۈن دەرس بۆلەكلىرى ۋە سوئاللىرى\n    updated_at TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- 5. ئىمتىھان ۋە سىناق خاتىرىلىرى (Exams)\nCREATE TABLE IF NOT EXISTS public.exam_logs (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    student_phone TEXT REFERENCES public.students(phone) ON DELETE CASCADE,\n    scope TEXT NOT NULL,\n    score INT NOT NULL,\n    total_questions INT NOT NULL,\n    duration_seconds INT,\n    passed BOOLEAN DEFAULT FALSE,\n    taken_at TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- RLS (Row Level Security) كاپالىتى\nALTER TABLE public.students ENABLE ROW LEVEL SECURITY;\nALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;\nALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;\n\n-- ھەممە ئادەم ئوقۇيالايدىغان ۋە سوئال يوللىيالايدىغان قائىدە\nCREATE POLICY "Public Read Lessons" ON public.lessons FOR SELECT USING (true);\nCREATE POLICY "Public Read Approved Feedback" ON public.feedback FOR SELECT USING (is_public = true);\nCREATE POLICY "Public Insert Feedback" ON public.feedback FOR INSERT WITH CHECK (true);\nCREATE POLICY "Public Insert Student" ON public.students FOR INSERT WITH CHECK (true);\nCREATE POLICY "Public Read Students Status" ON public.students FOR SELECT USING (true);\n\nCOMMENT ON TABLE public.students IS \'ئۇيغۇر تېبابىتى تىزىملاتقان ئوقۇغۇچىلار ۋە تەستىقلاش ھالىتى\';\nCOMMENT ON TABLE public.feedback IS \'ئوقۇغۇچىلارنىڭ سوئال-جاۋاب ۋە پىكىرلىرى\';\n';

// supabase.js - Uyghur Tibb Native Supabase REST Client
// Nol-kutubxana, ultra-tez, CORS qollaydighan PostgreSQL ulash moduli

var Supabase = (function(){
  var CFG_KEY = "uytibb_supabase_config";

  function getConfig(){
    try {
      var saved = JSON.parse(localStorage.getItem(CFG_KEY) || "{}");
      return {
        url: saved.url || "",
        key: saved.key || "",
        connected: !!(saved.url && saved.key)
      };
    } catch(e){
      return { url: "", key: "", connected: false };
    }
  }

  function saveConfig(url, key){
    url = (url || "").trim().replace(/\/+$/, "");
    key = (key || "").trim();
    localStorage.setItem(CFG_KEY, JSON.stringify({ url: url, key: key }));
  }

  function getHeaders(){
    var cfg = getConfig();
    return {
      "apikey": cfg.key,
      "Authorization": "Bearer " + cfg.key,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    };
  }

  // 1. Test Connection
  function testConnection(testUrl, testKey){
    var u = (testUrl || getConfig().url).replace(/\/+$/, "");
    var k = testKey || getConfig().key;
    if(!u || !k) return Promise.reject(new Error("Supabase URL ياكى Anon Key كىرگۈزۈلمىدى"));
    return fetch(u + "/rest/v1/students?select=count", {
      headers: { "apikey": k, "Authorization": "Bearer " + k }
    }).then(function(res){
      if(!res.ok){
        if(res.status === 401 || res.status === 403) throw new Error("Anon Key خاتا ياكى ئىجازەت بېرىلمىگەن (401/403)");
        if(res.status === 404) throw new Error("students جەدۋىلى تېپىلمىدى. ئاۋۋال SQL كودىنى Run قىلىڭ (404)");
        throw new Error("ساندان ئۇلىنىشى مەغلۇپ بولدى (كود: " + res.status + ")");
      }
      return res.json();
    });
  }

  // 2. Register Student
  function registerStudent(user){
    var cfg = getConfig();
    if(!cfg.connected) return Promise.resolve(null);
    return fetch(cfg.url + "/rest/v1/students", {
      method: "POST",
      headers: Object.assign(getHeaders(), { "Prefer": "resolution=merge-duplicates" }),
      body: JSON.stringify({
        name: user.name,
        phone: user.phone,
        status: user.status || "pending",
        last_active: new Date().toISOString()
      })
    }).then(function(r){ return r.json(); }).catch(function(){ return null; });
  }

  // 3. Fetch All Students
  function getStudents(){
    var cfg = getConfig();
    if(!cfg.connected) return Promise.resolve(null);
    return fetch(cfg.url + "/rest/v1/students?select=*&order=registered_at.desc", {
      headers: getHeaders()
    }).then(function(r){
      if(!r.ok) return null;
      return r.json();
    }).catch(function(){ return null; });
  }

  // 4. Update Student Status (Approve / Block)
  function updateStudentStatus(phone, status){
    var cfg = getConfig();
    if(!cfg.connected) return Promise.resolve(null);
    return fetch(cfg.url + "/rest/v1/students?phone=eq." + encodeURIComponent(phone), {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ status: status })
    }).then(function(r){ return r.json(); }).catch(function(){ return null; });
  }

  // 5. Delete Student
  function deleteStudent(phone){
    var cfg = getConfig();
    if(!cfg.connected) return Promise.resolve(null);
    return fetch(cfg.url + "/rest/v1/students?phone=eq." + encodeURIComponent(phone), {
      method: "DELETE",
      headers: getHeaders()
    }).catch(function(){});
  }

  // 6. Check Student Status
  function checkStudentStatus(phone){
    var cfg = getConfig();
    if(!cfg.connected) return Promise.resolve(null);
    return fetch(cfg.url + "/rest/v1/students?select=status&phone=eq." + encodeURIComponent(phone), {
      headers: getHeaders()
    }).then(function(r){
      if(!r.ok) return null;
      return r.json();
    }).then(function(data){
      if(data && data.length) return data[0].status;
      return null;
    }).catch(function(){ return null; });
  }

  // 7. Feedback (Q&A)
  function getFeedback(){
    var cfg = getConfig();
    if(!cfg.connected) return Promise.resolve(null);
    return fetch(cfg.url + "/rest/v1/feedback?select=*&order=created_at.desc", {
      headers: getHeaders()
    }).then(function(r){
      if(!r.ok) return null;
      return r.json();
    }).catch(function(){ return null; });
  }

  function addFeedback(name, phone, question){
    var cfg = getConfig();
    if(!cfg.connected) return Promise.resolve(null);
    return fetch(cfg.url + "/rest/v1/feedback", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        student_name: name,
        student_phone: phone,
        question: question
      })
    }).then(function(r){ return r.json(); }).catch(function(){ return null; });
  }

  function replyFeedback(id, reply, repliedBy){
    var cfg = getConfig();
    if(!cfg.connected) return Promise.resolve(null);
    return fetch(cfg.url + "/rest/v1/feedback?id=eq." + id, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({
        reply: reply,
        reply_at: new Date().toISOString(),
        replied_by: repliedBy || "ئاساسىي باشقۇرغۇچى"
      })
    }).then(function(r){ return r.json(); }).catch(function(){ return null; });
  }

  return {
    getConfig: getConfig,
    saveConfig: saveConfig,
    testConnection: testConnection,
    registerStudent: registerStudent,
    getStudents: getStudents,
    updateStudentStatus: updateStudentStatus,
    deleteStudent: deleteStudent,
    checkStudentStatus: checkStudentStatus,
    getFeedback: getFeedback,
    addFeedback: addFeedback,
    replyFeedback: replyFeedback
  };
})();
