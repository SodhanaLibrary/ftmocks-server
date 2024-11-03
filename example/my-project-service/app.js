// app.js
const express = require('express');
const app = express();
const PORT = 4051;

// Middleware to parse JSON
app.use(express.json());

// Static array to act as our "database"
let students = [
    { id: 1, name: "Alice Johnson", age: 16, grade: "10th", email: "alice.johnson@example.com" },
    { id: 2, name: "Bob Smith", age: 17, grade: "11th", email: "bob.smith@example.com" },
    { id: 3, name: "Cathy Brown", age: 15, grade: "9th", email: "cathy.brown@example.com" },
    { id: 4, name: "David Wilson", age: 18, grade: "12th", email: "david.wilson@example.com" },
    { id: 5, name: "Eva Davis", age: 16, grade: "10th", email: "eva.davis@example.com" },
];;
// Static array to act as our "database" for teachers
let teachers = [
    { id: 1, name: "Mr. Thomas Anderson", age: 45, subject: "Mathematics", email: "thomas.anderson@example.com" },
    { id: 2, name: "Ms. Maria Rodriguez", age: 39, subject: "English", email: "maria.rodriguez@example.com" },
    { id: 3, name: "Mr. James Miller", age: 50, subject: "Science", email: "james.miller@example.com" },
    { id: 4, name: "Mrs. Susan Lee", age: 42, subject: "History", email: "susan.lee@example.com" },
    { id: 5, name: "Dr. Rachel Scott", age: 35, subject: "Physical Education", email: "rachel.scott@example.com" },
];

// Static array to act as our "database" for subjects
let subjects = [
    { id: 1, name: "Mathematics", credits: 4 },
    { id: 2, name: "English", credits: 3 },
    { id: 3, name: "Science", credits: 4 },
    { id: 4, name: "History", credits: 3 },
    { id: 5, name: "Physical Education", credits: 2 },
];



// CRUD Routes

// Create a new student
app.post('/api/students', (req, res) => {
    const { name, age, grade } = req.body;
    const newStudent = { id: students.length + 1, name, age, grade };
    students.push(newStudent);
    res.status(201).json(newStudent);
});

// Read all students
app.get('/api/students', (req, res) => {
    res.json(students);
});

// Read a single student by ID
app.get('/api/students/:id', (req, res) => {
    const studentId = parseInt(req.params.id, 10);
    const student = students.find(s => s.id === studentId);
    if (!student) {
        return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
});

// Update a student by ID
app.put('/api/students/:id', (req, res) => {
    const studentId = parseInt(req.params.id, 10);
    const { name, age, grade } = req.body;

    const studentIndex = students.findIndex(s => s.id === studentId);
    if (studentIndex === -1) {
        return res.status(404).json({ message: 'Student not found' });
    }

    const updatedStudent = { id: studentId, name, age, grade };
    students[studentIndex] = updatedStudent;
    res.json(updatedStudent);
});

// Delete a student by ID
app.delete('/api/students/:id', (req, res) => {
    const studentId = parseInt(req.params.id, 10);
    const studentIndex = students.findIndex(s => s.id === studentId);

    if (studentIndex === -1) {
        return res.status(404).json({ message: 'Student not found' });
    }

    students.splice(studentIndex, 1);
    res.json({ message: 'Student deleted successfully' });
});

// Create a new teacher
app.post('/api/teachers', (req, res) => {
    const { name, subject, yearsOfExperience } = req.body;
    const newTeacher = { id: teachers.length + 1, name, subject, yearsOfExperience };
    teachers.push(newTeacher);
    res.status(201).json(newTeacher);
});

// Read all teachers
app.get('/api/teachers', (req, res) => {
    res.json(teachers);
});

// Read a single teacher by ID
app.get('/api/teachers/:id', (req, res) => {
    const teacherId = parseInt(req.params.id, 10);
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
    }
    res.json(teacher);
});

// Update a teacher by ID
app.put('/api/teachers/:id', (req, res) => {
    const teacherId = parseInt(req.params.id, 10);
    const { name, subject, yearsOfExperience } = req.body;

    const teacherIndex = teachers.findIndex(t => t.id === teacherId);
    if (teacherIndex === -1) {
        return res.status(404).json({ message: 'Teacher not found' });
    }

    const updatedTeacher = { id: teacherId, name, subject, yearsOfExperience };
    teachers[teacherIndex] = updatedTeacher;
    res.json(updatedTeacher);
});

// Delete a teacher by ID
app.delete('/api/teachers/:id', (req, res) => {
    const teacherId = parseInt(req.params.id, 10);
    const teacherIndex = teachers.findIndex(t => t.id === teacherId);

    if (teacherIndex === -1) {
        return res.status(404).json({ message: 'Teacher not found' });
    }

    teachers.splice(teacherIndex, 1);
    res.json({ message: 'Teacher deleted successfully' });
});

// CRUD Routes

// Create a new subject
app.post('/api/subjects', (req, res) => {
    const { name, credits } = req.body;
    const newSubject = { id: subjects.length + 1, name, credits };
    subjects.push(newSubject);
    res.status(201).json(newSubject);
});

// Read all subjects
app.get('/api/subjects', (req, res) => {
    res.json(subjects);
});

// Read a single subject by ID
app.get('/api/subjects/:id', (req, res) => {
    const subjectId = parseInt(req.params.id, 10);
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) {
        return res.status(404).json({ message: 'Subject not found' });
    }
    res.json(subject);
});

// Update a subject by ID
app.put('/api/subjects/:id', (req, res) => {
    const subjectId = parseInt(req.params.id, 10);
    const { name, credits } = req.body;

    const subjectIndex = subjects.findIndex(s => s.id === subjectId);
    if (subjectIndex === -1) {
        return res.status(404).json({ message: 'Subject not found' });
    }

    const updatedSubject = { id: subjectId, name, credits };
    subjects[subjectIndex] = updatedSubject;
    res.json(updatedSubject);
});

// Delete a subject by ID
app.delete('/api/subjects/:id', (req, res) => {
    const subjectId = parseInt(req.params.id, 10);
    const subjectIndex = subjects.findIndex(s => s.id === subjectId);

    if (subjectIndex === -1) {
        return res.status(404).json({ message: 'Subject not found' });
    }

    subjects.splice(subjectIndex, 1);
    res.json({ message: 'Subject deleted successfully' });
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
