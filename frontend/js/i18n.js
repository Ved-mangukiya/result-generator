/* ═══════════════════════════════════════════════
   I18N.JS — Multilingual Translation System
   Supports English (en), Hindi (hi), Gujarati (gu)
   ═══════════════════════════════════════════════ */

const I18N_DICTIONARY = {
  en: {
    // Nav & Pages
    'nav.dashboard': 'Dashboard',
    'nav.boards': 'Boards & Classes',
    'nav.students': 'Admissions & Students',
    'nav.attendance': 'Attendance Tracker',
    'nav.results': 'Results Panel',
    'nav.tests': 'Test Scheduler',
    'nav.reminders': 'Notices & Reminders',
    'nav.promotions': 'Promotions & Marketing',
    'nav.templates': 'Result Templates',
    'nav.import': 'Excel Import',
    'nav.settings': 'Settings',
    'nav.teachers': 'Teachers Portal',
    'nav.parents': 'Parent Portal',
    'nav.faculty': 'Faculty Management',
    'nav.timetable': 'Timetable Builder',
    'nav.logout': 'Sign Out',

    // Common Actions
    'action.add': 'Add',
    'action.edit': 'Edit',
    'action.delete': 'Delete',
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.confirm': 'Confirm',
    'action.download': 'Download',
    'action.download_pdf': 'Download PDF',
    'action.export_excel': 'Export Excel',
    'action.print': 'Print',
    'action.search': 'Search...',
    'action.filter': 'Filter',
    'action.refresh': 'Refresh',
    'action.close': 'Close',
    'action.back': 'Back',
    'action.next': 'Next',
    'action.publish': 'Publish',
    'action.save_draft': 'Save Draft',
    'action.create_test': 'Create Test',
    'action.add_student': 'Add Student',

    // Common Terms
    'term.class': 'Class / Standard',
    'term.board': 'Board',
    'term.batch': 'Batch',
    'term.all_batches': 'All Batches',
    'term.subject': 'Subject',
    'term.student_name': 'Student Name',
    'term.roll_no': 'Roll No',
    'term.total_students': 'Total Students',
    'term.marks': 'Marks',
    'term.max_marks': 'Max Marks',
    'term.obtained': 'Obtained',
    'term.percentage': 'Percentage',
    'term.grade': 'Grade',
    'term.rank': 'Rank',
    'term.status': 'Status',
    'term.active': 'Active',
    'term.completed': 'Completed',
    'term.graduated': 'Graduated',
    'term.present': 'Present',
    'term.absent': 'Absent',
    'term.late': 'Late',
    'term.excused': 'Leave / Excused',
    'term.date': 'Date',
    'term.timing': 'Timing',
    'term.venue': 'Venue',
    'term.syllabus': 'Syllabus',
    'term.academic_year': 'Academic Year',
    'term.notice_title': 'Notice Title',
    'term.message': 'Message',
    'term.digital_mode': 'Digital Mode',
    'term.print_mode': 'Physical Print Mode',

    // Dashboard
    'dash.welcome': 'Tuition ERP Dashboard',
    'dash.subtitle': 'Real-time overview of admissions, tests, attendance, and fee collection.',
    'dash.total_active_students': 'Active Students',
    'dash.total_classes': 'Classes & Standards',
    'dash.total_tests': 'Tests Conducted',
    'dash.attendance_today': 'Attendance Rate',
    'dash.fee_collected': 'Fees Collected',
    'dash.recent_notices': 'Recent Notices',
    'dash.upcoming_tests': 'Upcoming Exams & Tests',

    // Empty States
    'empty.no_students': 'No Students Enrolled',
    'empty.no_students_desc': 'No students found in this class. Click Add Student to enroll students.',
    'empty.no_filter_match': 'No Students Match Filter',
    'empty.no_filter_match_desc': 'No records matched your search criteria or batch filter.',
    'empty.no_tests': 'No Tests Scheduled',
    'empty.no_tests_desc': 'There are no tests created for this class yet.',
    'empty.no_notices': 'No Notices Published',
    'empty.no_notices_desc': 'Compose your first notice to share with students and parents.',

    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage your coaching profile, visual appearance, academic policies, and backups.',
    'settings.tab_general': '🏢 General & Profile',
    'settings.tab_appearance': '🎨 Appearance & Themes',
    'settings.tab_language': '🌐 Language & Localization',
    'settings.tab_academic': '🎓 Academic & Exams',
    'settings.tab_notices': '📢 Notices & PDF',
    'settings.tab_data': '💾 Data & Backups',
    'settings.tab_security': '🔐 Account & Security',
  },

  hi: {
    // Nav & Pages
    'nav.dashboard': 'डैशबोर्ड',
    'nav.boards': 'बोर्ड और कक्षाएं',
    'nav.students': 'प्रवेश और छात्र',
    'nav.attendance': 'उपस्थिति ट्रैकर',
    'nav.results': 'परिणाम पैनल',
    'nav.tests': 'परीक्षा अनुसूची',
    'nav.reminders': 'सूचनाएं और अनुस्मारक',
    'nav.promotions': 'प्रचार और विपणन',
    'nav.templates': 'परिणाम टेम्पलेट्स',
    'nav.import': 'एक्सेल आयात',
    'nav.settings': 'सेटिंग्स',
    'nav.teachers': 'शिक्षक पोर्टल',
    'nav.parents': 'अभिभावक पोर्टल',
    'nav.faculty': 'संकाय प्रबंधन',
    'nav.timetable': 'समय सारणी निर्माता',
    'nav.logout': 'लॉग आउट',

    // Common Actions
    'action.add': 'जोड़ें',
    'action.edit': 'संपादित करें',
    'action.delete': 'हटाएं',
    'action.save': 'सहेजें',
    'action.cancel': 'रद्द करें',
    'action.confirm': 'पुष्टि करें',
    'action.download': 'डाउनलोड',
    'action.download_pdf': 'पीडीएफ डाउनलोड करें',
    'action.export_excel': 'एक्सेल निर्यात करें',
    'action.print': 'प्रिंट करें',
    'action.search': 'खोजें...',
    'action.filter': 'फ़िल्टर',
    'action.refresh': 'ताज़ा करें',
    'action.close': 'बंद करें',
    'action.back': 'पीछे',
    'action.next': 'आगे',
    'action.publish': 'प्रकाशित करें',
    'action.save_draft': 'ड्राफ्ट सहेजें',
    'action.create_test': 'परीक्षा बनाएं',
    'action.add_student': 'छात्र जोड़ें',

    // Common Terms
    'term.class': 'कक्षा / मानक',
    'term.board': 'बोर्ड',
    'term.batch': 'बैच',
    'term.all_batches': 'सभी बैच',
    'term.subject': 'विषय',
    'term.student_name': 'छात्र का नाम',
    'term.roll_no': 'रोल नंबर',
    'term.total_students': 'कुल छात्र',
    'term.marks': 'अंक',
    'term.max_marks': 'अधिकतम अंक',
    'term.obtained': 'प्राप्तांक',
    'term.percentage': 'प्रतिशत',
    'term.grade': 'ग्रेड',
    'term.rank': 'रैंक',
    'term.status': 'स्थिति',
    'term.active': 'सक्रिय',
    'term.completed': 'उत्तीर्ण / पूर्ण',
    'term.graduated': 'स्नातक',
    'term.present': 'उपस्थित',
    'term.absent': 'अनुपस्थित',
    'term.late': 'देर से',
    'term.excused': 'अवकाश',
    'term.date': 'दिनांक',
    'term.timing': 'समय',
    'term.venue': 'स्थान',
    'term.syllabus': 'पाठ्यक्रम',
    'term.academic_year': 'शैक्षणिक वर्ष',
    'term.notice_title': 'सूचना शीर्षक',
    'term.message': 'संदेश',
    'term.digital_mode': 'डिजिटल मोड',
    'term.print_mode': 'प्रिंट मोड (कागज़)',

    // Dashboard
    'dash.welcome': 'ट्यूशन ईआरपी डैशबोर्ड',
    'dash.subtitle': 'प्रवेश, परीक्षा, उपस्थिति और शुल्क संग्रह का वास्तविक समय अवलोकन।',
    'dash.total_active_students': 'सक्रिय छात्र',
    'dash.total_classes': 'कुल कक्षाएं',
    'dash.total_tests': 'आयोजित परीक्षाएं',
    'dash.attendance_today': 'उपस्थिति दर',
    'dash.fee_collected': 'कुल शुल्क संग्रह',
    'dash.recent_notices': 'हालिया सूचनाएं',
    'dash.upcoming_tests': 'आगामी परीक्षाएं',

    // Empty States
    'empty.no_students': 'कोई छात्र नामांकित नहीं है',
    'empty.no_students_desc': 'इस कक्षा में कोई छात्र नहीं मिला। नया छात्र जोड़ने के लिए "छात्र जोड़ें" पर क्लिक करें।',
    'empty.no_filter_match': 'कोई छात्र मेल नहीं खाता',
    'empty.no_filter_match_desc': 'आपके खोज मानदंड या बैच फ़िल्टर से कोई रिकॉर्ड नहीं मिला।',
    'empty.no_tests': 'कोई परीक्षा निर्धारित नहीं है',
    'empty.no_tests_desc': 'इस कक्षा के लिए अभी तक कोई परीक्षा नहीं बनाई गई है।',
    'empty.no_notices': 'कोई सूचना प्रकाशित नहीं हुई है',
    'empty.no_notices_desc': 'छात्रों और अभिभावकों के साथ साझा करने के लिए अपनी पहली सूचना लिखें।',

    // Settings
    'settings.title': 'सेटिंग्स',
    'settings.subtitle': 'अपनी कोचिंग प्रोफ़ाइल, उपस्थिति, शैक्षणिक नीतियां और बैकअप प्रबंधित करें।',
    'settings.tab_general': '🏢 सामान्य एवं प्रोफ़ाइल',
    'settings.tab_appearance': '🎨 रूप-रंग एवं थीम',
    'settings.tab_language': '🌐 भाषा एवं स्थानीयकरण',
    'settings.tab_academic': '🎓 शैक्षणिक एवं परीक्षाएं',
    'settings.tab_notices': '📢 सूचनाएं एवं पीडीएफ',
    'settings.tab_data': '💾 डेटा एवं बैकअप',
    'settings.tab_security': '🔐 खाता एवं सुरक्षा',
  },

  gu: {
    // Nav & Pages
    'nav.dashboard': 'ડેશબોર્ડ',
    'nav.boards': 'બોર્ડ અને ધોરણો',
    'nav.students': 'પ્રવેશ અને વિદ્યાર્થીઓ',
    'nav.attendance': 'હાજરી ટ્રેકર',
    'nav.results': 'પરિણામ પેનલ',
    'nav.tests': 'પરીક્ષા આયોજક',
    'nav.reminders': 'સૂચનાઓ અને રિમાઇન્ડર',
    'nav.promotions': 'પ્રમોશન અને જાહેરાત',
    'nav.templates': 'પરિણામ નમૂનાઓ',
    'nav.import': 'એક્સેલ આયાત',
    'nav.settings': 'સેટિંગ્સ',
    'nav.teachers': 'શિક્ષક પોર્ટલ',
    'nav.parents': 'વાલી પોર્ટલ',
    'nav.faculty': 'ફેકલ્ટી સંચાલન',
    'nav.timetable': 'સમયપત્રક બિલ્ડર',
    'nav.logout': 'સાઇન આઉટ',

    // Common Actions
    'action.add': 'ઉમેરો',
    'action.edit': 'સંપાદિત કરો',
    'action.delete': 'કાઢી નાખો',
    'action.save': 'સાચવો',
    'action.cancel': 'રદ કરો',
    'action.confirm': 'ખાતરી કરો',
    'action.download': 'ડાઉનલોડ',
    'action.download_pdf': 'પીડીએફ ડાઉનલોડ',
    'action.export_excel': 'એક્સેલ નિકાસ',
    'action.print': 'પ્રિન્ટ કરો',
    'action.search': 'શોધો...',
    'action.filter': 'ફિલ્ટર',
    'action.refresh': 'તાજું કરો',
    'action.close': 'બંધ કરો',
    'action.back': 'પાછળ',
    'action.next': 'આગળ',
    'action.publish': 'પ્રકાશિત કરો',
    'action.save_draft': 'ડ્રાફ્ટ સાચવો',
    'action.create_test': 'પરીક્ષા બનાવો',
    'action.add_student': 'વિદ્યાર્થી ઉમેરો',

    // Common Terms
    'term.class': 'ધોરણ / વર્ગ',
    'term.board': 'બોર્ડ',
    'term.batch': 'બેચ',
    'term.all_batches': 'બધી બેચ',
    'term.subject': 'વિષય',
    'term.student_name': 'વિદ્યાર્થીનું નામ',
    'term.roll_no': 'રોલ નંબર',
    'term.total_students': 'કુલ વિદ્યાર્થીઓ',
    'term.marks': 'ગુણ',
    'term.max_marks': 'મહત્તમ ગુણ',
    'term.obtained': 'મેળવેલ ગુણ',
    'term.percentage': 'ટકાવારી',
    'term.grade': 'ગ્રેડ',
    'term.rank': 'ક્રમાંક (રેન્ક)',
    'term.status': 'સ્થિતિ',
    'term.active': 'સક્રિય',
    'term.completed': 'પૂર્ણ / પાસ',
    'term.graduated': 'ઉત્તીર્ણ',
    'term.present': 'હાજર',
    'term.absent': 'ગેરહાજર',
    'term.late': 'મોડું',
    'term.excused': 'રજા',
    'term.date': 'તારીખ',
    'term.timing': 'સમય',
    'term.venue': 'સ્થળ',
    'term.syllabus': 'અભ્યાસક્રમ',
    'term.academic_year': 'શૈક્ષણિક વર્ષ',
    'term.notice_title': 'સૂચના શીર્ષક',
    'term.message': 'સંદેશ',
    'term.digital_mode': 'ડિજિટલ મોડ',
    'term.print_mode': 'પ્રિન્ટ મોડ (કાગળ)',

    // Dashboard
    'dash.welcome': 'ટ્યુશન ERP ડેશબોર્ડ',
    'dash.subtitle': 'પ્રવેશ, પરીક્ષા, હાજરી અને ફી વસૂલાતનું રીઅલ-ટાઇમ વિહંગાવલોકન.',
    'dash.total_active_students': 'સક્રિય વિદ્યાર્થીઓ',
    'dash.total_classes': 'કુલ ધોરણો',
    'dash.total_tests': 'યોજાયેલ પરીક્ષાઓ',
    'dash.attendance_today': 'હાજરી દર',
    'dash.fee_collected': 'કુલ ફી વસૂલાત',
    'dash.recent_notices': 'તાજેતરની સૂચનાઓ',
    'dash.upcoming_tests': 'આગામી પરીક્ષાઓ',

    // Empty States
    'empty.no_students': 'કોઈ વિદ્યાર્થી નોંધાયેલ નથી',
    'empty.no_students_desc': 'આ ધોરણમાં કોઈ વિદ્યાર્થી મળ્યો નથી. વિદ્યાર્થી ઉમેરવા માટે "વિદ્યાર્થી ઉમેરો" પર ક્લિક કરો.',
    'empty.no_filter_match': 'કોઈ વિદ્યાર્થી મળ્યો નથી',
    'empty.no_filter_match_desc': 'તમારી શોધ કે બેચ ફિલ્ટર સાથે કોઈ પરિણામ મેળ ખાતું નથી.',
    'empty.no_tests': 'કોઈ પરીક્ષા નિર્ધારિત નથી',
    'empty.no_tests_desc': 'આ ધોરણ માટે હજુ સુધી કોઈ પરીક્ષા બનાવવામાં આવી નથી.',
    'empty.no_notices': 'કોઈ સૂચના પ્રકાશિત નથી',
    'empty.no_notices_desc': 'વિદ્યાર્થીઓ અને વાલીઓ સાથે શેર કરવા માટે તમારી પ્રથમ સૂચના લખો.',

    // Settings
    'settings.title': 'સેટિંગ્સ',
    'settings.subtitle': 'તમારી સંસ્થા પ્રોફાઇલ, થીમ, શૈક્ષણિક નીતિઓ અને ડેટા બેકઅપ મેનેજ કરો.',
    'settings.tab_general': '🏢 સામાન્ય અને પ્રોફાઇલ',
    'settings.tab_appearance': '🎨 થીમ અને રંગો',
    'settings.tab_language': '🌐 ભાષા અને લોકલાઇઝેશન',
    'settings.tab_academic': '🎓 શૈક્ષણિક અને પરીક્ષાઓ',
    'settings.tab_notices': '📢 સૂચનાઓ અને પીડીએફ',
    'settings.tab_data': '💾 ડેટા અને બેકઅપ',
    'settings.tab_security': '🔐 એકાઉન્ટ અને સુરક્ષા',
  }
};

