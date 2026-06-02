const fs = require('fs');
const path = require('path');

const baseSubjects = [
  "English", "Hindi", "Sanskrit", "Gujarati", "Marathi", "Punjabi", "Bengali", "Tamil", "Telugu", "Kannada", "Malayalam", "Oriya", "Assamese", "Urdu", "Kashmiri", "Manipuri", "Nepali", "Konkani", "Bodo", "Dogri", "Maithili", "Santhali", "Sindhi", "French", "German", "Spanish", "Japanese", "Russian", "Arabic", "Persian", "Tibetan",
  "Mathematics", "Physics", "Chemistry", "Biology", "Science", "Social Science", "History", "Geography", "Civics", "Political Science", "Economics", "Business Studies", "Accountancy", "Secretarial Practice", "Informatics Practices", "Computer Science", "Information Technology", "Home Science", "Psychology", "Sociology", "Philosophy", "Logic", "Fine Arts", "Painting", "Sculpture", "Graphics", "Commercial Art", "Physical Education", "Yoga", "Environmental Science", "General Knowledge", "Moral Science", "Value Education", "Work Experience", "Craft", "Drawing"
];

// Generate variations to match real board configurations (e.g., Core, Elective, Class wise, Stream wise)
const subjectsSet = new Set(baseSubjects);

// 1. Languages with Core, Elective and Literature variations
const majorLanguages = [
  "English", "Hindi", "Sanskrit", "Gujarati", "Marathi", "Punjabi", "Bengali", "Tamil", "Telugu", "Kannada", "Malayalam", "Oriya", "Assamese", "Urdu", "Kashmiri", "Manipuri", "Nepali", "Konkani", "Bodo", "Dogri", "Maithili", "Santhali", "Sindhi", "French", "German", "Spanish", "Japanese", "Russian", "Arabic", "Persian", "Tibetan", "Latin", "Chinese", "Italian"
];
majorLanguages.forEach(lang => {
  subjectsSet.add(`${lang} Core`);
  subjectsSet.add(`${lang} Elective`);
  subjectsSet.add(`${lang} Literature`);
  subjectsSet.add(`${lang} Language`);
  subjectsSet.add(`${lang} Grammar`);
  subjectsSet.add(`Functional ${lang}`);
  subjectsSet.add(`Communicative ${lang}`);
  subjectsSet.add(`Advanced ${lang}`);
  subjectsSet.add(`Applied ${lang}`);
});

// 2. Science and Mathematics divisions
const sciences = [
  "Physics", "Chemistry", "Biology", "Botany", "Zoology", "Geology", "Microbiology", "Biotechnology", "Biochemistry", "Astrophysics", "Environmental Biology", "Marine Biology", "Genetics", "Ecology"
];
sciences.forEach(sci => {
  subjectsSet.add(`Applied ${sci}`);
  subjectsSet.add(`Advanced ${sci}`);
  subjectsSet.add(`Practical ${sci}`);
  subjectsSet.add(`Theoretical ${sci}`);
  subjectsSet.add(`${sci} Theory`);
  subjectsSet.add(`${sci} Practical`);
  for (let c = 8; c <= 12; c++) {
    subjectsSet.add(`${sci} Class ${c}`);
  }
});

const maths = [
  "Mathematics", "Applied Mathematics", "Basic Mathematics", "Standard Mathematics", "Pure Mathematics", "Business Mathematics", "Statistics", "Calculus", "Algebra", "Geometry", "Trigonometry"
];
maths.forEach(m => {
  subjectsSet.add(`Advanced ${m}`);
  subjectsSet.add(`Practical ${m}`);
  subjectsSet.add(`Elementary ${m}`);
  for (let c = 1; c <= 12; c++) {
    subjectsSet.add(`${m} Class ${c}`);
  }
});

