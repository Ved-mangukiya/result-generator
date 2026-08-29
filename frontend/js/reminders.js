/* ═══════════════════════════════════════════════
   REMINDERS.JS — Notices & Reminders Module
   12 Notice Types · Saved Notices · PDF Export
   ═══════════════════════════════════════════════ */

let _currentReminderTab = 'notices';
let _noticeType = 'vacation';
let _editingNoticeId = null;
let _savedNotices = [];
let _noticePrintMode = 'digital'; // 'digital' or 'print'

let _noticeLanguage = 'en';

// ─── 42+ Comprehensive Notice & Reminder Type Definitions (Schools, Tutors & Colleges) ───
const NOTICE_TYPES = [
  // ── Academic & Exam Notices ──
  { id: 'exam_schedule',       label: 'Exam Timetable',         emoji: '📅', color: '#6366f1', category: 'Academic', desc: 'Subject-wise exam schedule grid' },
  { id: 'test_reminder',       label: 'Test / Quiz Alert',      emoji: '📝', color: '#2563eb', category: 'Academic', desc: 'Upcoming unit test or weekly quiz' },
  { id: 'result_announcement', label: 'Result Published',       emoji: '🎉', color: '#8b5cf6', category: 'Academic', desc: 'Test results published notification' },
  { id: 'achievement',         label: 'Achievement / Toppers',  emoji: '🏆', color: '#d97706', category: 'Academic', desc: 'Top scorer honor roll & medals' },
  { id: 'syllabus_update',     label: 'Syllabus Coverage',      emoji: '📖', color: '#0891b2', category: 'Academic', desc: 'Topics covered & upcoming syllabus' },
  { id: 'ptm',                 label: 'PTM Invitation',         emoji: '🎓', color: '#059669', category: 'Academic', desc: 'Parent-Teacher Meeting invitation' },
  { id: 'homework',            label: 'Homework Deadline',      emoji: '✍️', color: '#ea580c', category: 'Academic', desc: 'Pending homework & project deadline' },
  { id: 'practical_lab',       label: 'Lab & Practical Class',   emoji: '🧪', color: '#0284c7', category: 'Academic', desc: 'Science & computer lab sessions' },
  { id: 'extra_class',         label: 'Extra Special Class',    emoji: '⚡', color: '#ca8a04', category: 'Academic', desc: 'Weekend & holiday extra coaching' },
  { id: 'book_distribution',   label: 'Book & Material Alert',  emoji: '🎒', color: '#4f46e5', category: 'Academic', desc: 'Study module & book kit collection' },

  // ── Higher Education, College & University Notices ──
  { id: 'sem_exam',            label: 'Semester Exam & Hall Ticket', emoji: '🎓', color: '#4f46e5', category: 'College & Uni', desc: 'University semester exam & admit card alert' },
  { id: 'atkt_backlog',        label: 'ATKT / Backlog Form',        emoji: '📋', color: '#dc2626', category: 'College & Uni', desc: 'Remedial / ATKT backlog exam registration' },
  { id: 'campus_placement',    label: 'Campus Placement & Jobs',    emoji: '💼', color: '#059669', category: 'College & Uni', desc: 'Recruitment drive & interview schedule' },
  { id: 'project_submission',  label: 'Project & Dissertation',      emoji: '🔬', color: '#0284c7', category: 'College & Uni', desc: 'Final year thesis & viva voce deadline' },
  { id: 'convocation',         label: 'Convocation Ceremony',       emoji: '🎓', color: '#d97706', category: 'College & Uni', desc: 'Annual convocation & degree distribution' },
  { id: 'dean_advisory',       label: 'Dean / HOD Official Notice', emoji: '🏛️', color: '#1e40af', category: 'College & Uni', desc: 'Departmental & Dean office directive' },
  { id: 'library_fine',        label: 'Library Book & Fine Alert',   emoji: '📚', color: '#ca8a04', category: 'College & Uni', desc: 'Return overdue books & clear library dues' },
  { id: 'hostel_notice',       label: 'Hostel Admission & Mess Fee', emoji: '🏢', color: '#7c3aed', category: 'College & Uni', desc: 'Hostel allotment & mess fee deadline' },
  { id: 'mid_sem',             label: 'Mid-Sem Internal Exam',      emoji: '📝', color: '#2563eb', category: 'College & Uni', desc: 'Internal continuous evaluation exam' },
  { id: 'youth_fest',          label: 'Youth Fest & Tech Symposium', emoji: '🎯', color: '#db2777', category: 'College & Uni', desc: 'Inter-college sports, cultural & tech fest' },

  // ── Fees & Administration Notices ──
  { id: 'fee_due',             label: 'Fee Due Reminder',       emoji: '💰', color: '#ef4444', category: 'Fees & Admin', desc: 'Upcoming tuition fee installment' },
  { id: 'fee_overdue',         label: 'Overdue Fee Notice',     emoji: '⚠️', color: '#b91c1c', category: 'Fees & Admin', desc: 'Urgent late fee warning notice' },
  { id: 'fee_receipt',         label: 'Payment Confirmation',   emoji: '🧾', color: '#15803d', category: 'Fees & Admin', desc: 'Tuition fee payment confirmation' },
  { id: 'hall_ticket',         label: 'Hall Ticket / Admit Card',emoji: '🎫', color: '#7c3aed', category: 'Fees & Admin', desc: 'Exam hall ticket collection alert' },
  { id: 'document_submission', label: 'Document Submission',    emoji: '📋', color: '#0369a1', category: 'Fees & Admin', desc: 'Pending marksheet or photo collection' },
  { id: 'id_card',             label: 'Student ID Card Notice',  emoji: '🆔', color: '#4338ca', category: 'Fees & Admin', desc: 'ID card issuance & renewal notice' },

  // ── Attendance, Conduct & Discipline Notices ──
  { id: 'attendance_warning',  label: 'Low Attendance Alert',   emoji: '⚠️', color: '#c2410c', category: 'Conduct', desc: 'Shortage of attendance alert letter' },
  { id: 'discipline_warning',  label: 'Discipline Notice',      emoji: '🚨', color: '#991b1b', category: 'Conduct', desc: 'Official disciplinary warning notice' },
  { id: 'mobile_ban',          label: 'Mobile Phone Warning',   emoji: '📱', color: '#9333ea', category: 'Conduct', desc: 'Classroom mobile phone ban reminder' },
  { id: 'uniform_code',        label: 'Dress Code & Decorum',   emoji: '👗', color: '#0d9488', category: 'Conduct', desc: 'Uniform & ID card mandatory rule' },

  // ── Vacations, Holidays & Events ──
  { id: 'vacation',            label: 'Vacation Notice',        emoji: '🌴', color: '#10b981', category: 'Holidays', desc: 'Diwali, Summer & Winter break' },
  { id: 'holiday',             label: 'Single Day Holiday',     emoji: '🛑', color: '#dc2626', category: 'Holidays', desc: 'Festival or national holiday closure' },
  { id: 'weather_emergency',   label: 'Weather Emergency Break',emoji: '🌧️', color: '#1e40af', category: 'Holidays', desc: 'Heavy rain & emergency closure alert' },
  { id: 'picnic_tour',         label: 'Educational Picnic Tour',emoji: '🚌', color: '#eab308', category: 'Holidays', desc: 'Outdoor trip & consent form notice' },
  { id: 'annual_event',        label: 'Annual Function / Sports',emoji: '🎭', color: '#db2777', category: 'Holidays', desc: 'Cultural event & sports day invite' },
  { id: 'batch_start',         label: 'New Batch Commencement', emoji: '🚀', color: '#f59e0b', category: 'Holidays', desc: 'Orientation & new batch start date' },

  // ── Timing Changes & Complaints ──
  { id: 'time_change',         label: 'Class Timing Change',    emoji: '🕐', color: '#7c3aed', category: 'Services', desc: 'Lecture timing shift or batch shuffle' },
  { id: 'faculty_absence',     label: 'Faculty Substitution',   emoji: '👩‍🏫', color: '#65a30d', category: 'Services', desc: 'Faculty change or lecture cancellation' },
  { id: 'parent_complaint',    label: 'Parent Inquiry Response',emoji: '📩', color: '#475569', category: 'Services', desc: 'Response to parent feedback/complaint' },
  { id: 'doubt_desk',          label: 'Doubt Clearing Session',  emoji: '💡', color: '#059669', category: 'Services', desc: 'Special 1-on-1 doubt session desk' },
  { id: 'transport_notice',    label: 'Transport / Bus Alert',   emoji: '🚐', color: '#d97706', category: 'Services', desc: 'Academy van & transport route update' },
  { id: 'general',             label: 'General Bulletin',       emoji: '📢', color: '#64748b', category: 'Services', desc: 'General institute announcements' },
];

