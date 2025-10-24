// src/api.js

const STUDENTS_API_URL = 'http://localhost:4051/api/students';
const TEACHERS_API_URL = 'http://localhost:4051/api/teachers';
const SUBJECTS_API_URL = 'http://localhost:4051/api/subjects';

export const getStudents = () =>
  fetch(STUDENTS_API_URL).then((response) => response.json());

export const createStudent = (student) =>
  fetch(STUDENTS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(student),
  }).then((response) => response.json());

export const updateStudent = (id, student) =>
  fetch(`${STUDENTS_API_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(student),
  }).then((response) => response.json());

export const deleteStudent = (id) =>
  fetch(`${STUDENTS_API_URL}/${id}`, {
    method: 'DELETE',
  }).then((response) => response.json());

export const getTeachers = () =>
  fetch(TEACHERS_API_URL).then((response) => response.json());

export const createTeacher = (teacher) => {
  console.log('🌐 API: createTeacher called with:', teacher);
  console.log('🌐 API: Making POST request to:', TEACHERS_API_URL);

  return fetch(TEACHERS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(teacher),
  }).then((response) => response.json());
};

export const updateTeacher = (id, teacher) =>
  fetch(`${TEACHERS_API_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(teacher),
  }).then((response) => response.json());

export const deleteTeacher = (id) =>
  fetch(`${TEACHERS_API_URL}/${id}`, {
    method: 'DELETE',
  }).then((response) => response.json());

export const getSubjects = () =>
  fetch(SUBJECTS_API_URL).then((response) => response.json());

export const createSubject = (subject) =>
  fetch(SUBJECTS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subject),
  }).then((response) => response.json());

export const updateSubject = (id, subject) =>
  fetch(`${SUBJECTS_API_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subject),
  }).then((response) => response.json());

export const deleteSubject = (id) =>
  fetch(`${SUBJECTS_API_URL}/${id}`, {
    method: 'DELETE',
  }).then((response) => response.json());