const I18n = {
  currentLang: localStorage.getItem('app_language') || localStorage.getItem('notice_language') || 'en',

  t(key, fallback = '') {
    const langDict = I18N_DICTIONARY[this.currentLang] || I18N_DICTIONARY.en;
    if (langDict && langDict[key]) return langDict[key];
    const enDict = I18N_DICTIONARY.en;
    return (enDict && enDict[key]) || fallback || key;
  },

  setLanguage(lang) {
    if (!['en', 'hi', 'gu'].includes(lang)) lang = 'en';
    this.currentLang = lang;
    localStorage.setItem('app_language', lang);
    localStorage.setItem('notice_language', lang);
    document.documentElement.lang = lang;

    // Apply translations to static sidebar/header elements
    this.translateDOM();

    // Trigger toast notification
    const langNames = { en: '🇬🇧 English', hi: '🇮🇳 हिंदी (Hindi)', gu: '🇮🇳 ગુજરાતી (Gujarati)' };
    if (window.Toast) {
      Toast.info('Language Updated', `Application language set to ${langNames[lang]}.`);
    }

    // Re-render current page to apply strings
    if (window.Router && window.Router.current && typeof window.Router.navigate === 'function') {
      window.Router.navigate(window.Router.current);
    }
  },

  translateDOM() {
    // Translate all elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = this.t(key, el.textContent);
    });

    // Translate sidebar navigation links
    const navMap = {
      'dashboard': 'nav.dashboard',
      'boards': 'nav.boards',
      'students': 'nav.students',
      'attendance': 'nav.attendance',
      'results': 'nav.results',
      'tests': 'nav.tests',
      'reminders': 'nav.reminders',
      'promotions': 'nav.promotions',
      'templates': 'nav.templates',
      'import': 'nav.import',
      'settings': 'nav.settings',
      'teachers': 'nav.teachers',
      'parents': 'nav.parents',
      'faculty': 'nav.faculty',
      'timetable': 'nav.timetable',
    };

    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      const page = item.getAttribute('data-page');
      if (navMap[page]) {
        const textSpan = item.querySelector('.nav-label') || item.querySelector('span:not(.nav-icon):not(.nav-badge)');
        if (textSpan) {
          textSpan.textContent = this.t(navMap[page]);
        }
      }
    });

    // Translate logout button
    const logoutBtn = document.getElementById('logout-btn') || document.getElementById('sidebar-logout-btn');
    if (logoutBtn) {
      const span = logoutBtn.querySelector('.nav-label') || logoutBtn.querySelector('span:last-child');
      if (span) span.textContent = this.t('nav.logout');
    }
  }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  I18n.translateDOM();
});

window.I18n = I18n;
window.t = (key, fallback) => I18n.t(key, fallback);