// 3. Commerce and Finance subjects
const commerce = [
  "Accountancy", "Business Studies", "Economics", "Entrepreneurship", "Financial Markets", "Banking", "Insurance", "Cost Accounting", "Secretarial Practice", "SPCC", "Auditing", "Business Administration", "Marketing", "Salesmanship", "E-Commerce", "Office Management", "Book Keeping", "Company Law", "Corporate Accounting", "Income Tax", "GST Law", "Financial Management", "Portfolio Management", "Investment Planning", "Macro Economics", "Micro Economics", "Indian Economic Development"
];
commerce.forEach(comm => {
  subjectsSet.add(`Applied ${comm}`);
  subjectsSet.add(`Introduction to ${comm}`);
  subjectsSet.add(`Fundamentals of ${comm}`);
  subjectsSet.add(`Practical ${comm}`);
});

// 4. Humanities and Arts
const humanities = [
  "History", "Geography", "Political Science", "Psychology", "Sociology", "Philosophy", "Logic", "Fine Arts", "Painting", "Sculpture", "Graphics", "Commercial Art", "Legal Studies", "Public Administration", "Human Rights", "Social Work", "Fashion Studies", "Library Science", "Information Science", "Museology", "Archaeology", "Anthropology", "Linguistics", "Media Studies", "Mass Communication", "Journalism", "Creative Writing", "Translation Studies"
];
humanities.forEach(hum => {
  subjectsSet.add(`Applied ${hum}`);
  subjectsSet.add(`Introduction to ${hum}`);
  subjectsSet.add(`Advanced ${hum}`);
  subjectsSet.add(`Indian ${hum}`);
  subjectsSet.add(`World ${hum}`);
});

// 5. Vocations and Skill Subjects (CBSE and State Board Skill subjects)
const vocational = [
  "Information Technology", "Web Application", "Automotive", "Financial Markets Management", "Tourism", "Beauty and Wellness", "Agriculture", "Food Production", "Front Office Operations", "Banking and Insurance", "Marketing and Sales", "Healthcare", "Horticulture", "Typography", "Computer Applications", "Geospatial Technology", "Electrical Technology", "Electronic Technology", "Multimedia", "Mass Media Studies", "Library and Information Science", "Fashion Design", "Interior Design", "Graphic Design", "Game Design", "3D Modeling", "Animation", "Video Editing", "Sound Recording", "Photography", "Cinematography", "Acting", "Theatre", "Web Design", "Mobile App Development", "UI/UX Design", "Robotics", "IoT", "Artificial Intelligence", "Machine Learning", "Data Science", "Blockchain", "Cloud Computing", "Cyber Security"
];
vocational.forEach(voc => {
  subjectsSet.add(`${voc} (Vocational)`);
  subjectsSet.add(`Introduction to ${voc}`);
  subjectsSet.add(`Fundamentals of ${voc}`);
  subjectsSet.add(`Practical ${voc}`);
  subjectsSet.add(`Advanced ${voc}`);
  subjectsSet.add(`Applied ${voc}`);
});

// 6. Regional and Folk Art and Sports subjects
const folkAndSports = [
  "Bharatanatyam", "Kathak", "Kathakali", "Kuchipudi", "Odissi", "Manipuri", "Mohiniyattam", "Sattriya", "Folk Dance", "Folk Music", "Hindustani Vocal", "Hindustani Instrumental", "Carnatic Vocal", "Carnatic Instrumental", "Yoga", "Physical Education", "Gymnastics", "Athletics", "Football", "Cricket", "Hockey", "Basketball", "Volleyball", "Handball", "Kabaddi", "Kho-Kho", "Badminton", "Table Tennis", "Lawn Tennis", "Squash", "Billiards", "Snooker", "Chess", "Carrom", "Archery", "Shooting", "Swimming", "Martial Arts", "Judo", "Karate", "Taekwondo", "Wushu", "Kalaripayattu", "Silambam", "Gatka"
];
folkAndSports.forEach(item => {
  subjectsSet.add(`${item} Theory`);
  subjectsSet.add(`${item} Practical`);
  subjectsSet.add(`Introduction to ${item}`);
});

// Convert back to sorted array
const finalSubjects = Array.from(subjectsSet).sort((a, b) => a.localeCompare(b));

console.log(`Generated ${finalSubjects.length} subjects.`);

const targetPath = path.join(__dirname, '../backend/data/indian_subjects.json');
fs.writeFileSync(targetPath, JSON.stringify({ subjects: finalSubjects }, null, 2));
console.log(`Saved subjects to ${targetPath}`);
