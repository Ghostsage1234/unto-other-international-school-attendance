import initSqlJs from 'sql.js';
import fs from 'fs';

async function fixDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database
  let buffer = null;
  if (fs.existsSync('school.db')) {
    buffer = fs.readFileSync('school.db');
  }
  const db = new SQL.Database(buffer);
  
  // Drop existing class_subjects table to start fresh
  try {
    db.run("DROP TABLE IF EXISTS class_subjects");
    console.log("Dropped old class_subjects table");
  } catch (e) {
    console.log("Table didn't exist");
  }
  
  // Recreate the table
  db.run(`
    CREATE TABLE IF NOT EXISTS class_subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      UNIQUE(class_name, subject_name)
    )
  `);
  console.log("Created fresh class_subjects table");
  
  // Define subjects with core subjects first, then electives
  const subjectsByClass = {
    'Nursery 1': [
      'Language and Literacy', 'Numeracy', 'Creative Activities', 
      'Environmental Studies', 'Physical Development'
    ],
    'Nursery 2': [
      'Language and Literacy', 'Numeracy', 'Creative Activities', 
      'Environmental Studies', 'Physical Development'
    ],
    'KG 1': [
      'Language and Literacy', 'Numeracy', 'Creative Activities', 
      'Environmental Studies', 'Physical Development'
    ],
    'KG 2': [
      'Language and Literacy', 'Numeracy', 'Creative Activities', 
      'Environmental Studies', 'Physical Development'
    ],
    'Primary 1': [
      'English Language', 'Mathematics', 'Science', 'Computing',
      'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'Physical Education'
    ],
    'Primary 2': [
      'English Language', 'Mathematics', 'Science', 'Computing',
      'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'Physical Education'
    ],
    'Primary 3': [
      'English Language', 'Mathematics', 'Science', 'Computing',
      'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'Physical Education'
    ],
    'Primary 4': [
      'English Language', 'Mathematics', 'Science', 'Computing',
      'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Physical Education'
    ],
    'Primary 5': [
      'English Language', 'Mathematics', 'Science', 'Computing',
      'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Physical Education'
    ],
    'Primary 6': [
      'English Language', 'Mathematics', 'Science', 'Computing',
      'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Physical Education'
    ],
    'JHS 1': [
      'English Language', 'Mathematics', 'Integrated Science', 'Social Studies',
      'Ghanaian Language', 'Religious and Moral Education', 'French', 'Creative Arts', 
      'Information and Communications Technology', 'Career Technology'
    ],
    'JHS 2': [
      'English Language', 'Mathematics', 'Integrated Science', 'Social Studies',
      'Ghanaian Language', 'Religious and Moral Education', 'French', 'Creative Arts', 
      'Information and Communications Technology', 'Career Technology'
    ],
    'JHS 3': [
      'English Language', 'Mathematics', 'Integrated Science', 'Social Studies',
      'Ghanaian Language', 'Religious and Moral Education', 'French', 'Creative Arts', 
      'Information and Communications Technology', 'Career Technology'
    ]
  };
  
  // Insert all subjects
  let totalAdded = 0;
  for (const [className, subjects] of Object.entries(subjectsByClass)) {
    console.log(`\nAdding subjects for ${className}:`);
    for (const subject of subjects) {
      try {
        db.run(
          "INSERT INTO class_subjects (class_name, subject_name) VALUES (?, ?)",
          [className, subject]
        );
        console.log(`  ✓ ${subject}`);
        totalAdded++;
      } catch (e) {
        console.log(`  ✗ ${subject} - already exists`);
      }
    }
  }
  
  // Also update student records from JSS to JHS
  console.log("\nUpdating student records...");
  db.run("UPDATE students SET class = 'JHS 1' WHERE class = 'JSS 1'");
  db.run("UPDATE students SET class = 'JHS 2' WHERE class = 'JSS 2'");
  db.run("UPDATE students SET class = 'JHS 3' WHERE class = 'JSS 3'");
  console.log("Updated JSS to JHS in students table");
  
  // Update attendance records
  db.run("UPDATE attendance SET class = 'JHS 1' WHERE class = 'JSS 1'");
  db.run("UPDATE attendance SET class = 'JHS 2' WHERE class = 'JSS 2'");
  db.run("UPDATE attendance SET class = 'JHS 3' WHERE class = 'JSS 3'");
  console.log("Updated JSS to JHS in attendance table");
  
  // Save database
  const data = db.export();
  const bufferData = Buffer.from(data);
  fs.writeFileSync('school.db', bufferData);
  
  console.log(`\n✅ Successfully added ${totalAdded} subjects across 13 classes`);
  
  // Verify the data
  console.log("\n=== VERIFICATION ===");
  
  // Check JHS classes
  const jhsCheck = db.exec("SELECT DISTINCT class_name FROM class_subjects WHERE class_name LIKE 'JHS%'");
  console.log("\nJHS classes found:");
  jhsCheck[0].values.forEach(row => console.log(`  - ${row[0]}`));
  
  // Check subjects for JHS 1
  const subjectsJHS = db.exec("SELECT subject_name FROM class_subjects WHERE class_name = 'JHS 1' ORDER BY id");
  console.log("\nSubjects for JHS 1 (first 6):");
  subjectsJHS[0].values.slice(0, 6).forEach(row => console.log(`  - ${row[0]}`));
  
  // Check subjects for Primary 1
  const subjectsPrimary = db.exec("SELECT subject_name FROM class_subjects WHERE class_name = 'Primary 1' ORDER BY id");
  console.log("\nSubjects for Primary 1:");
  subjectsPrimary[0].values.forEach(row => console.log(`  - ${row[0]}`));
  
  // Check Computing is present
  const computing = db.exec("SELECT class_name FROM class_subjects WHERE subject_name = 'Computing'");
  console.log("\nClasses with Computing subject:");
  computing[0].values.forEach(row => console.log(`  - ${row[0]}`));
}

fixDatabase().catch(console.error);
