/* ═══════════════════════════════════════════════
   API.JS — All Backend Fetch Calls
   ═══════════════════════════════════════════════ */

const API = {
  async _req(method, url, data, isFormData = false) {
    const opts = {
      method,
      credentials: 'same-origin'
    };
    if (!isFormData) {
      opts.headers = { 'Content-Type': 'application/json' };
    }
    if (data) opts.body = isFormData ? data : JSON.stringify(data);
    
    const res = await fetch(url, opts);
    
    if (res.status === 401) {
      // Session expired — redirect to login
      window.dispatchEvent(new CustomEvent('auth:expired'));
      throw new Error('Session expired. Please login again.');
    }
    
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      let errMsg = `Request failed (${res.status})`;
      if (contentType.includes('json')) {
        const errData = await res.json().catch(() => ({}));
        errMsg = errData.error || errMsg;
      }
      throw new Error(errMsg);
    }
    
    if (contentType.includes('json')) return res.json();
    return res;
  },
  
  get:    (url)        => API._req('GET', url),
  post:   (url, data)  => API._req('POST', url, data),
  put:    (url, data)  => API._req('PUT', url, data),
  delete: (url)        => API._req('DELETE', url),
  uploadFile: (url, form)  => API._req('POST', url, form, true),

  // ─── Auth ──────────────────────────────────────
  auth: {
    login:    (email, password) => API.post('/api/auth/login', { email, password }),
    logout:   ()                => API.post('/api/auth/logout'),
    me:       ()                => API.get('/api/auth/me'),
    changePassword: (current_password, new_password) => API.put('/api/auth/change-password', { current_password, new_password }),
  },

  // ─── Coaching Profile ──────────────────────────
  coaching: {
    get:          ()      => API.get('/api/coaching'),
    update:       (data)  => API.put('/api/coaching', data),
    onboardSetup: (data)  => API.post('/api/coaching/onboard-setup', data),
  },

  // ─── Dashboard ─────────────────────────────────
  dashboard: {
    get: () => API.get('/api/dashboard'),
  },

  // ─── Boards ────────────────────────────────────
  boards: {
    list:           ()          => API.get('/api/boards'),
    preloaded:      ()          => API.get('/api/boards/preloaded'),
    add:            (data)      => API.post('/api/boards', data),
    delete:         (id)        => API.delete(`/api/boards/${id}`),
    getGrades:      (id)        => API.get(`/api/boards/${id}/grades`),
    updateGrades:   (id, grades) => API.put(`/api/boards/${id}/grades`, { grades }),
    getStandards:   (id)        => API.get(`/api/boards/${id}/standards`),
  },

  // ─── Standards ─────────────────────────────────
  standards: {
    get:            (id)        => API.get(`/api/standards/${id}`),
    streams:        ()          => API.get('/api/standards/streams'),
    add:            (data)      => API.post('/api/standards', data),
    delete:         (id)        => API.delete(`/api/standards/${id}`),
    getSettings:    (id)        => API.get(`/api/standards/${id}/result-settings`),
    saveSettings:   (id, data)  => API.put(`/api/standards/${id}/result-settings`, data),
  },

  // ─── Subjects ──────────────────────────────────────
  subjects: {
    list:       (standardId)       => API.get(`/api/subjects?standard_id=${standardId}`),
    add:        (data)             => API.post('/api/subjects', data),
    update:     (id, data)         => API.put(`/api/subjects/${id}`, data),
    delete:     (id)               => API.delete(`/api/subjects/${id}`),
    reorder:    (order)            => API.put('/api/subjects/reorder', { order }),
    predefined: ()                 => API.get('/api/subjects/predefined'),
    allNames:   ()                 => API.get('/api/subjects/all-names'),
    getDefault: (stdNum, stream, boardId) => API.get(`/api/subjects/default?standard_number=${stdNum}&stream=${encodeURIComponent(stream)}&board_id=${boardId}`),
  },

  // ─── Students ──────────────────────────────────
  students: {
    list:       (standardId, search) => {
      let url = '/api/students';
      const params = [];
      if (standardId) params.push(`standard_id=${standardId}`);
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (params.length) url += '?' + params.join('&');
      return API.get(url);
    },
    get:        (id)            => API.get(`/api/students/${id}`),
    add:        (data)          => API.post('/api/students', data),
    update:     (id, data)      => API.put(`/api/students/${id}`, data),
    delete:     (id)            => API.delete(`/api/students/${id}`),
    getMarks:   (id)            => API.get(`/api/students/${id}/marks`),
    saveMarks:  (id, marks)     => API.post(`/api/students/${id}/marks`, { marks }),
    getResult:  (id)            => API.get(`/api/students/${id}/result`),
    getNextRoll:(standardId)    => API.get(`/api/students/next-roll?standard_id=${standardId}`),
    resequence: (standardId)    => API.post('/api/students/resequence', { standard_id: standardId }),
  },

  // ─── Tests ─────────────────────────────────────
  tests: {
    list:        (standardId)   => API.get(`/api/tests?standard_id=${standardId}`),
    add:         (data)         => API.post('/api/tests', data),
    bulkAdd:     (tests)        => API.post('/api/tests/bulk', { tests }),
    update:      (id, data)     => API.put(`/api/tests/${id}`, data),
    delete:      (id)           => API.delete(`/api/tests/${id}`),
    getMarks:    (id)           => API.get(`/api/tests/${id}/marks`),
    saveMarks:   (id, marks)    => API.post(`/api/tests/${id}/marks`, { marks }),
    excel:       (id)           => `/api/tests/${id}/export/excel`,
    pdf:         (id)           => `/api/tests/${id}/export/pdf`,
    importMarks: (id, form)     => API.uploadFile(`/api/tests/${id}/import`, form),
  },

  // ─── School Exams ──────────────────────────────
  schoolExams: {
    list:   (standardId) => API.get(`/api/school-exams${standardId ? `?standard_id=${standardId}` : ''}`),
    add:    (data)       => API.post('/api/school-exams', data),
    delete: (id)         => API.delete(`/api/school-exams/${id}`),
  },

  // ─── Fees ──────────────────────────────────────
  fees: {
    getLedger:     (studentId)       => API.get(`/api/fees/student/${studentId}`),
    addPayment:    (studentId, data) => API.post(`/api/fees/student/${studentId}/payments`, data),
    deletePayment: (paymentId)       => API.delete(`/api/fees/payments/${paymentId}`),
  },

  // ─── Test Cycles ─────────────────────────────────────
  testCycles: {
    list:    (standardId) => API.get(`/api/test-cycles?standard_id=${standardId}`),
    get:     (id)         => API.get(`/api/test-cycles/${id}`),
    results: (id)         => API.get(`/api/test-cycles/${id}/results`),
    create:  (data)       => API.post('/api/test-cycles', data),
    delete:  (id)         => API.delete(`/api/test-cycles/${id}`),
  },

  // ─── Reset ──────────────────────────────────────────
  reset: {
    execute: (categories) => API.post('/api/reset', { categories }),
  },

  // ─── Sync ───────────────────────────────────────────
  sync: {
    export: () => API.get('/api/sync/export'),
    import: (data) => API.post('/api/sync/import', data),
  },

  // ─── Import ────────────────────────────────────
  import: {
    parse:   (formData)         => API.uploadFile('/api/upload/import', formData),
    execute: (data)             => API.post('/api/import/execute', data),
  },

  // ─── Upload ──────────────────────────────────────
  upload: {
    logo:      (formData)         => API.uploadFile('/api/upload/logo', formData),
    photo:     (studentId, form)  => API.uploadFile(`/api/upload/photo/${studentId}`, form),
    signature: (formData)         => API.uploadFile('/api/upload/signature', formData),
  },

  // ─── Export ──────────────────────────────────────
  export: {
    results:        (standardId)              => API.get(`/api/export/results/${standardId}`),
    previewStudent: (studentId, templateId)   => {
      const url = templateId
        ? `/api/export/preview/${studentId}/template/${templateId}`
        : `/api/export/preview/${studentId}`;
      return fetch(url, { credentials: 'same-origin' }).then(r => r.text());
    },
    pdfSingle:      (studentId, templateId)   => `/api/export/pdf/single/${studentId}/download${templateId ? `?template_id=${templateId}` : ''}`,
    pdfBulk:        (standardId, templateId)  => `/api/export/pdf/bulk/${standardId}/download${templateId ? `?template_id=${templateId}` : ''}`,
    excel:          (standardId)              => `/api/export/excel/${standardId}/download`,
    reminderPDF:    (data)                    => API.post('/api/export/reminder-pdf', data),
    noticeboardPDF: (data)                    => API.post('/api/export/noticeboard-pdf', data),
  }
};

window.API = API;
