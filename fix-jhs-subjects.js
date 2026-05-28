import initSqlJs from 'sql.js';
import fs from 'fs';

async function fixJHSSubjects() {
  const SQL = await initSqlJs();
  
  let buffer = null;
  if (fs.existsSync('school.db')) {
    buffer = fs.readFileSync('school.db');
  }
  const db = new SQL.Database(buffer);
  
  // Clear existing class_subjects
  db.run("DELETE FROM class_subjects");
  
  // Correct subjects for all classes
  const subjectsByClass = {
    'Nursery 1': ['Language and Literacy', 'Numeracy', 'Creative Activities', 'Environmental Studies', 'Physical Development'],
    'Nursery 2': ['Language and Literacy', 'Numeracy', 'Creative Activities', 'Environmental Studies', 'Physical Development'],
    'KG 1': ['Language and Literacy', 'Numeracy', 'Creative Activities', 'Environmental Studies', 'Physical Development'],
    'KG 2': ['Language and Literacy', 'Numeracy', 'Creative Activities', 'Environmental Studies', 'Physical Development'],
    
    'Primary 1': ['English Language', 'Mathematics', 'Science', 'Computing', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'History'],
    'Primary 2': ['English Language', 'Mathematics', 'Science', 'Computing', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'History'],
    'Primary 3': ['English Language', 'Mathematics', 'Science', 'Computing', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'History'],
    'Primary 4': ['English Language', 'Mathematics', 'Science', 'Computing', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'History'],
    'Primary 5': ['English Language', 'Mathematics', 'Science', 'Computing', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'History'],
    'Primary 6': ['English Language', 'Mathematics', 'Science', 'Computing', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'History'],
    
    'JHS 1': ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Creative Arts', 'Information and Communications Technology', 'Career Technology'],
    'JHS 2': ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Creative Arts', 'Information and Communications Technology', 'Career Technology'],
    'JHS 3': ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Creative Arts', 'Information and Communications Technology', 'Career Technology']
  };
  
  // Insert all subjects
  for (const [className, subjects] of Object.entries(subjectsByClass)) {
    for (const subject of subjects) {
      db.run(
        "INSERT INTO class_subjects (class_name, subject_name) VALUES (?, ?)",
        [className, subject]
      );
    }
    console.log(`✓ Added ${subjects.length} subjects for ${className}`);
  }
  
  // Save database
  const data = db.export();
  const bufferData = Buffer.from(data);
  fs.writeFileSync('school.db', bufferData);
  
  console.log("\n✅ Database updated successfully!");
  console.log("\nJHS Subjects (Social Studies only, no separate History):");
  const jhsSubjects = db.exec("SELECT subject_name FROM class_subjects WHERE class_name = 'JHS 1'");
  jhsSubjects[0].values.forEach(row => console.log(`  - ${row[0]}`));
}

fixJHSSubjects().catch(console.error);
