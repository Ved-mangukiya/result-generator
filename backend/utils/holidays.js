// Major Indian National Holidays & Festivals (2026–2035)

const FIXED_HOLIDAYS = [
  { day: '01-01', name: "New Year's Day" },
  { day: '01-14', name: 'Makar Sankranti / Uttarayan' },
  { day: '01-26', name: 'Republic Day' },
  { day: '04-14', name: 'Ambedkar Jayanti' },
  { day: '08-15', name: 'Independence Day' },
  { day: '10-02', name: 'Gandhi Jayanti' },
  { day: '12-25', name: 'Christmas' }
];

const VARIABLE_HOLIDAYS = {
  2026: {
    '02-15': 'Maha Shivaratri',
    '03-03': 'Holi (Festival of Colors)',
    '03-20': 'Eid al-Fitr',
    '03-26': 'Ram Navami',
    '04-03': 'Good Friday',
    '05-27': 'Eid al-Adha',
    '06-26': 'Muharram',
    '08-28': 'Raksha Bandhan',
    '09-04': 'Janmashtami',
    '09-14': 'Ganesh Chaturthi',
    '10-20': 'Dussehra / Vijayadashami',
    '11-08': 'Diwali / Deepavali',
    '11-09': 'Gujarati Vikram Samvat New Year',
    '11-10': 'Bhai Dooj',
    '11-24': 'Guru Nanak Jayanti'
  },
  2027: {
    '03-06': 'Maha Shivaratri',
    '03-22': 'Holi (Festival of Colors)',
    '03-10': 'Eid al-Fitr',
    '04-15': 'Ram Navami',
    '03-26': 'Good Friday',
    '05-17': 'Eid al-Adha',
    '06-16': 'Muharram',
    '08-17': 'Raksha Bandhan',
    '08-25': 'Janmashtami',
    '09-04': 'Ganesh Chaturthi',
    '10-09': 'Dussehra / Vijayadashami',
    '10-29': 'Diwali / Deepavali',
    '10-30': 'Gujarati Vikram Samvat New Year',
    '10-31': 'Bhai Dooj',
    '11-14': 'Guru Nanak Jayanti'
  },
  2028: {
    '02-23': 'Maha Shivaratri',
    '03-11': 'Holi (Festival of Colors)',
    '02-28': 'Eid al-Fitr',
    '04-03': 'Ram Navami',
    '04-14': 'Good Friday',
    '05-05': 'Eid al-Adha',
    '06-04': 'Muharram',
    '08-05': 'Raksha Bandhan',
    '08-13': 'Janmashtami',
    '08-23': 'Ganesh Chaturthi',
    '09-27': 'Dussehra / Vijayadashami',
    '10-17': 'Diwali / Deepavali',
    '10-18': 'Gujarati Vikram Samvat New Year',
    '10-19': 'Bhai Dooj',
    '11-02': 'Guru Nanak Jayanti'
  },
  2029: {
    '02-11': 'Maha Shivaratri',
    '03-01': 'Holi (Festival of Colors)',
    '02-17': 'Eid al-Fitr',
    '04-22': 'Ram Navami',
    '03-30': 'Good Friday',
    '04-24': 'Eid al-Adha',
    '05-24': 'Muharram',
    '08-24': 'Raksha Bandhan',
    '09-01': 'Janmashtami',
    '09-12': 'Ganesh Chaturthi',
    '10-16': 'Dussehra / Vijayadashami',
    '11-05': 'Diwali / Deepavali',
    '11-06': 'Gujarati Vikram Samvat New Year',
    '11-07': 'Bhai Dooj',
    '11-21': 'Guru Nanak Jayanti'
  },
  2030: {
    '03-02': 'Maha Shivaratri',
    '03-20': 'Holi (Festival of Colors)',
    '02-07': 'Eid al-Fitr',
    '04-12': 'Ram Navami',
    '04-19': 'Good Friday',
    '04-13': 'Eid al-Adha',
    '05-14': 'Muharram',
    '08-13': 'Raksha Bandhan',
    '08-21': 'Janmashtami',
    '09-01': 'Ganesh Chaturthi',
    '10-06': 'Dussehra / Vijayadashami',
    '10-26': 'Diwali / Deepavali',
    '10-27': 'Gujarati Vikram Samvat New Year',
    '10-28': 'Bhai Dooj',
    '11-10': 'Guru Nanak Jayanti'
  },
  2031: {
    '02-20': 'Maha Shivaratri',
    '03-09': 'Holi (Festival of Colors)',
    '01-27': 'Eid al-Fitr',
    '04-01': 'Ram Navami',
    '04-11': 'Good Friday',
    '04-02': 'Eid al-Adha',
    '05-03': 'Muharram',
    '08-03': 'Raksha Bandhan',
    '08-10': 'Janmashtami',
    '08-20': 'Ganesh Chaturthi',
    '10-25': 'Dussehra / Vijayadashami',
    '11-14': 'Diwali / Deepavali',
    '11-15': 'Gujarati Vikram Samvat New Year',
    '11-16': 'Bhai Dooj',
    '11-29': 'Guru Nanak Jayanti'
  },
  2032: {
    '03-10': 'Maha Shivaratri',
    '03-27': 'Holi (Festival of Colors)',
    '01-16': 'Eid al-Fitr',
    '04-18': 'Ram Navami',
    '03-26': 'Good Friday',
    '03-21': 'Eid al-Adha',
    '04-21': 'Muharram',
    '08-22': 'Raksha Bandhan',
    '08-28': 'Janmashtami',
    '09-07': 'Ganesh Chaturthi',
    '10-14': 'Dussehra / Vijayadashami',
    '11-02': 'Diwali / Deepavali',
    '11-03': 'Gujarati Vikram Samvat New Year',
    '11-04': 'Bhai Dooj',
    '11-17': 'Guru Nanak Jayanti'
  },
  2033: {
    '02-27': 'Maha Shivaratri',
    '03-16': 'Holi (Festival of Colors)',
    '01-05': 'Eid al-Fitr',
    '04-07': 'Ram Navami',
    '04-15': 'Good Friday',
    '03-10': 'Eid al-Adha',
    '04-10': 'Muharram',
    '08-11': 'Raksha Bandhan',
    '08-17': 'Janmashtami',
    '08-27': 'Ganesh Chaturthi',
    '10-03': 'Dussehra / Vijayadashami',
    '10-22': 'Diwali / Deepavali',
    '10-23': 'Gujarati Vikram Samvat New Year',
    '10-24': 'Bhai Dooj',
    '11-06': 'Guru Nanak Jayanti'
  },
  2034: {
    '02-17': 'Maha Shivaratri',
    '03-05': 'Holi (Festival of Colors)',
    '12-26': 'Eid al-Fitr',
    '03-28': 'Ram Navami',
    '04-07': 'Good Friday',
    '02-28': 'Eid al-Adha',
    '03-31': 'Muharram',
    '08-30': 'Raksha Bandhan',
    '09-05': 'Janmashtami',
    '09-16': 'Ganesh Chaturthi',
    '10-22': 'Dussehra / Vijayadashami',
    '11-10': 'Diwali / Deepavali',
    '11-11': 'Gujarati Vikram Samvat New Year',
    '11-12': 'Bhai Dooj',
    '11-25': 'Guru Nanak Jayanti'
  },
  2035: {
    '03-08': 'Maha Shivaratri',
    '03-23': 'Holi (Festival of Colors)',
    '12-15': 'Eid al-Fitr',
    '03-16': 'Ram Navami',
    '03-23': 'Good Friday',
    '02-17': 'Eid al-Adha',
    '03-20': 'Muharram',
    '08-18': 'Raksha Bandhan',
    '08-26': 'Janmashtami',
    '09-05': 'Ganesh Chaturthi',
    '10-11': 'Dussehra / Vijayadashami',
    '10-30': 'Diwali / Deepavali',
    '10-31': 'Gujarati Vikram Samvat New Year',
    '11-01': 'Bhai Dooj',
    '11-15': 'Guru Nanak Jayanti'
  }
};

const HOLIDAYS = {};

// Build composite holiday list
for (let year = 2026; year <= 2035; year++) {
  // Fixed holidays
  FIXED_HOLIDAYS.forEach(fh => {
    HOLIDAYS[`${year}-${fh.day}`] = fh.name;
  });
  
  // Variable holidays
  const vars = VARIABLE_HOLIDAYS[year];
  if (vars) {
    Object.keys(vars).forEach(day => {
      HOLIDAYS[`${year}-${day}`] = vars[day];
    });
  }
}

/**
 * Check if a date string (YYYY-MM-DD) is a holiday/festival
 * @param {string} dateStr 
 * @returns {string|null} holidayName
 */
function getHoliday(dateStr) {
  if (!dateStr) return null;
  const dateOnly = dateStr.split('T')[0];
  return HOLIDAYS[dateOnly] || null;
}

module.exports = {
  HOLIDAYS,
  getHoliday
};
