// app.js
const express = require('express');
const app = express();
const PORT = 4051;

// Enable CORS for teacher routes
const cors = require('cors');

app.options('*', cors());
app.use(cors());

console.log('🚀 Starting School Management API Server...');
console.log('📊 Server will run on port:', PORT);

// Middleware to parse JSON
app.use(express.json());

// Middleware to log all requests
app.use((req, res, next) => {
  console.log(`📡 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (Object.keys(req.body).length > 0) {
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Static array to act as our "database"
let students = [
  { id: 1, name: 'Alice Johnson', age: 16, grade: '10th' },
  { id: 2, name: 'Bob Smith', age: 17, grade: '11th' },
  { id: 3, name: 'Cathy Brown', age: 15, grade: '9th' },
  { id: 4, name: 'David Wilson', age: 18, grade: '12th' },
  { id: 5, name: 'Eva Davis', age: 16, grade: '10th' },
];

// Static array to act as our "database" for teachers
let teachers = [
  { id: 1, name: 'Mr. Thomas Anderson', subject: 'Mathematics' },
  { id: 2, name: 'Ms. Maria Rodriguez', subject: 'English' },
  { id: 3, name: 'Mr. James Miller', subject: 'Science' },
  { id: 4, name: 'Mrs. Susan Lee', subject: 'History' },
  { id: 5, name: 'Dr. Rachel Scott', subject: 'Physical Education' },
];

// Static array to act as our "database" for subjects
let subjects = [
  { id: 1, name: 'Mathematics', credits: 4 },
  { id: 2, name: 'English', credits: 3 },
  { id: 3, name: 'Science', credits: 4 },
  { id: 4, name: 'History', credits: 3 },
  { id: 5, name: 'Physical Education', credits: 2 },
];

console.log('📚 Initialized database with:');
console.log(`👥 ${students.length} students`);
console.log(`👨‍🏫 ${teachers.length} teachers`);
console.log(`📖 ${subjects.length} subjects`);

// CRUD Routes

// Create a new student
app.post('/api/students', (req, res) => {
  console.log('➕ Creating new student...');
  const { name, age, grade } = req.body;
  console.log('📝 Student data:', { name, age, grade });

  const newStudent = { id: students.length + 1, name, age, grade };
  students.push(newStudent);

  console.log('✅ Student created successfully:', newStudent);
  console.log(`📊 Total students now: ${students.length}`);

  res.status(201).json(newStudent);
});

// Read all students
app.get('/api/students', (req, res) => {
  console.log('📋 Fetching all students...');
  console.log(`📊 Returning ${students.length} students`);
  res.json(students);
});

// Read a single student by ID
app.get('/api/students/:id', (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  console.log(`🔍 Looking for student with ID: ${studentId}`);

  const student = students.find((s) => s.id === studentId);
  if (!student) {
    console.log(`❌ Student with ID ${studentId} not found`);
    return res.status(404).json({ message: 'Student not found' });
  }

  console.log('✅ Student found:', student);
  res.json(student);
});

// Update a student by ID
app.put('/api/students/:id', (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const { name, age, grade } = req.body;

  console.log(`✏️ Updating student with ID: ${studentId}`);
  console.log('📝 New data:', { name, age, grade });

  const studentIndex = students.findIndex((s) => s.id === studentId);
  if (studentIndex === -1) {
    console.log(`❌ Student with ID ${studentId} not found for update`);
    return res.status(404).json({ message: 'Student not found' });
  }

  console.log('📄 Previous data:', students[studentIndex]);
  const updatedStudent = { id: studentId, name, age, grade };
  students[studentIndex] = updatedStudent;

  console.log('✅ Student updated successfully:', updatedStudent);
  res.json(updatedStudent);
});

// Delete a student by ID
app.delete('/api/students/:id', (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  console.log(`🗑️ Deleting student with ID: ${studentId}`);

  const studentIndex = students.findIndex((s) => s.id === studentId);

  if (studentIndex === -1) {
    console.log(`❌ Student with ID ${studentId} not found for deletion`);
    return res.status(404).json({ message: 'Student not found' });
  }

  const deletedStudent = students[studentIndex];
  console.log('📄 Deleting student:', deletedStudent);

  students.splice(studentIndex, 1);
  console.log(`✅ Student deleted successfully. Remaining: ${students.length}`);

  res.json({ message: 'Student deleted successfully' });
});

// Create a new teacher
app.post('/api/teachers', (req, res) => {
  console.log('➕ Creating new teacher...');
  const { name, subject, yearsOfExperience } = req.body;
  console.log('🧑‍🏫 Teacher data:', { name, subject, yearsOfExperience });

  const newTeacher = {
    id: teachers.length + 1,
    name,
    subject,
    yearsOfExperience,
  };
  teachers.push(newTeacher);

  console.log('✅ Teacher created successfully:', newTeacher);
  console.log(`📊 Total teachers now: ${teachers.length}`);

  res.status(201).json(newTeacher);
});

// Read all teachers
app.get('/api/teachers', (req, res) => {
  console.log('📋 Fetching all teachers...');
  console.log(`📊 Returning ${teachers.length} teachers`);
  res.json(teachers);
});

// Read a single teacher by ID
app.get('/api/teachers/:id', (req, res) => {
  const teacherId = parseInt(req.params.id, 10);
  console.log(`🔍 Looking for teacher with ID: ${teacherId}`);

  const teacher = teachers.find((t) => t.id === teacherId);
  if (!teacher) {
    console.log(`❌ Teacher with ID ${teacherId} not found`);
    return res.status(404).json({ message: 'Teacher not found' });
  }

  console.log('✅ Teacher found:', teacher);
  res.json(teacher);
});

// Update a teacher by ID
app.put('/api/teachers/:id', (req, res) => {
  const teacherId = parseInt(req.params.id, 10);
  const { name, subject, yearsOfExperience } = req.body;

  console.log(`✏️ Updating teacher with ID: ${teacherId}`);
  console.log('🧑‍🏫 New data:', { name, subject, yearsOfExperience });

  const teacherIndex = teachers.findIndex((t) => t.id === teacherId);
  if (teacherIndex === -1) {
    console.log(`❌ Teacher with ID ${teacherId} not found for update`);
    return res.status(404).json({ message: 'Teacher not found' });
  }

  console.log('📄 Previous data:', teachers[teacherIndex]);
  const updatedTeacher = { id: teacherId, name, subject, yearsOfExperience };
  teachers[teacherIndex] = updatedTeacher;

  console.log('✅ Teacher updated successfully:', updatedTeacher);
  res.json(updatedTeacher);
});

// Delete a teacher by ID
app.delete('/api/teachers/:id', (req, res) => {
  const teacherId = parseInt(req.params.id, 10);
  console.log(`🗑️ Deleting teacher with ID: ${teacherId}`);

  const teacherIndex = teachers.findIndex((t) => t.id === teacherId);

  if (teacherIndex === -1) {
    console.log(`❌ Teacher with ID ${teacherId} not found for deletion`);
    return res.status(404).json({ message: 'Teacher not found' });
  }

  const deletedTeacher = teachers[teacherIndex];
  console.log('📄 Deleting teacher:', deletedTeacher);

  teachers.splice(teacherIndex, 1);
  console.log(`✅ Teacher deleted successfully. Remaining: ${teachers.length}`);

  res.json({ message: 'Teacher deleted successfully' });
});

// Create a new subject
app.post('/api/subjects', (req, res) => {
  console.log('➕ Creating new subject...');
  const { name, credits } = req.body;
  console.log('📚 Subject data:', { name, credits });

  const newSubject = { id: subjects.length + 1, name, credits };
  subjects.push(newSubject);

  console.log('✅ Subject created successfully:', newSubject);
  console.log(`📊 Total subjects now: ${subjects.length}`);

  res.status(201).json(newSubject);
});

// Read all subjects
app.get('/api/subjects', (req, res) => {
  console.log('📋 Fetching all subjects...');
  console.log(`📊 Returning ${subjects.length} subjects`);
  res.json(subjects);
});

// Read a single subject by ID
app.get('/api/subjects/:id', (req, res) => {
  const subjectId = parseInt(req.params.id, 10);
  console.log(`🔍 Looking for subject with ID: ${subjectId}`);

  const subject = subjects.find((s) => s.id === subjectId);
  if (!subject) {
    console.log(`❌ Subject with ID ${subjectId} not found`);
    return res.status(404).json({ message: 'Subject not found' });
  }

  console.log('✅ Subject found:', subject);
  res.json(subject);
});

// Update a subject by ID
app.put('/api/subjects/:id', (req, res) => {
  const subjectId = parseInt(req.params.id, 10);
  const { name, credits } = req.body;

  console.log(`✏️ Updating subject with ID: ${subjectId}`);
  console.log('📚 New data:', { name, credits });

  const subjectIndex = subjects.findIndex((s) => s.id === subjectId);
  if (subjectIndex === -1) {
    console.log(`❌ Subject with ID ${subjectId} not found for update`);
    return res.status(404).json({ message: 'Subject not found' });
  }

  console.log('📄 Previous data:', subjects[subjectIndex]);
  const updatedSubject = { id: subjectId, name, credits };
  subjects[subjectIndex] = updatedSubject;

  console.log('✅ Subject updated successfully:', updatedSubject);
  res.json(updatedSubject);
});

// Delete a subject by ID
app.delete('/api/subjects/:id', (req, res) => {
  const subjectId = parseInt(req.params.id, 10);
  console.log(`🗑️ Deleting subject with ID: ${subjectId}`);

  const subjectIndex = subjects.findIndex((s) => s.id === subjectId);

  if (subjectIndex === -1) {
    console.log(`❌ Subject with ID ${subjectId} not found for deletion`);
    return res.status(404).json({ message: 'Subject not found' });
  }

  const deletedSubject = subjects[subjectIndex];
  console.log('📄 Deleting subject:', deletedSubject);

  subjects.splice(subjectIndex, 1);
  console.log(`✅ Subject deleted successfully. Remaining: ${subjects.length}`);

  res.json({ message: 'Subject deleted successfully' });
});

// Start the server
app.listen(PORT, () => {
  console.log('\n🎉 School Management API Server Started Successfully!');
  console.log('🌐 Server Details:');
  console.log(`   📍 URL: http://localhost:${PORT}`);
  console.log(`   🕒 Started at: ${new Date().toISOString()}`);
  console.log('\n📚 Available Endpoints:');
  console.log('   👥 Students: /api/students');
  console.log('   👨‍🏫 Teachers: /api/teachers');
  console.log('   📖 Subjects: /api/subjects');
  console.log('\n🚀 Server is ready to handle requests!');
  console.log('-------------------------------------------\n');
});
