// Major Indian National Holidays & Festivals (2026)
const HOLIDAYS = {
  '2026-01-01': 'New Year\'s Day',
  '2026-01-14': 'Makar Sankranti / Uttarayan',
  '2026-01-26': 'Republic Day',
  '2026-02-15': 'Maha Shivaratri',
  '2026-03-03': 'Holi (Festival of Colors)',
  '2026-03-20': 'Eid al-Fitr',
  '2026-03-27': 'Ram Navami',
  '2026-04-02': 'Mahavir Jayanti',
  '2026-04-03': 'Good Friday',
  '2026-04-14': 'Ambedkar Jayanti',
  '2026-05-27': 'Eid al-Adha',
  '2026-06-26': 'Muharram',
  '2026-08-15': 'Independence Day',
  '2026-08-27': 'Raksha Bandhan',
  '2026-09-04': 'Janmashtami',
  '2026-09-15': 'Ganesh Chaturthi',
  '2026-10-02': 'Gandhi Jayanti',
  '2026-10-20': 'Dussehra / Vijayadashami',
  '2026-11-08': 'Diwali / Deepavali',
  '2026-11-09': 'Gujarati Vikram Samvat New Year',
  '2026-11-10': 'Bhai Dooj',
  '2026-11-24': 'Guru Nanak Jayanti',
  '2026-12-25': 'Christmas',

  // 2027 placeholders just in case
  '2027-01-01': 'New Year\'s Day',
  '2027-01-14': 'Makar Sankranti / Uttarayan',
  '2027-01-26': 'Republic Day',
  '2027-08-15': 'Independence Day',
  '2027-10-02': 'Gandhi Jayanti',
  '2027-12-25': 'Christmas',
};

/**
 * Check if a date string (YYYY-MM-DD) is a holiday/festival
 * @param {string} dateStr 
 * @returns {string|null} holidayName
 */
function getHoliday(dateStr) {
  if (!dateStr) return null;
  // Clean format to YYYY-MM-DD
  const dateOnly = dateStr.split('T')[0];
  return HOLIDAYS[dateOnly] || null;
}

module.exports = {
  HOLIDAYS,
  getHoliday
};
