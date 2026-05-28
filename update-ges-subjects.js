import initSqlJs from 'sql.js';
import fs from 'fs';

async function updateGESSubjects() {
  const SQL = await initSqlJs();
  
  // Load existing database
  let buffer = null;
  if (fs.existsSync('school.db')) {
    buffer = fs.readFileSync('school.db');
  }
  const db = new SQL.Database(buffer);
  
  // Create class_subjects table if not exists
  db.run(`
    CREATE TABLE IF NOT EXISTS class_subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      UNIQUE(class_name, subject_name)
    )
  `);
  
  // First, rename JSS to JHS in existing data
  console.log('Updating class names from JSS to JHS...');
  db.run("UPDATE students SET class = REPLACE(class, 'JSS', 'JHS') WHERE class LIKE 'JSS%'");
  db.run("UPDATE attendance SET class = REPLACE(class, 'JSS', 'JHS') WHERE class LIKE 'JSS%'");
  db.run("UPDATE class_subjects SET class_name = REPLACE(class_name, 'JSS', 'JHS') WHERE class_name LIKE 'JSS%'");
  
  // Clear existing subjects to replace with updated ones
  db.run("DELETE FROM class_subjects");
  
  // Define updated GES subjects
  const subjectsByClass = {
    'Nursery 1': ['Language and Literacy', 'Numeracy', 'Creative Activities', 'Environmental Studies', 'Physical Development'],
    'Nursery 2': ['Language and Literacy', 'Numeracy', 'Creative Activities', 'Environmental Studies', 'Physical Development'],
    'KG 1': ['Language and Literacy', 'Numeracy', 'Creative Activities', 'Environmental Studies', 'Physical Development'],
    'KG 2': ['Language and Literacy', 'Numeracy', 'Creative Activities', 'Environmental Studies', 'Physical Development'],
    'Primary 1': ['English Language', 'Mathematics', 'Science', 'Computing', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'Physical Education'],
    'Primary 2': ['English Language', 'Mathematics', 'Science', 'Computing', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'Physical Education'],
    'Primary 3': ['English Language', 'Mathematics', 'Science', 'Computing', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'Physical Education'],
    'Primary 4': ['English Language', 'Mathematics', 'Science', 'Computing', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Physical Education'],
    'Primary 5': ['English Language', 'Mathematics', 'Science', 'Computing', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Physical Education'],
    'Primary 6': ['English Language', 'Mathematics', 'Science', 'Computing', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Physical Education'],
    'JHS 1': ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Creative Arts', 'Information and Communications Technology', 'Career Technology'],
    'JHS 2': ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Creative Arts', 'Information and Communications Technology', 'Career Technology'],
    'JHS 3': ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Creative Arts', 'Information and Communications Technology', 'Career Technology']
  };
  
  // Insert all subjects
  let totalAdded = 0;
  for (const [className, subjects] of Object.entries(subjectsByClass)) {
    for (const subject of subjects) {
      try {
        db.run(
          "INSERT INTO class_subjects (class_name, subject_name) VALUES (?, ?)",
          [className, subject]
        );
        totalAdded++;
      } catch (e) {
        console.log(`Error adding ${className} - ${subject}:`, e.message);
      }
    }
  }
  
  // Save database
  const data = db.export();
  const bufferData = Buffer.from(data);
  fs.writeFileSync('school.db', bufferData);
  
  console.log(`\n✅ Updated ${totalAdded} subjects across 13 classes`);
  console.log('\nChanges made:');
  console.log('- Renamed JSS to JHS');
  console.log('- Replaced "Our World Our People" with "Computing" for Primary 1-6');
  console.log('- Replaced "Basic Design and Technology" with "Creative Arts" for JHS 1-3');
  
  // Verify the changes
  const primaryResult = db.exec("SELECT subject_name FROM class_subjects WHERE class_name = 'Primary 1' AND subject_name = 'Computing'");
  if (primaryResult.length > 0) {
    console.log('\n✓ Computing subject added successfully for Primary classes');
  }
  
  const jhsResult = db.exec("SELECT subject_name FROM class_subjects WHERE class_name = 'JHS 1' AND subject_name = 'Creative Arts'");
  if (jhsResult.length > 0) {
    console.log('✓ Creative Arts subject added successfully for JHS classes');
  }
  
  // Show class names to confirm JHS is there
  const classes = db.exec("SELECT DISTINCT class_name FROM class_subjects ORDER BY class_name");
  console.log('\nClasses in database:');
  classes[0].values.forEach(row => {
    console.log(`  - ${row[0]}`);
  });
}

updateGESSubjects().catch(console.error);
