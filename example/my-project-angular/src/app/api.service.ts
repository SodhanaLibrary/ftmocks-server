import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Student, Subject, Teacher } from './models';

// Same API endpoints as the React example so the recorded FtMocks mock data
// (testMockData/) is served identically by the FtMocks mock server on :4051.
const STUDENTS_API_URL = 'http://localhost:4051/api/students';
const TEACHERS_API_URL = 'http://localhost:4051/api/teachers';
const SUBJECTS_API_URL = 'http://localhost:4051/api/subjects';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // Students
  getStudents(): Observable<Student[]> {
    return this.http.get<Student[]>(STUDENTS_API_URL);
  }

  createStudent(student: Student): Observable<Student> {
    return this.http.post<Student>(STUDENTS_API_URL, student);
  }

  updateStudent(id: string | number, student: Student): Observable<Student> {
    return this.http.put<Student>(`${STUDENTS_API_URL}/${id}`, student);
  }

  deleteStudent(id: string | number): Observable<unknown> {
    return this.http.delete(`${STUDENTS_API_URL}/${id}`);
  }

  // Teachers
  getTeachers(): Observable<Teacher[]> {
    return this.http.get<Teacher[]>(TEACHERS_API_URL);
  }

  createTeacher(teacher: Teacher): Observable<Teacher> {
    return this.http.post<Teacher>(TEACHERS_API_URL, teacher);
  }

  updateTeacher(id: string | number, teacher: Teacher): Observable<Teacher> {
    return this.http.put<Teacher>(`${TEACHERS_API_URL}/${id}`, teacher);
  }

  deleteTeacher(id: string | number): Observable<unknown> {
    return this.http.delete(`${TEACHERS_API_URL}/${id}`);
  }

  // Subjects
  getSubjects(): Observable<Subject[]> {
    return this.http.get<Subject[]>(SUBJECTS_API_URL);
  }

  createSubject(subject: Subject): Observable<Subject> {
    return this.http.post<Subject>(SUBJECTS_API_URL, subject);
  }

  updateSubject(id: string | number, subject: Subject): Observable<Subject> {
    return this.http.put<Subject>(`${SUBJECTS_API_URL}/${id}`, subject);
  }

  deleteSubject(id: string | number): Observable<unknown> {
    return this.http.delete(`${SUBJECTS_API_URL}/${id}`);
  }
}
