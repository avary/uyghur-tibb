// supabase.js - renamed: Uyghur Tibb API client (MySQL backed)
//
// SECURITY: This file is a thin client that proxies ALL database work through the
// serverless API (`/api/students`). It never holds database credentials, never talks
// to MySQL/Supabase directly, and contains NO hardcoded keys.
//
// * Public actions (register, feedback, scoped status) need no token.
// * Admin actions (list students, approve/block, delete, reply, admin update) attach
//   the admin token from sessionStorage (set by admin.html after a successful login).
// * The old `connected` flag is optimistic: the app degrades to localStorage if the
//   API is unreachable (fetch returns null, matching previous behaviour).

var Supabase = (function(){
  var API = "/api/students";
  var CFG_KEY = "uytibb_supabase_config";

  function getToken(){
    try { return sessionStorage.getItem("uytibb_admin_token") || ""; } catch(e){ return ""; }
  }
  function headers(){
    var h = { "Content-Type": "application/json" };
    var t = getToken();
    if(t) h["Authorization"] = "Bearer " + t;
    return h;
  }

  // The app always routes through the API. `connected` reflects intent; the API
  // reports actual DB connectivity in its responses.
  function getConfig(){
    try {
      var saved = JSON.parse(localStorage.getItem(CFG_KEY) || "{}");
      return { url: saved.url || "", key: saved.key || "", connected: true };
    } catch(e){ return { url: "", key: "", connected: true }; }
  }
  function saveConfig(url, key){
    localStorage.setItem(CFG_KEY, JSON.stringify({ url: url || "", key: key || "" }));
  }

  function post(body){
    return fetch(API, { method: "POST", headers: headers(), body: JSON.stringify(body) })
      .then(function(r){ return r.json().catch(function(){ return {}; }); })
      .catch(function(){ return null; });
  }

  // Health / connection check against the API.
  function testConnection(){
    return fetch(API + "?probe=1", { cache: "no-store" })
      .then(function(r){ if(!r.ok) throw new Error("API unreachable (" + r.status + ")"); return r.json(); })
      .catch(function(){ throw new Error("API unreachable"); });
  }
  function fetchConfigFromServer(){
    // Keep this no-op-ish for compatibility; config now lives server-side only.
    return Promise.resolve(getConfig());
  }

  // 1. Register student (public)
  function registerStudent(user){
    return post({ action: "register", user: user }).then(function(){ return {}; });
  }

  // 2. Fetch all students (ADMIN ONLY)
  function getStudents(){
    return fetch(API, { headers: headers() })
      .then(function(r){ if(!r.ok) return null; return r.json(); })
      .then(function(d){ return (d && d.students) ? d.students : null; })
      .catch(function(){ return null; });
  }

  // 3. Update student status (ADMIN ONLY)
  function updateStudentStatus(phone, status){
    return post({ action: "update_status", phone: phone, status: status });
  }

  // 4. Delete student (ADMIN ONLY)
  function deleteStudent(phone){
    return post({ action: "delete_student", phone: phone });
  }

  // 5. Check student status (public, scoped - returns only that phone's status)
  function checkStudentStatus(phone){
    return fetch(API + "?phone=" + encodeURIComponent(phone), { headers: headers() })
      .then(function(r){ if(!r.ok) return null; return r.json(); })
      .then(function(d){ return (d && typeof d.studentStatus !== "undefined") ? d.studentStatus : null; })
      .catch(function(){ return null; });
  }

  // 6. Feedback (Q&A)
  function getFeedback(){
    return fetch(API, { headers: headers() })
      .then(function(r){ if(!r.ok) return null; return r.json(); })
      .then(function(d){ return (d && d.feedback) ? d.feedback : null; })
      .catch(function(){ return null; });
  }

  function addFeedback(name, phone, question){
    return post({ action: "feedback", feedback: { name: name || "", phone: phone || "", text: question || "" } });
  }

  function replyFeedback(id, reply, repliedBy){
    return post({ action: "reply_feedback", id: id, reply: reply, replied_by: repliedBy });
  }

  // 7. Admin login -> returns a token (ADMIN)
  function adminLogin(username, password){
    return post({ action: "login", username: username || "admin", password: password });
  }

  return {
    getConfig: getConfig,
    saveConfig: saveConfig,
    fetchConfigFromServer: fetchConfigFromServer,
    testConnection: testConnection,
    registerStudent: registerStudent,
    getStudents: getStudents,
    updateStudentStatus: updateStudentStatus,
    deleteStudent: deleteStudent,
    checkStudentStatus: checkStudentStatus,
    getFeedback: getFeedback,
    addFeedback: addFeedback,
    replyFeedback: replyFeedback,
    adminLogin: adminLogin
  };
})();