// ─── Multi-Language Presets Dictionary (English, Hindi & Gujarati) ───
const NOTICE_LANG_PRESETS = {
  en: {
    vacation: { title: '🌴 Vacation Announcement — Holiday Notice', msg: 'Dear Students & Parents, the institute will remain closed for vacations during the mentioned dates. Regular lectures will resume on the reopening date.' },
    exam_schedule: { title: '📅 Examination Timetable & Schedule', msg: 'Please find the detailed examination schedule below. All students are advised to prepare accordingly and bring their ID cards.' },
    sem_exam: { title: '🎓 University Semester Examination & Hall Ticket Notice', msg: 'The University Semester Examinations are scheduled. Download and collect your Hall Tickets / Admit Cards from the college office.' },
    atkt_backlog: { title: '📋 ATKT / Backlog Examination Form Submission', msg: 'Students with active ATKT / Backlog subjects must submit their exam registration forms and fees before the deadline.' },
    campus_placement: { title: '💼 Campus Placement Drive & Internship Notice', msg: 'A campus recruitment drive is organized for final-year students. Submit your updated resumes at the Placement Cell.' },
    project_submission: { title: '🔬 Project & Dissertation Submission Deadline', msg: 'Final-year students must submit their hardcopy project report and dissertation by the specified due date.' },
    convocation: { title: '🎓 Convocation Ceremony & Degree Distribution', msg: 'Degree distribution and annual convocation ceremony notice for graduating batch students.' },
    dean_advisory: { title: '🏛️ Dean / HOD Office Official Advisory Notice', msg: 'Official directive from the Dean & HOD office regarding academic regulations, discipline, and attendance.' },
    library_fine: { title: '📚 University Library Book Return & Clearance Alert', msg: 'Return all borrowed library books before term end to avoid daily late fee fines and clearance hold.' },
    hostel_notice: { title: '🏢 Campus Hostel Allotment & Mess Fee Notice', msg: 'Hostel residents are required to clear pending mess bills and hostel term fees immediately.' },
    mid_sem: { title: '📝 Mid-Semester Internal Assessment Schedule', msg: 'Mid-semester continuous evaluation tests will be conducted as per the attached timetable.' },
    youth_fest: { title: '🎯 Inter-College Youth Festival & Tech Symposium', msg: 'Registration is open for inter-college cultural, sports, and technical competitions.' },
    fee_due: { title: '💰 Tuition Fee Payment Reminder', msg: 'Kindly clear the upcoming tuition fee installment before the due date to avoid late charges.' },
    fee_overdue: { title: '⚠️ URGENT: Overdue Tuition Fee Notice', msg: 'Your tuition fee is overdue. Please clear the pending amount immediately.' },
    ptm: { title: '🎓 Parent-Teacher Meeting (PTM) — Invitation', msg: 'Dear Parents, you are cordially invited to the PTM to discuss your child\'s academic performance.' },
    holiday: { title: '🛑 Holiday Notice — Institute Closed', msg: 'Kindly note that the institute will remain closed on the specified date. Regular classes resume the next day.' },
    test_reminder: { title: '📝 Test Reminder — Be Prepared!', msg: 'Upcoming unit test reminder. Make sure to prepare the syllabus thoroughly.' },
    general: { title: '📢 Official Announcement & Circular', msg: 'Dear Students and Parents, please note the official notice details below.' }
  },
  hi: {
    vacation: { title: '🌴 अवकाश घोषणा — छुट्टियों की सूचना', msg: 'प्रिय छात्रों एवं अभिभावकों, संस्थान उल्लेखित तिथियों के दौरान अवकाश हेतु बंद रहेगा। नियमित कक्षाएं पुनः खुलने की तिथि से शुरू होंगी।' },
    exam_schedule: { title: '📅 परीक्षा समय सारणी और तिथियां', msg: 'कृपया नीचे दी गई विस्तृत परीक्षा समय-सारणी देखें। सभी छात्रों को तदनुसार तैयारी करने और अपना पहचान पत्र साथ लाने की सलाह दी जाती है।' },
    sem_exam: { title: '🎓 विश्वविद्यालय सेमेस्टर परीक्षा एवं प्रवेश पत्र (Hall Ticket) सूचना', msg: 'विश्वविद्यालय सेमेस्टर परीक्षाएं आयोजित होने जा रही हैं। छात्र कॉलेज कार्यालय से अपना हॉल टिकट प्राप्त करें।' },
    atkt_backlog: { title: '📋 एटीकेटी / बैकलोग परीक्षा फॉर्म जमा करने की अंतिम तिथि', msg: 'एटीकेटी / बैकलोग विषय वाले छात्र अंतिम तिथि से पहले अपना परीक्षा फॉर्म और शुल्क जमा करें।' },
    campus_placement: { title: '💼 कैंपस प्लेसमेंट ड्राइव एवं इंटर्नशिप सूचना', msg: 'अंतिम वर्ष के छात्रों के लिए कैंपस रिक्रूटमेंट ड्राइव का आयोजन किया जा रहा है। प्लेसमेंट सेल में अपना बायोडाटा जमा करें।' },
    project_submission: { title: '🔬 प्रोजेक्ट एवं शोध प्रबंध (Dissertation) जमा करने की सूचना', msg: 'अंतिम वर्ष के छात्रों को निर्धारित तिथि तक अपनी प्रोजेक्ट रिपोर्ट एवं थीसिस जमा करना अनिवार्य है।' },
    convocation: { title: '🎓 दीक्षांत समारोह एवं उपाधि प्रमाण पत्र वितरण', msg: 'उत्तीर्ण छात्रों के लिए वार्षिक दीक्षांत समारोह एवं डिग्री वितरण कार्यक्रम की आधिकारिक सूचना।' },
    dean_advisory: { title: '🏛️ डीन / विभागाध्यक्ष (HOD) कार्यालय आधिकारिक सूचना', msg: 'अकादमिक नियमों, अनुशासन एवं उपस्थिति के संबंध में डीन कार्यालय द्वारा जारी निर्देश।' },
    library_fine: { title: '📚 केंद्रीय पुस्तकालय पुस्तक वापसी एवं बकाया शुल्क चेतावनी', msg: 'विलंब शुल्क से बचने के लिए पुस्तकालय से ली गई सभी पुस्तकें समय पर वापस करें।' },
    hostel_notice: { title: '🏢 छात्रवास (Hostel) प्रवेश एवं मेस शुल्क भुगतान सूचना', msg: 'छात्रावास में रहने वाले छात्र अपने बकाये मेस बिल और छात्रावास शुल्क का तत्काल भुगतान करें।' },
    mid_sem: { title: '📝 मिड-सेमेस्टर आंतरिक मूल्यांकन परीक्षा सारणी', msg: 'मिड-सेमेस्टर आंतरिक मूल्यांकन परीक्षाएं संलग्न समय-सारणी के अनुसार आयोजित की जाएंगी।' },
    youth_fest: { title: '🎯 अंतर-महाविद्यालयीन यूथ फेस्टिवल एवं टेक-सिम्पोजियम', msg: 'सांस्कृतिक, खेल एवं तकनीकी प्रतियोगिताओं के लिए पंजीकरण प्रारंभ हो चुका है।' },
    fee_due: { title: '💰 शिक्षण शुल्क (Tuition Fee) भुगतान स्मरण पत्र', msg: 'कृपया बिलंब शुल्क से बचने के लिए देय तिथि से पहले अपनी आगामी किस्त का भुगतान करें।' },
    fee_overdue: { title: '⚠️ अति आवश्यक: बकाया शिक्षण शुल्क अंतिम चेतावनी', msg: 'आपका शिक्षण शुल्क देय तिथि से अधिक समय से बकाया है। कृपया तुरंत शेष राशि का भुगतान करें।' },
    ptm: { title: '🎓 अभिभावक-शिक्षक बैठक (PTM) निमंत्रण', msg: 'आदरणीय अभिभावक, अपने बच्चे की शैक्षणिक प्रगति पर चर्चा हेतु पीटीएम में सादर आमंत्रित हैं।' },
    holiday: { title: '🛑 अवकाश सूचना — संस्थान बंद रहेगा', msg: 'कृपया ध्यान दें कि उल्लेखित तिथि को संस्थान में पूर्ण अवकाश रहेगा।' },
    test_reminder: { title: '📝 आगामी परीक्षा स्मरण — तैयारी रखें!', msg: 'आगामी इकाई परीक्षा की सूचना। सभी छात्र पाठ्यक्रम के अनुसार तैयारी सुनिश्चित करें।' },
    general: { title: '📢 आधिकारिक घोषणा एवं परिपत्र', msg: 'प्रिय छात्रों एवं अभिभावकों, कृपया नीचे दी गई आधिकारिक सूचना को ध्यानपूर्वक पढ़ें।' }
  },
  gu: {
    vacation: { title: '🌴 વેકેશન જાહેરનામું — રજાઓની સત્તાવાર નોટિસ', msg: 'વાલીઓ અને વિદ્યાર્થીઓ જોગ, જણાવેલ તારીખો દરમિયાન સંસ્થામાં વેકેશનની રજા રહેશે. વર્ગો નિયમિત તારીખથી ફરી શરૂ થશે.' },
    exam_schedule: { title: '📅 પરીક્ષા ટાઈમટેબલ અને સમયપત્રક', msg: 'નીચે આપેલ પરીક્ષાનું સમયપત્રક ધ્યાનપૂર્વક જુઓ અને તે મુજબ તૈયારી કરવા વિનંતી. આઈડી કાર્ડ સાથે રાખવું.' },
    sem_exam: { title: '🎓 યુનિવર્સિટી સેમેસ્ટર પરીક્ષા અને હોલ ટિકિટ નોટિસ', msg: 'યુનિવર્સિટી સેમેસ્ટર પરીક્ષા જાહેર થયેલ છે. તમામ વિદ્યાર્થીઓએ કૉલેજ ઑફિસમાંથી હોલ ટિકિટ મેળવી લેવી.' },
    atkt_backlog: { title: '📋 ATKT / બેકલોગ પરીક્ષા ફોર્મ ભરાવવાની નોટિસ', msg: 'ATKT / બેકલોગ વિષય ધરાવતા વિદ્યાર્થીઓએ છેલ્લી તારીખ પહેલા પરીક્ષા ફોર્મ અને ફી ભરી દેવી.' },
    campus_placement: { title: '💼 કેમ્પસ પ્લેસમેન્ટ ડ્રાઇવ અને ઇન્ટર્નશિપ જાહેરખબર', msg: 'છેલ્લા વર્ષના વિદ્યાર્થીઓ માટે પ્લેસમેન્ટ ડ્રાઇવનું આયોજન છે. પ્લેસમેન્ટ સેલમાં રીઝ્યુમ જમા કરાવવો.' },
    project_submission: { title: '🔬 પ્રોજેક્ટ વર્ક અને સબમિશનની છેલ્લી તારીખ', msg: 'છેલ્લા વર્ષના વિદ્યાર્થીઓએ નિયત તારીખ સુધીમાં પ્રોજેક્ટ રિપોર્ટ અને બાઇન્ડિંગ કોપી સબમિટ કરવી.' },
    convocation: { title: '🎓 પદવીદાન સમારોહ (Convocation) અને ડિગ્રી વિતરણ', msg: 'ઉત્તીર્ણ વિદ્યાર્થીઓ માટે વાર્ષિક પદવીદાન સમારોહ અને ડિગ્રી સર્ટિફિકેટ વિતરણની નોટિસ.' },
    dean_advisory: { title: '🏛️ ડીન / HOD ઑફિસ સત્તાવાર સુચના પરિપત્ર', msg: 'શૈક્ષણિક નિયમો અને હાજરી અંગે ડીન ઑફિસ તરફથી બહાર પાડવામાં આવેલ સત્તાવાર પરિપત્ર.' },
    library_fine: { title: '📚 લાઈબ્રેરી પુસ્તક પરત અને લેટ ફી પેનલ્ટી નોટિસ', msg: 'લેટ ફી દંડથી બચવા માટે લાઇબ્રેરીમાંથી લીધેલ પુસ્તકો મુદત પૂરી થતા પહેલા પરત કરવા.' },
    hostel_notice: { title: '🏢 હોસ્ટેલ પ્રવેશ અને મેસ ફી બાકી ચૂકવણી નોટિસ', msg: 'હોસ્ટેલમાં રહેતા વિદ્યાર્થીઓએ બાકી હોસ્ટેલ અને મેસ ફી તાત્કાલિક ભરી દેવી.' },
    mid_sem: { title: '📝 મિડ-સેમેસ્ટર ઇન્ટરનલ પરીક્ષા ટાઈમટેબલ', msg: 'મિડ-સેમ ઇન્ટરનલ મૂલ્યાંકન પરીક્ષાઓ જોડવામાં આવેલ સમયપત્રક મુજબ લેવામાં આવશે.' },
    youth_fest: { title: '🎯 આંતર-કૉલેજ યુથ ફેસ્ટિવલ અને ટેક સમિટ', msg: 'સાંસ્કૃતિક, રમતગમત અને ટેકનિકલ સ્પર્ધાઓ માટે રજીસ્ટ્રેશન શરૂ થઈ ગયેલ છે.' },
    fee_due: { title: '💰 ટ્યુશન ફી ચુકવણી યાદી પત્ર', msg: 'લેટ ફીથી બચવા માટે આગામી ફીનો હપ્તો સમયસર જમા કરાવવા વિનંતી.' },
    fee_overdue: { title: '⚠️ અતિ અગત્યનું: બાકી ટ્યુશન ફી આખરી નોટિસ', msg: 'તમારી ટ્યુશન ફીની તારીખ વિતી ગયેલ છે. કૃપા કરીને બાકી રકમ ત્વરિત જમા કરાવો.' },
    ptm: { title: '🎓 વાલી-શિક્ષક મીટિંગ (PTM) નિમંત્રણ નોટિસ', msg: 'આદરણીય વાલીશ્રી, આપના બાળકની શૈક્ષણિક પ્રગતિની ચર્ચા માટે PTM માં પધારવા હાર્દિક નિમંત્રણ છે.' },
    holiday: { title: '🛑 રજાની નોટિસ — સંસ્થા બંધ રહેશે', msg: 'ખાસ નોંધ લેવી કે ઉપર દર્શાવેલ તારીખે સંસ્થામાં સત્તાવાર રજા રહેશે.' },
    test_reminder: { title: '📝 આગામી ટેસ્ટ રીમાઇન્ડર — તૈયારી રાખવી!', msg: 'આગામી યુનિટ ટેસ્ટની જાહેરાત. તમામ વિદ્યાર્થીઓએ અભ્યાસક્રમ મુજબ તૈયારી રાખવી.' },
    general: { title: '📢 સત્તાવાર પરિપત્ર અને જાહેરાત', msg: 'વાલીઓ અને વિદ્યાર્થીઓ જોગ, કૃપા કરીને નીચે દર્શાવેલ સત્તાવાર વિગતો ધ્યાને લેવી.' }
  }
};

