// src/api.js
import axios from 'axios';

const STUDENTS_API_URL = '/api/students';

export const getStudents = () => axios.get(STUDENTS_API_URL);
export const createStudent = (student) => axios.post(STUDENTS_API_URL, student);
export const updateStudent = (id, student) => axios.put(`${STUDENTS_API_URL}/${id}`, student);
export const deleteStudent = (id) => axios.delete(`${STUDENTS_API_URL}/${id}`);


const TEACHERS_API_URL = '/api/teachers';

export const getTeachers = () => axios.get(TEACHERS_API_URL);
export const createTeacher = (teacher) => axios.post(TEACHERS_API_URL, teacher);
export const updateTeacher = (id, teacher) => axios.put(`${TEACHERS_API_URL}/${id}`, teacher);
export const deleteTeacher = (id) => axios.delete(`${TEACHERS_API_URL}/${id}`);


const SUBJECTS_API_URL = '/api/subjects';

export const getSubjects = () => axios.get(SUBJECTS_API_URL);
export const createSubject = (subject) => axios.post(SUBJECTS_API_URL, subject);
export const updateSubject = (id, subject) => axios.put(`${SUBJECTS_API_URL}/${id}`, subject);
export const deleteSubject = (id) => axios.delete(`${SUBJECTS_API_URL}/${id}`);
