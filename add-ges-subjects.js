import initSqlJs from 'sql.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function addGESSubjects() {
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
  
  // Define GES subjects by class
  const subjectsByClass = {
    'Nursery 1': ['Language and Literacy', 'Numeracy', 'Creative Activities', 'Environmental Studies', 'Physical Development'],
    'Nursery 2': ['Language and Literacy', 'Numeracy', 'Creative Activities', 'Environmental Studies', 'Physical Development'],
    'KG 1': ['Language and Literacy', 'Numeracy', 'Creative Activities', 'Environmental Studies', 'Physical Development'],
    'KG 2': ['Language and Literacy', 'Numeracy', 'Creative Activities', 'Environmental Studies', 'Physical Development'],
    'Primary 1': ['English Language', 'Mathematics', 'Science', 'Our World Our People', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'Physical Education'],
    'Primary 2': ['English Language', 'Mathematics', 'Science', 'Our World Our People', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'Physical Education'],
    'Primary 3': ['English Language', 'Mathematics', 'Science', 'Our World Our People', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'Physical Education'],
    'Primary 4': ['English Language', 'Mathematics', 'Science', 'Our World Our People', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Physical Education'],
    'Primary 5': ['English Language', 'Mathematics', 'Science', 'Our World Our People', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Physical Education'],
    'Primary 6': ['English Language', 'Mathematics', 'Science', 'Our World Our People', 'Creative Arts', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Physical Education'],
    'JSS 1': ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Basic Design and Technology', 'Information and Communications Technology', 'Career Technology'],
    'JSS 2': ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Basic Design and Technology', 'Information and Communications Technology', 'Career Technology'],
    'JSS 3': ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'Ghanaian Language', 'Religious and Moral Education', 'French', 'Basic Design and Technology', 'Information and Communications Technology', 'Career Technology']
  };
  
  // Clear existing subjects first (optional - comment out if you want to keep existing)
  // db.run("DELETE FROM class_subjects");
  
  // Insert all subjects
  let totalAdded = 0;
  for (const [className, subjects] of Object.entries(subjectsByClass)) {
    for (const subject of subjects) {
      try {
        db.run(
          "INSERT OR IGNORE INTO class_subjects (class_name, subject_name) VALUES (?, ?)",
          [className, subject]
        );
        totalAdded++;
      } catch (e) {
        console.log(`Skipped duplicate: ${className} - ${subject}`);
      }
    }
  }
  
  // Save database
  const data = db.export();
  const bufferData = Buffer.from(data);
  fs.writeFileSync('school.db', bufferData);
  
  console.log(`✅ Added ${totalAdded} subjects across 13 classes`);
  console.log('GES curriculum subjects have been populated!');
  
  // Verify
  const result = db.exec("SELECT COUNT(*) as count FROM class_subjects");
  console.log(`Total subjects in database: ${result[0].values[0][0]}`);
}

addGESSubjects().catch(console.error);