function renderReminders(params = {}) {
  setPageTitle('Notices & Reminders', 'Notices & Reminders');

  if (params && params.tab) {
    _currentReminderTab = params.tab;
  } else if (params && params.testId) {
    _currentReminderTab = 'compose';
    _noticeType = 'exam_schedule';
  } else {
    _currentReminderTab = 'notices';
  }

  document.getElementById('page-content').innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Notices &amp; Reminders</h1>
        <p>Create, manage, and publish notice PDFs across 12 categories — from vacation announcements to PTM invitations.</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary btn-sm" onclick="switchReminderTab('compose')">
          ✏️ Compose Notice
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs mb-6">
      <button class="tab-btn ${_currentReminderTab === 'notices' ? 'active' : ''}" id="rem-tab-notices" onclick="switchReminderTab('notices')">📋 Saved Notices</button>
      <button class="tab-btn ${_currentReminderTab === 'compose' ? 'active' : ''}" id="rem-tab-compose" onclick="switchReminderTab('compose')">✏️ Compose New Notice</button>
    </div>

    <!-- Tab Content Containers -->
    <div id="rem-panel-notices" style="${_currentReminderTab === 'notices' ? '' : 'display:none;'}"></div>
    <div id="rem-panel-compose" style="${_currentReminderTab === 'compose' ? '' : 'display:none;'}"></div>
  `;

  if (_currentReminderTab === 'notices') renderNoticesList();
  else if (_currentReminderTab === 'compose') renderComposePanel(params);
}

function switchReminderTab(tab, params = {}) {
  _currentReminderTab = tab;

  // Update tab active state
  ['notices','compose'].forEach(t => {
    const btn = document.getElementById(`rem-tab-${t}`);
    if (btn) {
      btn.classList.toggle('active', t === tab);
    }
  });

  // Show/hide panels
  const panels = { 'notices': 'rem-panel-notices', 'compose': 'rem-panel-compose' };
  Object.entries(panels).forEach(([t, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = t === tab ? '' : 'none';
  });

  // Render content
  if (tab === 'notices') renderNoticesList();
  else if (tab === 'compose') renderComposePanel(params);
}

// ─── Saved Notices List ───────────────────────────────────────────────────

async function renderNoticesList() {
  const container = document.getElementById('rem-panel-notices');
  if (!container) return;
  container.innerHTML = `<div class="flex justify-center py-8"><div class="spinner"></div></div>`;
  try {
    const res = await API.reminderNotices.list();
    _savedNotices = res.notices || [];
    container.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 280px; gap:24px; align-items:start;">
        <!-- Notices Grid -->
        <div>
          ${_savedNotices.length === 0 ? `
            <div class="card" style="text-align:center; padding:60px 40px;">
              <div style="font-size:3rem; margin-bottom:16px;">📋</div>
              <h3 style="margin-bottom:8px;">No notices yet</h3>
              <p class="text-muted text-sm" style="margin-bottom:20px;">Compose your first notice to share with students and parents.</p>
              <button class="btn btn-primary" onclick="switchReminderTab('compose')">✏️ Compose First Notice</button>
            </div>
          ` : `
            <div style="display:flex; flex-direction:column; gap:12px;">
              ${_savedNotices.map(n => {
                const typeInfo = NOTICE_TYPES.find(t => t.id === n.type) || NOTICE_TYPES[3];
                const statusColor = n.status === 'Published' ? '#16a34a' : n.status === 'Draft' ? '#d97706' : '#6366f1';
                const date = n.created_at ? new Date(n.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
                return `
                  <div class="card" style="border-left:4px solid ${typeInfo.color}; transition:box-shadow 0.2s ease;" onmouseenter="this.style.boxShadow='0 8px 24px rgba(0,0,0,0.12)'" onmouseleave="this.style.boxShadow=''">
                    <div style="padding:16px 20px; display:flex; align-items:center; gap:16px;">
                      <div style="width:44px;height:44px;border-radius:12px;background:${typeInfo.color}15;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">${typeInfo.emoji}</div>
                      <div style="flex:1; min-width:0;">
                        <div style="font-weight:700; font-size:0.95rem; color:var(--text-primary); margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${n.title}</div>
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                          <span style="font-size:0.75rem; color:${typeInfo.color}; font-weight:600; background:${typeInfo.color}15; padding:2px 8px; border-radius:50px;">${typeInfo.emoji} ${typeInfo.label}</span>
                          <span style="font-size:0.75rem; color:${statusColor}; font-weight:600; background:${statusColor}15; padding:2px 8px; border-radius:50px;">${n.status}</span>
                          <span style="font-size:0.73rem; color:var(--text-muted);">📅 ${date}</span>
                        </div>
                      </div>
                      <div style="display:flex; gap:8px; flex-shrink:0;">
                        ${n.status !== 'Published' ? `<button class="btn btn-outline btn-sm" onclick="publishNotice(${n.id})" title="Publish">✅ Publish</button>` : ''}
                        <button class="btn btn-outline btn-sm" onclick="editNotice(${n.id})" title="Edit">✏️</button>
                        <button class="btn btn-outline btn-sm" onclick="downloadNoticePDF(${n.id})" title="Download PDF">⬇️ PDF</button>
                        <button class="btn btn-ghost btn-icon-sm" onclick="confirmDeleteNotice(${n.id})" style="color:var(--danger);" title="Delete">🗑</button>
                      </div>
                    </div>
                  </div>`;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Quick Type Selector (32 Types) -->
        <div class="card" style="height:fit-content; max-height:760px; display:flex; flex-direction:column;">
          <div class="card-header" style="padding:14px 16px;"><h3>📋 Quick Compose (32 Types)</h3></div>
          <div class="card-body" style="padding:10px; overflow-y:auto; flex:1;">
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${NOTICE_TYPES.map(t => `
                <button onclick="switchReminderTab('compose'); setTimeout(()=>selectNoticeType('${t.id}'),100);"
                  style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:10px;background:var(--bg-surface);cursor:pointer;text-align:left;transition:all 0.2s ease;width:100%;"
                  onmouseenter="this.style.background='${t.color}15';this.style.borderColor='${t.color}60'"
                  onmouseleave="this.style.background='var(--bg-surface)';this.style.borderColor='var(--border)'">
                  <span style="font-size:1.15rem;">${t.emoji}</span>
                  <div style="min-width:0;flex:1;">
                    <div style="font-weight:700;font-size:0.8rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.label}</div>
                    <div style="font-size:0.68rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.desc}</div>
                  </div>
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="card"><div class="card-body text-center text-danger">Failed to load notices: ${err.message}</div></div>`;
  }
}

// ─── Compose Panel ────────────────────────────────────────────────────────

function setNoticeLanguage(lang) {
  _noticeLanguage = lang;
  ['en', 'hi', 'gu'].forEach(l => {
    const btn = document.getElementById(`btn-lang-${l}`);
    if (btn) {
      btn.className = `btn btn-sm ${l === lang ? 'btn-primary' : 'btn-outline'}`;
    }
  });

  const preset = (NOTICE_LANG_PRESETS[lang] && NOTICE_LANG_PRESETS[lang][_noticeType]) || 
                 (NOTICE_LANG_PRESETS['en'] && NOTICE_LANG_PRESETS['en'][_noticeType]) || 
                 { title: '', msg: '' };

  const titleInput = document.getElementById('nt-title');
  const msgInput = document.getElementById('nt-message');

  if (titleInput && preset.title) titleInput.value = preset.title;
  if (msgInput && preset.msg) msgInput.value = preset.msg;

  const langNames = { en: 'English', hi: 'Hindi (हिंदी)', gu: 'Gujarati (ગુજરાતી)' };
  if (window.Toast) Toast.info('Language Updated', `Notice template updated to ${langNames[lang]}.`);
}
window.setNoticeLanguage = setNoticeLanguage;

function renderComposePanel(params = {}) {
  if (params.testId) _noticeType = 'exam_schedule';
  const container = document.getElementById('rem-panel-compose');
  if (!container) return;

  container.innerHTML = `
    <!-- Language Selector Toolbar -->
    <div style="background:var(--bg-surface); border:1.5px solid var(--border); border-radius:12px; padding:12px 16px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:1.2rem;">🌐</span>
        <span style="font-weight:700; font-size:0.9rem; color:var(--text-primary);">Notice Language / ભાષા પસંદ કરો / भाषा चुनें:</span>
      </div>
      <div style="display:flex; gap:6px;">
        <button id="btn-lang-en" class="btn btn-sm ${_noticeLanguage === 'en' ? 'btn-primary' : 'btn-outline'}" onclick="setNoticeLanguage('en')">🇬🇧 English</button>
        <button id="btn-lang-hi" class="btn btn-sm ${_noticeLanguage === 'hi' ? 'btn-primary' : 'btn-outline'}" onclick="setNoticeLanguage('hi')">🇮🇳 हिंदी (Hindi)</button>
        <button id="btn-lang-gu" class="btn btn-sm ${_noticeLanguage === 'gu' ? 'btn-primary' : 'btn-outline'}" onclick="setNoticeLanguage('gu')">🇮🇳 ગુજરાતી (Gujarati)</button>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 280px; gap:24px; align-items:start;">
      <!-- Compose Form Card -->
      <div class="card">
        <div class="card-header" style="display:flex;align-items:center;gap:12px;">
          <h3 id="notice-compose-title">✏️ Compose Notice</h3>
          <span class="badge badge-primary" id="notice-type-badge" style="font-size:0.7rem;">${NOTICE_TYPES.find(t=>t.id===_noticeType)?.label || 'General'}</span>
        </div>
        <div class="card-body" id="notice-compose-body">
          <!-- Injected by selectNoticeType -->
        </div>
      </div>

      <!-- Notice Type Selector (42+ Types) -->
      <div class="card" style="height:fit-content; max-height:760px; display:flex; flex-direction:column;">
        <div class="card-header" style="padding:14px 16px;">
          <h3>📋 Notice Type (${NOTICE_TYPES.length} Types)</h3>
        </div>
        <div class="card-body" style="padding:10px; overflow-y:auto; flex:1;">
          <div style="display:flex; flex-direction:column; gap:6px;" id="notice-type-selector">
            ${NOTICE_TYPES.map(t => `
              <button id="ntb-${t.id}" onclick="selectNoticeType('${t.id}')"
                style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1.5px solid ${t.id === _noticeType ? t.color : 'var(--border)'};border-radius:10px;background:${t.id === _noticeType ? t.color+'15' : 'var(--bg-surface)'};cursor:pointer;text-align:left;transition:all 0.2s ease;width:100%;">
                <span style="font-size:1.15rem;">${t.emoji}</span>
                <div style="min-width:0;flex:1;">
                  <div style="font-weight:700;font-size:0.8rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.label}</div>
                  <div style="font-size:0.68rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.desc}</div>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  selectNoticeType(_noticeType, params);
}

function selectNoticeType(type, params = {}) {
  _noticeType = type;
  const typeInfo = NOTICE_TYPES.find(t => t.id === type) || NOTICE_TYPES[3];

  // Update type selector buttons
  NOTICE_TYPES.forEach(t => {
    const btn = document.getElementById(`ntb-${t.id}`);
    if (btn) {
      const isActive = t.id === type;
      btn.style.borderColor = isActive ? t.color : 'var(--border)';
      btn.style.background = isActive ? `${t.color}15` : 'var(--bg-surface)';
    }
  });

  // Update title and badge
  const titleEl = document.getElementById('notice-compose-title');
  const badgeEl = document.getElementById('notice-type-badge');
  if (titleEl) titleEl.textContent = `${typeInfo.emoji} ${typeInfo.label}`;
  if (badgeEl) { badgeEl.textContent = typeInfo.label; badgeEl.style.background = typeInfo.color; }

  // Render the appropriate form
  const body = document.getElementById('notice-compose-body');
  if (!body) return;
  renderNoticeForm(body, type, params);
}

// ─── Notice Form Renderer ─────────────────────────────────────────────────

function renderNoticeForm(body, type, params = {}) {
  const today = new Date().toISOString().split('T')[0];

  const sharedButtons = `
    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:8px; align-items:center;">
      <div style="display:flex; gap:4px; background:var(--bg-surface); border:1.5px solid var(--border); border-radius:8px; padding:3px;">
        <button id="mode-digital" class="btn btn-sm ${_noticePrintMode === 'digital' ? 'btn-primary' : 'btn-ghost'}" onclick="setNoticePrintMode('digital')" title="Digital mode: colourful design for screens">🖥 Digital</button>
        <button id="mode-print" class="btn btn-sm ${_noticePrintMode === 'print' ? 'btn-primary' : 'btn-ghost'}" onclick="setNoticePrintMode('print')" title="Print mode: white background, high contrast for A4 printing">🖨 Print</button>
      </div>
      <button class="btn btn-outline btn-sm" onclick="saveNoticeDraft()">💾 Save Draft</button>
      <button class="btn btn-primary" onclick="exportNoticePDF()">⬇️ Download PDF</button>
      <button class="btn btn-outline btn-sm" onclick="saveAndPublishNotice()">✅ Save &amp; Publish</button>
    </div>
  `;

  const targetSelector = `
    <div class="form-group mb-4">
      <label class="form-label">Send To</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:6px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:0.85rem;">
          <input type="radio" name="notice-target" id="nt-all" value="All" checked> All Students &amp; Parents
        </label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:6px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:0.85rem;">
          <input type="radio" name="notice-target" id="nt-class" value="Class" onclick="showTargetClassSelect()"> Specific Class
        </label>
      </div>
      <select class="form-control mt-2" id="notice-target-class" style="display:none;" onchange="loadTargetBatches(this.value)">
        <option value="">— Select Class —</option>
      </select>
    </div>
  `;

  const typeFormMap = {
    vacation: `
      <div class="form-group mb-4">
        <label class="form-label">Notice Title <span class="required">*</span></label>
        <input type="text" class="form-control" id="nt-title" value="🌴 Vacation Announcement — Classes Closed">
      </div>
      ${targetSelector}
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">Vacation From <span class="required">*</span></label>
          <input type="date" class="form-control" id="nt-vac-start" value="${today}" onchange="updateVacationTimeline()">
        </div>
        <div class="form-group">
          <label class="form-label">Classes Resume On <span class="required">*</span></label>
          <input type="date" class="form-control" id="nt-vac-end" value="${today}" onchange="updateVacationTimeline()">
        </div>
      </div>
      <!-- Vacation Timeline Preview -->
      <div id="vacation-timeline" style="background:linear-gradient(135deg,#e8f5e9,#f3e5f5);border:1.5px solid #c8e6c9;border-radius:12px;padding:16px;margin-bottom:16px;">
        <div style="font-weight:700;font-size:0.85rem;color:#2e7d32;margin-bottom:12px;">📅 Vacation Timeline Preview</div>
        <div style="display:flex;align-items:center;gap:0;overflow-x:auto;">
          <div style="text-align:center;min-width:90px;">
            <div style="width:36px;height:36px;border-radius:50%;background:#4caf50;display:flex;align-items:center;justify-content:center;margin:0 auto 4px;color:white;font-size:1rem;">📚</div>
            <div style="font-size:0.72rem;font-weight:700;color:#2e7d32;">Last Class</div>
          </div>
          <div style="flex:1;height:3px;background:linear-gradient(90deg,#4caf50,#e91e63);min-width:40px;"></div>
          <div style="text-align:center;min-width:110px;">
            <div style="width:40px;height:40px;border-radius:50%;background:#e91e63;display:flex;align-items:center;justify-content:center;margin:0 auto 4px;color:white;font-size:1.2rem;">🌴</div>
            <div id="tl-vac-start" style="font-size:0.72rem;font-weight:700;color:#c2185b;">Vacation Start</div>
          </div>
          <div style="flex:1;height:3px;background:linear-gradient(90deg,#e91e63,#ff9800);min-width:40px;position:relative;">
            <div style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);font-size:0.7rem;color:#e65100;white-space:nowrap;font-weight:600;">🎉 Holidays</div>
          </div>
          <div style="text-align:center;min-width:110px;">
            <div style="width:40px;height:40px;border-radius:50%;background:#ff9800;display:flex;align-items:center;justify-content:center;margin:0 auto 4px;color:white;font-size:1.2rem;">🚀</div>
            <div id="tl-vac-end" style="font-size:0.72rem;font-weight:700;color:#e65100;">Reopen Date</div>
          </div>
          <div style="flex:1;height:3px;background:linear-gradient(90deg,#ff9800,#2196f3);min-width:40px;"></div>
          <div style="text-align:center;min-width:90px;">
            <div style="width:36px;height:36px;border-radius:50%;background:#2196f3;display:flex;align-items:center;justify-content:center;margin:0 auto 4px;color:white;font-size:1rem;">📖</div>
            <div style="font-size:0.72rem;font-weight:700;color:#1565c0;">Classes Resume</div>
          </div>
        </div>
      </div>
      <div class="form-group mb-6">
        <label class="form-label">Message for Parents / Students</label>
        <textarea class="form-control" id="nt-message" rows="4" placeholder="Dear Parents and Students, please note that...">Dear Parents and Students, please note that the tuition classes will remain closed during the vacation period. Regular lectures will resume as scheduled from the reopening date. Happy holidays!</textarea>
      </div>
      ${sharedButtons}
    `,

    exam_schedule: `
      <div class="form-group mb-4">
        <label class="form-label">Notice Title <span class="required">*</span></label>
        <input type="text" class="form-control" id="nt-title" value="📅 Upcoming Unit Test Schedule">
      </div>
      ${targetSelector}
      <div class="form-group mb-4">
        <label class="form-label">Notice Message / Guidelines</label>
        <textarea class="form-control" id="nt-message" rows="2">Dear Students, please find the schedule for upcoming tests. Attendance is compulsory.</textarea>
      </div>
      <p class="form-section-title">Schedule Table</p>
      <div class="table-wrap mb-4" style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;" id="exam-timetable-grid">
          <thead>
            <tr>
              <th style="padding:6px;font-size:0.8rem;text-align:left;width:120px">Date</th>
              <th style="padding:6px;font-size:0.8rem;text-align:left;width:140px">Subject</th>
              <th style="padding:6px;font-size:0.8rem;text-align:left;width:110px">Timing</th>
              <th style="padding:6px;font-size:0.8rem;text-align:left">Syllabus</th>
              <th style="padding:6px;width:36px"></th>
            </tr>
          </thead>
          <tbody id="exam-timetable-rows">
            <tr>
              <td style="padding:4px"><input type="date" class="form-control t-date" value="${today}" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
              <td style="padding:4px"><input type="text" class="form-control t-subj" value="Mathematics" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
              <td style="padding:4px"><input type="text" class="form-control t-time" value="10:00 AM" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
              <td style="padding:4px"><input type="text" class="form-control t-syll" value="Chapters 1-3" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
              <td style="padding:4px;text-align:center"><button class="btn btn-ghost btn-icon-sm" onclick="this.closest('tr').remove()" style="height:30px;width:30px;min-width:30px">🗑</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <button class="btn btn-outline btn-sm mb-4" onclick="addExamTimetableRow()">➕ Add Row</button>
      ${sharedButtons}
    `,

    batch_start: `
      <div class="form-group mb-4">
        <label class="form-label">Notice Title <span class="required">*</span></label>
        <input type="text" class="form-control" id="nt-title" value="🚀 New Batch Starting — Admissions Open">
      </div>
      ${targetSelector}
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">Batch Start Date <span class="required">*</span></label>
          <input type="date" class="form-control" id="nt-batch-date" value="${today}">
        </div>
        <div class="form-group">
          <label class="form-label">Batch Timing</label>
          <input type="text" class="form-control" id="nt-batch-time" placeholder="e.g. 7:00 AM – 9:00 AM" value="7:00 AM – 9:00 AM">
        </div>
      </div>
      <div class="form-group mb-4">
        <label class="form-label">Class / Standard Name</label>
        <input type="text" class="form-control" id="nt-batch-class" placeholder="e.g. Class 10 Science Batch">
      </div>
      <div class="form-group mb-4">
        <label class="form-label">Seats Available</label>
        <input type="number" class="form-control" id="nt-batch-seats" value="30" min="1">
      </div>
      <div class="form-group mb-6">
        <label class="form-label">Additional Message</label>
        <textarea class="form-control" id="nt-message" rows="3" placeholder="Welcome message, contact info, etc...">We are pleased to announce the commencement of a new batch. Contact us to secure your seat today!</textarea>
      </div>
      ${sharedButtons}
    `,

    general: `
      <div class="form-group mb-4">
        <label class="form-label">Notice Title <span class="required">*</span></label>
        <input type="text" class="form-control" id="nt-title" value="📢 Important Announcement">
      </div>
      ${targetSelector}
      <div class="form-group mb-6">
        <label class="form-label">Notice Content <span class="required">*</span></label>
        <textarea class="form-control" id="nt-message" rows="6" placeholder="Write your announcement here..."></textarea>
      </div>
      ${sharedButtons}
    `,

    fee_due: `
      <div class="form-group mb-4">
        <label class="form-label">Notice Title <span class="required">*</span></label>
        <input type="text" class="form-control" id="nt-title" value="💰 Fee Payment Reminder — Action Required">
      </div>
      ${targetSelector}
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">Fee Due Date <span class="required">*</span></label>
          <input type="date" class="form-control" id="nt-fee-due" value="${today}">
        </div>
        <div class="form-group">
          <label class="form-label">Late Fee After</label>
          <input type="date" class="form-control" id="nt-late-fee-date" value="${today}">
        </div>
      </div>
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">Late Fine Amount (₹)</label>
          <input type="number" class="form-control" id="nt-fine-amount" value="50" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">Payment Methods Accepted</label>
          <input type="text" class="form-control" id="nt-payment-methods" value="Cash, UPI, Online Transfer">
        </div>
      </div>
      <div class="form-group mb-6">
        <label class="form-label">Additional Message</label>
        <textarea class="form-control" id="nt-message" rows="3">Please clear your outstanding fees before the due date to avoid late charges. Contact the fee desk for any queries.</textarea>
      </div>
      ${sharedButtons}
    `,

    result_announcement: `
      <div class="form-group mb-4">
        <label class="form-label">Notice Title <span class="required">*</span></label>
        <input type="text" class="form-control" id="nt-title" value="🎉 Test Results Published — Check Now">
      </div>
      ${targetSelector}
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">Test / Exam Name</label>
          <input type="text" class="form-control" id="nt-test-name" placeholder="e.g. Monthly Test - October">
        </div>
        <div class="form-group">
          <label class="form-label">Result Date</label>
          <input type="date" class="form-control" id="nt-result-date" value="${today}">
        </div>
      </div>
      <div class="form-group mb-6">
        <label class="form-label">Message</label>
        <textarea class="form-control" id="nt-message" rows="3">We are pleased to announce that the test results have been published. Students may collect their answer sheets from the respective faculty.</textarea>
      </div>
      ${sharedButtons}
    `,

    achievement: `
      <div class="form-group mb-4">
        <label class="form-label">Notice Title <span class="required">*</span></label>
        <input type="text" class="form-control" id="nt-title" value="🏆 Top Scorers — Congratulations!">
      </div>
      ${targetSelector}
      <div class="form-group mb-4">
        <label class="form-label">Event / Test Name</label>
        <input type="text" class="form-control" id="nt-event-name" placeholder="e.g. Semester Examination 2026">
      </div>
      <p class="form-section-title">Top Achievers</p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;" id="achievers-list">
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="font-size:1.4rem;">🥇</span>
          <input type="text" class="form-control" placeholder="Rank 1 - Student Name (Score)" style="flex:1;">
          <button class="btn btn-ghost btn-icon-sm" onclick="this.closest('div').remove()">🗑</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="font-size:1.4rem;">🥈</span>
          <input type="text" class="form-control" placeholder="Rank 2 - Student Name (Score)" style="flex:1;">
          <button class="btn btn-ghost btn-icon-sm" onclick="this.closest('div').remove()">🗑</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="font-size:1.4rem;">🥉</span>
          <input type="text" class="form-control" placeholder="Rank 3 - Student Name (Score)" style="flex:1;">
          <button class="btn btn-ghost btn-icon-sm" onclick="this.closest('div').remove()">🗑</button>
        </div>
      </div>
      <button class="btn btn-outline btn-sm mb-4" onclick="addAchieverRow()">➕ Add Achiever</button>
      <div class="form-group mb-6">
        <label class="form-label">Congratulations Message</label>
        <textarea class="form-control" id="nt-message" rows="3">Congratulations to all top scorers! Your hard work and dedication have paid off. Keep striving for excellence!</textarea>
      </div>
      ${sharedButtons}
    `,

    syllabus_update: `
      <div class="form-group mb-4">
        <label class="form-label">Notice Title <span class="required">*</span></label>
        <input type="text" class="form-control" id="nt-title" value="📖 Syllabus Update — Topics Covered">
      </div>
      ${targetSelector}
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">Subject</label>
          <input type="text" class="form-control" id="nt-subject" placeholder="e.g. Mathematics">
        </div>
        <div class="form-group">
          <label class="form-label">Update Date</label>
          <input type="date" class="form-control" id="nt-update-date" value="${today}">
        </div>
      </div>
      <div class="form-group mb-4">
        <label class="form-label">Topics Covered (one per line)</label>
        <textarea class="form-control" id="nt-covered" rows="4" placeholder="Chapter 1: Introduction&#10;Chapter 2: Algebra Basics..."></textarea>
      </div>
      <div class="form-group mb-4">
        <label class="form-label">Upcoming Topics (one per line)</label>
        <textarea class="form-control" id="nt-upcoming" rows="4" placeholder="Chapter 3: Geometry&#10;Chapter 4: Statistics..."></textarea>
      </div>
      <div class="form-group mb-6">
        <label class="form-label">Additional Notes</label>
        <textarea class="form-control" id="nt-message" rows="2" placeholder="Study tips, reference books, etc..."></textarea>
      </div>
      ${sharedButtons}
    `,

    time_change: `
      <div class="form-group mb-4">
        <label class="form-label">Notice Title <span class="required">*</span></label>
        <input type="text" class="form-control" id="nt-title" value="🕐 Schedule Change Notice — Please Note">
      </div>
      ${targetSelector}
      <div class="form-group mb-4">
        <label class="form-label">Effective From Date</label>
        <input type="date" class="form-control" id="nt-effect-date" value="${today}">
      </div>
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">Old Timing</label>
          <input type="text" class="form-control" id="nt-old-time" placeholder="e.g. 7:00 AM – 9:00 AM">
        </div>
        <div class="form-group">
          <label class="form-label">New Timing</label>
          <input type="text" class="form-control" id="nt-new-time" placeholder="e.g. 8:00 AM – 10:00 AM">
        </div>
      </div>
      <div class="form-group mb-6">
        <label class="form-label">Reason / Additional Information</label>
        <textarea class="form-control" id="nt-message" rows="3" placeholder="Reason for the change...">Due to operational requirements, the class timings have been revised. We apologize for any inconvenience.</textarea>
      </div>
      ${sharedButtons}
    `,

    holiday: `
      <div class="form-group mb-4">
        <label class="form-label">Notice Title <span class="required">*</span></label>
        <input type="text" class="form-control" id="nt-title" value="🛑 Holiday Notice — Classes Cancelled">
      </div>
      ${targetSelector}
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">Holiday Date <span class="required">*</span></label>
          <input type="date" class="form-control" id="nt-holiday-date" value="${today}" onchange="updateHolidayTimeline()">
        </div>
        <div class="form-group">
          <label class="form-label">Classes Resume On <span class="required">*</span></label>
          <input type="date" class="form-control" id="nt-holiday-reopen" value="${today}" onchange="updateHolidayTimeline()">
        </div>
      </div>
      <div class="form-group mb-4">
        <label class="form-label">Occasion / Reason for Holiday</label>
        <input type="text" class="form-control" id="nt-holiday-reason" placeholder="e.g. Independence Day, Festival, Annual Function">
      </div>
      <!-- Holiday Timeline Preview -->
      <div id="holiday-timeline" style="background:linear-gradient(135deg,#fff3e0,#fbe9e7);border:1.5px solid #ffcc80;border-radius:12px;padding:16px;margin-bottom:16px;">
        <div style="font-weight:700;font-size:0.85rem;color:#e65100;margin-bottom:12px;">📅 Holiday Schedule Preview</div>
        <div style="display:flex;align-items:center;gap:0;overflow-x:auto;">
          <div style="text-align:center;min-width:90px;">
            <div style="width:36px;height:36px;border-radius:50%;background:#4caf50;display:flex;align-items:center;justify-content:center;margin:0 auto 4px;color:white;font-size:1rem;">📚</div>
            <div style="font-size:0.72rem;font-weight:700;color:#2e7d32;">Prior Class</div>
          </div>
          <div style="flex:1;height:3px;background:linear-gradient(90deg,#4caf50,#ff5722);min-width:40px;"></div>
          <div style="text-align:center;min-width:110px;">
            <div style="width:40px;height:40px;border-radius:50%;background:#ff5722;display:flex;align-items:center;justify-content:center;margin:0 auto 4px;color:white;font-size:1.2rem;">🛑</div>
            <div id="tl-hol-date" style="font-size:0.72rem;font-weight:700;color:#d84315;">Holiday</div>
          </div>
          <div style="flex:1;height:3px;background:linear-gradient(90deg,#ff5722,#2196f3);min-width:40px;"></div>
          <div style="text-align:center;min-width:110px;">
            <div style="width:40px;height:40px;border-radius:50%;background:#2196f3;display:flex;align-items:center;justify-content:center;margin:0 auto 4px;color:white;font-size:1.2rem;">📖</div>
            <div id="tl-hol-reopen" style="font-size:0.72rem;font-weight:700;color:#1565c0;">Resume Date</div>
          </div>
        </div>
      </div>
      <div class="form-group mb-6">
        <label class="form-label">Additional Message</label>
        <textarea class="form-control" id="nt-message" rows="3">Kindly note that the institute will remain closed on the specified holiday. Regular classes will resume promptly from the reopening date.</textarea>
      </div>
      ${sharedButtons}
    `,

    test_reminder: `
      <div class="form-group mb-4">
        <label class="form-label">Notice Title <span class="required">*</span></label>
        <input type="text" class="form-control" id="nt-title" value="📝 Test Reminder — Be Prepared!">
      </div>
      ${targetSelector}
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">Test Date <span class="required">*</span></label>
          <input type="date" class="form-control" id="nt-test-date" value="${today}">
        </div>
        <div class="form-group">
          <label class="form-label">Test Time</label>
          <input type="text" class="form-control" id="nt-test-time" value="10:00 AM">
        </div>
      </div>
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">Subject</label>
          <input type="text" class="form-control" id="nt-test-subject" placeholder="e.g. Mathematics, Physics">
        </div>
        <div class="form-group">
          <label class="form-label">Total Marks</label>
          <input type="number" class="form-control" id="nt-test-marks" value="100" min="1">
        </div>
      </div>
      <div class="form-group mb-4">
        <label class="form-label">Syllabus / Topics</label>
        <textarea class="form-control" id="nt-test-syllabus" rows="3" placeholder="Topics to be covered in the test..."></textarea>
      </div>
      <div class="form-group mb-6">
        <label class="form-label">Instructions</label>
        <textarea class="form-control" id="nt-message" rows="3">Bring your stationery, hall ticket, and student ID. No borrowing allowed during the test.</textarea>
      </div>
      ${sharedButtons}
    `,


    ptm: `
      <div class="form-group mb-4">
        <label class="form-label">Notice Title <span class="required">*</span></label>
        <input type="text" class="form-control" id="nt-title" value="🎓 Parent-Teacher Meeting (PTM) — Invitation">
      </div>
      ${targetSelector}
      <div class="form-grid mb-4">
        <div class="form-group">
          <label class="form-label">PTM Date <span class="required">*</span></label>
          <input type="date" class="form-control" id="nt-ptm-date" value="${today}">
        </div>
        <div class="form-group">
          <label class="form-label">PTM Time</label>
          <input type="text" class="form-control" id="nt-ptm-time" value="10:00 AM – 1:00 PM">
        </div>
      </div>
      <div class="form-group mb-4">
        <label class="form-label">Venue</label>
        <input type="text" class="form-control" id="nt-ptm-venue" placeholder="e.g. Main Hall, Ground Floor" value="Main Academy Hall">
      </div>
      <div class="form-group mb-4">
        <label class="form-label">Agenda (topics to be discussed)</label>
        <textarea class="form-control" id="nt-ptm-agenda" rows="3" placeholder="Academic performance, attendance, upcoming exams...">1. Academic progress review\n2. Attendance status\n3. Upcoming examinations\n4. Fees &amp; queries</textarea>
      </div>
      <div class="form-group mb-6">
        <label class="form-label">Request Message</label>
        <textarea class="form-control" id="nt-message" rows="3">Dear Parents, you are cordially invited to the Parent-Teacher Meeting. Your presence is very important to discuss your child's academic progress.</textarea>
      </div>
      ${sharedButtons}
    `,
  };

  // Fallback for remaining of the 32 notice types
  const DEFAULT_PRESETS = {
    homework:            { title: '✍️ Homework & Assignment Submission Notice', msg: 'Dear Students, please complete and submit your pending homework and assignment projects by the due date.' },
    practical_lab:       { title: '🧪 Science & Computer Practical Lab Schedule', msg: 'Lab practical sessions are scheduled. Students must bring their practical journals and lab coats.' },
    extra_class:         { title: '⚡ Special Extra Coaching Lecture Notice', msg: 'An extra coaching lecture is scheduled to cover critical exam topics. Attendance is mandatory for all students.' },
    book_distribution:   { title: '🎒 Study Module & Textbook Kit Collection', msg: 'New study material modules and test question banks are ready. Collect your kit from the front desk.' },
    fee_overdue:         { title: '⚠️ URGENT: Final Notice — Overdue Tuition Fees', msg: 'Your tuition fees are past the due date. Kindly clear the outstanding balance immediately to avoid late fees.' },
    fee_receipt:         { title: '🧾 Tuition Fee Payment Receipt Confirmation', msg: 'Thank you for your payment. Your tuition fee installment payment has been received and verified.' },
    hall_ticket:         { title: '🎫 Exam Admit Card / Hall Ticket Release', msg: 'Hall tickets for upcoming examinations are available for collection at the institute office.' },
    document_submission: { title: '📋 Document Submission Alert — Action Needed', msg: 'Kindly submit pending student records (School LC, Passport Photo, Marksheet copy) at the admin desk.' },
    id_card:             { title: '🆔 Student Identity Card Distribution', msg: 'New student ID cards are ready for collection. Wearing ID cards inside the campus is strictly mandatory.' },
    attendance_warning:  { title: '⚠️ Shortage of Attendance Warning Letter', msg: 'Notice regarding low attendance. Students must maintain a minimum 75% attendance percentage.' },
    discipline_warning:  { title: '🚨 Official Disciplinary Warning Notice', msg: 'Notice regarding classroom discipline and rules. Strict adherence to academy decorum is required.' },
    mobile_ban:          { title: '📱 Classroom Mobile Phone Ban Reminder', msg: 'Mobile phones are strictly prohibited during lectures and tests. Confiscation policy will apply.' },
    uniform_code:        { title: '👗 Student Uniform & ID Badge Compliance', msg: 'All enrolled students must follow the institute dress code and wear their ID card daily.' },
    weather_emergency:   { title: '🌧️ Emergency Rain / Weather Closure Notice', msg: 'Due to severe weather conditions / heavy rainfall, all classes will remain closed today for student safety.' },
    picnic_tour:         { title: '🚌 Educational Field Trip & Picnic Tour', msg: 'An educational picnic tour is organized. Interested students must submit signed parent consent forms.' },
    annual_event:        { title: '🎭 Annual Cultural Day & Sports Meet Invitation', msg: 'You are cordially invited to our Annual Cultural Function & Sports Day. Join us to encourage our students!' },
    faculty_absence:     { title: '👩‍🏫 Lecture Substitution / Faculty Schedule Update', msg: 'Please note the revised lecture timing and substitution faculty details for today.' },
    parent_complaint:    { title: '📩 Official Response to Parent Inquiry', msg: 'Official response regarding your inquiry/feedback submitted to management.' },
    doubt_desk:          { title: '💡 1-on-1 Doubt Clearing Desk Schedule', msg: 'Faculty members will be available for 1-on-1 doubt resolution. Bring your questions and reference books!' },
    transport_notice:    { title: '🚐 Academy Transport & Van Route Update', msg: 'Notice regarding transport van schedule and pickup/drop timing adjustments.' },
  };

  if (typeFormMap[type]) {
    body.innerHTML = typeFormMap[type];
  } else {
    const langDict = NOTICE_LANG_PRESETS[_noticeLanguage] || NOTICE_LANG_PRESETS['en'];
    const preset = langDict[type] || (NOTICE_LANG_PRESETS['en'] && NOTICE_LANG_PRESETS['en'][type]) || { title: `${typeInfo.emoji} ${typeInfo.label}`, msg: 'Dear Students and Parents, please note the announcement details below.' };
    body.innerHTML = `
      <div class="form-group mb-4">
        <label class="form-label">Notice Title <span class="required">*</span></label>
        <input type="text" class="form-control" id="nt-title" value="${preset.title}">
      </div>
      ${targetSelector}
      <div class="form-group mb-6">
        <label class="form-label">Notice Details / Message <span class="required">*</span></label>
        <textarea class="form-control" id="nt-message" rows="6" placeholder="Write notice details...">${preset.msg}</textarea>
      </div>
      ${sharedButtons}
    `;
  }

  // Load classes for target selector
  API.getStandards().then(res => {
    const standards = res.standards || [];
    const sel = document.getElementById('notice-target-class');
    if (sel) {
      standards.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.display_name;
        sel.appendChild(opt);
      });
    }
  }).catch(() => {});
}

// ─── Helper functions for compose form ────────────────────────────────────

function showTargetClassSelect() {
  const sel = document.getElementById('notice-target-class');
  if (sel) sel.style.display = '';
}

function addAchieverRow() {
  const list = document.getElementById('achievers-list');
  if (!list) return;
  const medals = ['🥇','🥈','🥉','🏅','⭐','✨'];
  const rank = list.children.length;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:8px;align-items:center;';
  div.innerHTML = `
    <span style="font-size:1.4rem;">${medals[rank] || '🏅'}</span>
    <input type="text" class="form-control" placeholder="Rank ${rank + 1} - Student Name (Score)" style="flex:1;">
    <button class="btn btn-ghost btn-icon-sm" onclick="this.closest('div').remove()">🗑</button>
  `;
  list.appendChild(div);
}

// ─── Save / Publish / Delete actions ─────────────────────────────────────

async function saveNoticeDraft() {
  const data = collectNoticeData();
  if (!data.title) { Toast.error('Title required', 'Please enter a notice title.'); return; }
  try {
    if (_editingNoticeId) {
      await API.reminderNotices.update(_editingNoticeId, data);
      Toast.success('Draft Updated', 'Notice saved as draft.');
    } else {
      const res = await API.reminderNotices.create({ ...data, status: 'Draft' });
      _editingNoticeId = res.id;
      Toast.success('Draft Saved', 'Notice saved as draft.');
    }
  } catch (err) {
    Toast.error('Save Failed', err.message);
  }
}

async function saveAndPublishNotice() {
  const data = collectNoticeData();
  if (!data.title) { Toast.error('Title required', 'Please enter a notice title.'); return; }
  try {
    if (_editingNoticeId) {
      await API.reminderNotices.update(_editingNoticeId, { ...data, status: 'Published' });
      Toast.success('Notice Published!', 'Notice is now live.');
    } else {
      await API.reminderNotices.create({ ...data, status: 'Published' });
      Toast.success('Notice Published!', 'Notice is now live.');
    }
    _editingNoticeId = null;
    switchReminderTab('notices');
  } catch (err) {
    Toast.error('Publish Failed', err.message);
  }
}

async function publishNotice(id) {
  try {
    await API.reminderNotices.publish(id);
    Toast.success('Published!', 'Notice is now live.');
    renderNoticesList();
  } catch (err) {
    Toast.error('Publish Failed', err.message);
  }
}

async function editNotice(id) {
  _editingNoticeId = id;
  switchReminderTab('compose');
  // Pre-fill form after rendering (defer to allow DOM to settle)
  try {
    const notice = await API.reminderNotices.get(id);
    if (!notice) return;
    // Set the notice type and re-render form
    _noticeType = notice.type || 'general';
    const container = document.getElementById('rem-panel-compose');
    // Re-render compose panel with the correct type
    renderComposePanel();
    // Wait for DOM to update then fill fields
    setTimeout(() => {
      const content = typeof notice.content === 'string' ? JSON.parse(notice.content || '{}') : (notice.content || {});
      const titleEl = document.getElementById('nt-title');
      if (titleEl) titleEl.value = notice.title || '';
      const msgEl = document.getElementById('nt-message');
      if (msgEl) msgEl.value = content.message || '';
      // Fill type-specific fields
      const fieldMap = {
        'nt-vac-start':        content['nt-vac-start'],
        'nt-vac-end':          content['nt-vac-end'],
        'nt-batch-date':       content['nt-batch-date'],
        'nt-batch-time':       content['nt-batch-time'],
        'nt-batch-class':      content['nt-batch-class'],
        'nt-batch-seats':      content['nt-batch-seats'],
        'nt-fee-due':          content['nt-fee-due'],
        'nt-late-fee-date':    content['nt-late-fee-date'],
        'nt-fine-amount':      content['nt-fine-amount'],
        'nt-payment-methods':  content['nt-payment-methods'],
        'nt-test-name':        content['nt-test-name'],
        'nt-result-date':      content['nt-result-date'],
        'nt-subject':          content['nt-subject'],
        'nt-update-date':      content['nt-update-date'],
        'nt-covered':          content['nt-covered'],
        'nt-upcoming':         content['nt-upcoming'],
        'nt-effect-date':      content['nt-effect-date'],
        'nt-old-time':         content['nt-old-time'],
        'nt-new-time':         content['nt-new-time'],
        'nt-holiday-date':     content['nt-holiday-date'],
        'nt-holiday-reopen':   content['nt-holiday-reopen'],
        'nt-holiday-reason':   content['nt-holiday-reason'],
        'nt-test-date':        content['nt-test-date'],
        'nt-test-time':        content['nt-test-time'],
        'nt-test-subject':     content['nt-test-subject'],
        'nt-test-marks':       content['nt-test-marks'],
        'nt-test-syllabus':    content['nt-test-syllabus'],
        'nt-ptm-date':         content['nt-ptm-date'],
        'nt-ptm-time':         content['nt-ptm-time'],
        'nt-ptm-venue':        content['nt-ptm-venue'],
        'nt-ptm-agenda':       content['nt-ptm-agenda'],
      };
      Object.entries(fieldMap).forEach(([id, val]) => {
        if (val !== undefined && val !== null) {
          const el = document.getElementById(id);
          if (el) el.value = val;
        }
      });
      // Set target radio
      if (notice.target === 'Class') {
        const classRadio = document.getElementById('nt-class');
        if (classRadio) classRadio.checked = true;
        const sel = document.getElementById('notice-target-class');
        if (sel) { sel.style.display = ''; sel.value = notice.target_id || ''; }
      }
      Toast.info('Notice Loaded', `Editing: ${notice.title}`);
    }, 200);
  } catch (err) {
    Toast.error('Load Failed', 'Could not load notice for editing: ' + err.message);
  }
}

async function confirmDeleteNotice(id) {
  showConfirm('Delete Notice', 'This notice will be permanently deleted. Are you sure?', async () => {
    try {
      await API.reminderNotices.delete(id);
      Toast.success('Deleted', 'Notice removed.');
      renderNoticesList();
    } catch (err) {
      Toast.error('Delete Failed', err.message);
    }
  });
}

function collectNoticeData() {
  const title = document.getElementById('nt-title')?.value?.trim() || '';
  const message = document.getElementById('nt-message')?.value?.trim() || '';
  const targetRadio = document.querySelector('input[name="notice-target"]:checked');
  const target = targetRadio?.value || 'All';
  const targetId = document.getElementById('notice-target-class')?.value || null;

  // Collect type-specific fields
  const content = { message };
  const typeFields = {
    vacation: ['nt-vac-start','nt-vac-end'],
    exam_schedule: [],
    batch_start: ['nt-batch-date','nt-batch-time','nt-batch-class','nt-batch-seats'],
    fee_due: ['nt-fee-due','nt-late-fee-date','nt-fine-amount','nt-payment-methods'],
    result_announcement: ['nt-test-name','nt-result-date'],
    syllabus_update: ['nt-subject','nt-update-date','nt-covered','nt-upcoming'],
    time_change: ['nt-effect-date','nt-old-time','nt-new-time'],
    holiday: ['nt-holiday-date','nt-holiday-reopen','nt-holiday-reason'],
    test_reminder: ['nt-test-date','nt-test-time','nt-test-subject','nt-test-marks','nt-test-syllabus'],
    ptm: ['nt-ptm-date','nt-ptm-time','nt-ptm-venue','nt-ptm-agenda'],
  };

  (typeFields[_noticeType] || []).forEach(fid => {
    const el = document.getElementById(fid);
    if (el) content[fid] = el.value;
  });

  // Exam schedule rows
  if (_noticeType === 'exam_schedule') {
    const rows = [];
    document.querySelectorAll('#exam-timetable-rows tr').forEach(tr => {
      rows.push({
        date: tr.querySelector('.t-date')?.value || '',
        subject: tr.querySelector('.t-subj')?.value || '',
        time: tr.querySelector('.t-time')?.value || '',
        syllabus: tr.querySelector('.t-syll')?.value || '',
      });
    });
    content.rows = rows;
  }

  return { type: _noticeType, title, content: JSON.stringify(content), target, target_id: targetId || null };
}

function refreshExamTimetableRowIndices(tbody) {
  if (!tbody) tbody = document.getElementById('exam-timetable-rows');
  if (!tbody) return;
  Array.from(tbody.children).forEach((tr, rIdx) => {
    const inputs = tr.querySelectorAll('input');
    inputs.forEach((input, cIdx) => {
      input.dataset.row = rIdx;
      input.dataset.col = cIdx;
    });
  });
}
window.refreshExamTimetableRowIndices = refreshExamTimetableRowIndices;

function addExamTimetableRow() {
  const tbody = document.getElementById('exam-timetable-rows');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td style="padding:4px"><input type="date" class="form-control t-date" value="${new Date().toISOString().split('T')[0]}" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
    <td style="padding:4px"><input type="text" class="form-control t-subj" placeholder="e.g. Science" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
    <td style="padding:4px"><input type="text" class="form-control t-time" placeholder="e.g. 10:00 AM" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
    <td style="padding:4px"><input type="text" class="form-control t-syll" placeholder="e.g. Chapters 4 & 5" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
    <td style="padding:4px; text-align:center"><button class="btn btn-ghost btn-icon-sm" onclick="this.closest('tr').remove(); refreshExamTimetableRowIndices()" style="height:30px;width:30px;min-width:30px">🗑</button></td>
  `;
  tbody.appendChild(tr);
  refreshExamTimetableRowIndices(tbody);
}

// ─── Digital / Print Mode Toggle ──────────────────────────────────────────
function setNoticePrintMode(mode) {
  _noticePrintMode = mode;
  const digitalBtn = document.getElementById('mode-digital');
  const printBtn = document.getElementById('mode-print');
  if (digitalBtn) {
    digitalBtn.className = `btn btn-sm ${mode === 'digital' ? 'btn-primary' : 'btn-ghost'}`;
  }
  if (printBtn) {
    printBtn.className = `btn btn-sm ${mode === 'print' ? 'btn-primary' : 'btn-ghost'}`;
  }
  Toast.info(mode === 'print' ? '🖨 Print Mode' : '🖥 Digital Mode',
    mode === 'print' ? 'PDF will use white background, printer-friendly layout.' : 'PDF will use colourful digital design.');
}
window.setNoticePrintMode = setNoticePrintMode;

// ─── Vacation Timeline Live Preview ────────────────────────────────────────
function updateVacationTimeline() {
  const start = document.getElementById('nt-vac-start')?.value;
  const end   = document.getElementById('nt-vac-end')?.value;
  const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const startEl = document.getElementById('tl-vac-start');
  const endEl   = document.getElementById('tl-vac-end');
  if (startEl) startEl.textContent = fmtDate(start);
  if (endEl)   endEl.textContent   = fmtDate(end);
}
window.updateVacationTimeline = updateVacationTimeline;

function updateHolidayTimeline() {
  const hdate  = document.getElementById('nt-holiday-date')?.value;
  const reopen = document.getElementById('nt-holiday-reopen')?.value;
  const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const holEl = document.getElementById('tl-hol-date');
  const reoEl = document.getElementById('tl-hol-reopen');
  if (holEl) holEl.textContent = fmtDate(hdate);
  if (reoEl) reoEl.textContent = fmtDate(reopen);
}
window.updateHolidayTimeline = updateHolidayTimeline;

// ─── Download PDF for a saved notice ─────────────────────────────────────
async function downloadNoticePDF(id) {
  Spinner.show('Generating notice PDF...');
  try {
    const notice = await API.reminderNotices.get(id);
    if (!notice) throw new Error('Notice not found.');
    const content = typeof notice.content === 'string' ? JSON.parse(notice.content || '{}') : (notice.content || {});
    const payload = buildNoticePDFPayload(notice.type, notice.title, content);
    const res = await API.export.reminderPDF(payload);
    Spinner.hide();
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(notice.title || 'Notice').replace(/[^a-zA-Z0-9]/g, '_')}_Notice.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
    Toast.success('Downloaded!', 'Notice PDF downloaded successfully.');
  } catch (err) {
    Spinner.hide();
    Toast.error('PDF Failed', err.message);
  }
}
window.downloadNoticePDF = downloadNoticePDF;

// ─── Build PDF payload from type + title + content object ─────────────────
function buildNoticePDFPayload(type, title, content) {
  const fmtDate = (d) => {
    if (!d) return '';
    try {
      const dt = new Date(d + 'T00:00:00');
      return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return d; }
  };
  const payload = {
    type: type || 'general',
    title: title || 'Notice',
    message: content.message || '',
    print_mode: _noticePrintMode,
  };
  if (type === 'vacation') {
    const start = content['nt-vac-start'];
    const end   = content['nt-vac-end'];
    if (start && end) {
      payload.columns = ['Vacation Start Date', 'Classes Reopen Date'];
      payload.rows    = [[fmtDate(start), fmtDate(end)]];
      payload.timeline = { start: fmtDate(start), end: fmtDate(end) };
    }
  } else if (type === 'batch_start') {
    const bdate = content['nt-batch-date'];
    const bclass = content['nt-batch-class'];
    if (bdate || bclass) {
      payload.columns = ['Class / Standard', 'Commencement Date', 'Timing', 'Seats'];
      payload.rows    = [[bclass || '—', fmtDate(bdate), content['nt-batch-time'] || '—', content['nt-batch-seats'] || '—']];
    }
  } else if (type === 'exam_schedule') {
    if (content.rows && content.rows.length > 0) {
      payload.columns = ['Exam Date', 'Subject Name', 'Timing', 'Syllabus'];
      payload.rows    = content.rows.map(r => [fmtDate(r.date), r.subject || '—', r.time || '—', r.syllabus || '—']);
    }
  } else if (type === 'fee_due') {
    payload.columns = ['Fee Due Date', 'Late Fee After', 'Late Fine', 'Payment Methods'];
    payload.rows    = [[fmtDate(content['nt-fee-due']), fmtDate(content['nt-late-fee-date']), `₹${content['nt-fine-amount'] || 0}`, content['nt-payment-methods'] || 'Cash']];
  } else if (type === 'result_announcement') {
    if (content['nt-test-name']) {
      payload.columns = ['Test / Exam', 'Result Date'];
      payload.rows    = [[content['nt-test-name'], fmtDate(content['nt-result-date'])]];
    }
  } else if (type === 'test_reminder') {
    payload.columns = ['Test Date', 'Time', 'Subject', 'Max Marks', 'Syllabus'];
    payload.rows    = [[fmtDate(content['nt-test-date']), content['nt-test-time'] || '—', content['nt-test-subject'] || '—', content['nt-test-marks'] || '—', content['nt-test-syllabus'] || '—']];
  } else if (type === 'ptm') {
    payload.columns = ['PTM Date', 'Time', 'Venue'];
    payload.rows    = [[fmtDate(content['nt-ptm-date']), content['nt-ptm-time'] || '—', content['nt-ptm-venue'] || '—']];
    if (content['nt-ptm-agenda']) payload.message = (payload.message ? payload.message + '\n\n' : '') + 'Agenda:\n' + content['nt-ptm-agenda'];
  } else if (type === 'holiday') {
    const hdate = content['nt-holiday-date'];
    const rdate = content['nt-holiday-reopen'] || hdate;
    payload.columns = ['Holiday Date', 'Classes Resume', 'Occasion / Reason'];
    payload.rows    = [[fmtDate(hdate), fmtDate(rdate), content['nt-holiday-reason'] || 'Institute Holiday']];
    if (hdate && rdate) {
      payload.timeline = { start: fmtDate(hdate), end: fmtDate(rdate) };
    }
  } else if (type === 'time_change') {
    payload.columns = ['Effective From', 'Old Timing', 'New Timing'];
    payload.rows    = [[fmtDate(content['nt-effect-date']), content['nt-old-time'] || '—', content['nt-new-time'] || '—']];
  } else if (type === 'syllabus_update') {
    payload.columns = ['Subject', 'Update Date'];
    payload.rows    = [[content['nt-subject'] || '—', fmtDate(content['nt-update-date'])]];
    const extras = [];
    if (content['nt-covered']) extras.push('Topics Covered:\n' + content['nt-covered']);
    if (content['nt-upcoming']) extras.push('Upcoming Topics:\n' + content['nt-upcoming']);
    if (extras.length) payload.message = (payload.message ? payload.message + '\n\n' : '') + extras.join('\n\n');
  }
  return payload;
}

async function exportNoticePDF() {
  const title = document.getElementById('nt-title')?.value?.trim();
  if (!title) {
    Toast.error('Validation Error', 'Notice title is required.');
    return;
  }
  // Collect all form data via collectNoticeData()
  const data = collectNoticeData();
  const content = typeof data.content === 'string' ? JSON.parse(data.content || '{}') : (data.content || {});
  const payload = buildNoticePDFPayload(_noticeType, title, content);

  // Extra: collect exam rows directly from DOM if present
  if (_noticeType === 'exam_schedule') {
    const rows = document.querySelectorAll('#exam-timetable-rows tr');
    const rowData = [];
    rows.forEach(row => {
      const dateVal = row.querySelector('.t-date')?.value || '';
      const subjVal = row.querySelector('.t-subj')?.value || '';
      const timeVal = row.querySelector('.t-time')?.value || '';
      const syllVal = row.querySelector('.t-syll')?.value || '';
      if (dateVal && subjVal) {
        rowData.push([dateVal && (() => { try { return new Date(dateVal + 'T00:00:00').toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}); } catch { return dateVal; }})(), subjVal, timeVal || '—', syllVal || '—']);
      }
    });
    if (rowData.length === 0) {
      Toast.warning('Empty Schedule', 'Please add at least one exam row.');
      return;
    }
    payload.columns = ['Exam Date', 'Subject Name', 'Timing', 'Syllabus'];
    payload.rows    = rowData;
  }

  Spinner.show('Generating notice PDF...');
  try {
    const res = await API.export.reminderPDF(payload);
    Spinner.hide();
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_Notice.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
    Toast.success('Notice PDF Downloaded!', 'Your notice has been compiled and downloaded.');
  } catch (err) {
    Spinner.hide();
    Toast.error('PDF Failed', err.message);
  }
}

async function loadReminderStandards() {
  const sel = document.getElementById('rem-std-select');
  if (!sel) return;
  
  try {
    const boards = await API.boards.list();
    sel.innerHTML = '<option value="">— Select Class —</option>';
    for (const board of boards) {
      const standards = await API.boards.getStandards(board.id);
      if (standards.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = board.short_name;
        standards.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = s.display_name;
          grp.appendChild(opt);
        });
        sel.appendChild(grp);
      }
    }
  } catch (err) {
    console.error('Error loading standards in reminders:', err);
  }
}

async function onReminderStandardChange(stdId) {
  const cycleSel = document.getElementById('rem-cycle-select');
  if (!cycleSel) return;
  
  cycleSel.innerHTML = '<option value="">— Select Cycle —</option>';
  cycleSel.disabled = true;
  
  if (!stdId) return;
  
  try {
    const cycles = await API.testCycles.list(stdId);
    if (cycles.length === 0) {
      cycleSel.innerHTML = '<option value="">No grouped test cycles found</option>';
      return;
    }
    
    cycleSel.disabled = false;
    cycleSel.innerHTML = '<option value="">— Select Grouped Test Cycle —</option>';
    cycles.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.title} (Max: ${c.max_marks})`;
      cycleSel.appendChild(opt);
    });
  } catch (err) {
    Toast.error('Load Failed', 'Failed to load test cycles: ' + err.message);
  }
}

