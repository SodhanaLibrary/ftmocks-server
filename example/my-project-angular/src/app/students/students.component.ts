import { Component, OnInit } from '@angular/core';
import { ApiService } from '../api.service';
import { Student } from '../models';
import { StudentFormComponent } from './student-form.component';
import { StudentListComponent } from './student-list.component';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [StudentFormComponent, StudentListComponent],
  template: `
    <h1 class="page-title">Student Management</h1>
    <app-student-form
      [selectedStudent]="selectedStudent"
      (submitStudent)="onSubmit($event)"
    />
    <app-student-list
      [students]="students"
      (edit)="onEdit($event)"
      (remove)="onDelete($event)"
    />
  `,
})
export class StudentsComponent implements OnInit {
  students: Student[] = [];
  selectedStudent: Student | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.fetchStudents();
  }

  fetchStudents(): void {
    this.api.getStudents().subscribe({
      next: (students) => (this.students = students),
      error: (error) => console.error('Error fetching students:', error),
    });
  }

  onSubmit(student: Student): void {
    const request$ =
      this.selectedStudent && this.selectedStudent.id != null
        ? this.api.updateStudent(this.selectedStudent.id, student)
        : this.api.createStudent(student);
    request$.subscribe(() => {
      this.fetchStudents();
      this.selectedStudent = null;
    });
  }

  onEdit(student: Student): void {
    this.selectedStudent = student;
  }

  onDelete(id: string | number | undefined): void {
    if (id == null) {
      return;
    }
    this.api.deleteStudent(id).subscribe(() => this.fetchStudents());
  }
}