async function onReminderCycleChange(cycleId) {
  if (!cycleId) return;
  
  try {
    const res = await API.testCycles.get(cycleId);
    const { cycle, tests } = res;
    
    const titleEl = document.getElementById('rem-title');
    if (titleEl) {
      titleEl.value = `📅 ${cycle.title} - Exam Timetable`;
    }
    
    const tbody = document.getElementById('exam-timetable-rows');
    if (tbody) {
      tbody.innerHTML = '';
      
      tests.forEach(test => {
        const tr = document.createElement('tr');
        const dateVal = test.test_date || new Date().toISOString().split('T')[0];
        
        tr.innerHTML = `
          <td style="padding:4px"><input type="date" class="form-control t-date" value="${dateVal}" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
          <td style="padding:4px"><input type="text" class="form-control t-subj" value="${test.subject_name || ''}" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
          <td style="padding:4px"><input type="text" class="form-control t-time" value="09:00 AM" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
          <td style="padding:4px"><input type="text" class="form-control t-syll" value="Full Syllabus (Max Marks: ${test.max_marks})" style="height:32px;font-size:0.75rem;padding:0 6px"></td>
          <td style="padding:4px; text-align:center"><button class="btn btn-ghost btn-icon-sm" onclick="this.closest('tr').remove()" style="height:30px;width:30px;min-width:30px">🗑</button></td>
        `;
        tbody.appendChild(tr);
      });
      Toast.success('Cycle Loaded', 'Timetable grid populated from grouped test cycle.');
    }
  } catch (err) {
    Toast.error('Load Failed', 'Failed to load cycle details: ' + err.message);
  }
}

// Expose globals
window.renderReminders = renderReminders;
window.switchReminderTab = switchReminderTab;
window.addExamTimetableRow = addExamTimetableRow;
window.exportNoticePDF = exportNoticePDF;
window.downloadNoticePDF = downloadNoticePDF;
window.setNoticePrintMode = setNoticePrintMode;
window.updateVacationTimeline = updateVacationTimeline;
window.onReminderStandardChange = onReminderStandardChange;
window.onReminderCycleChange = onReminderCycleChange;
window.editNotice = editNotice;
window.publishNotice = publishNotice;
window.saveNoticeDraft = saveNoticeDraft;
window.saveAndPublishNotice = saveAndPublishNotice;
window.confirmDeleteNotice = confirmDeleteNotice;
window.selectNoticeType = selectNoticeType;
window.showTargetClassSelect = showTargetClassSelect;
window.addAchieverRow = addAchieverRow;
