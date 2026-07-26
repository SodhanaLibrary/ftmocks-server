import { Component, OnInit } from '@angular/core';
import { ApiService } from '../api.service';
import { Teacher } from '../models';
import { TeacherFormComponent } from './teacher-form.component';
import { TeacherListComponent } from './teacher-list.component';

@Component({
  selector: 'app-teachers',
  standalone: true,
  imports: [TeacherFormComponent, TeacherListComponent],
  template: `
    <h1 class="page-title">Teacher Management</h1>
    <app-teacher-form
      [selectedTeacher]="selectedTeacher"
      (submitTeacher)="onSubmit($event)"
    />
    <app-teacher-list
      [teachers]="teachers"
      (edit)="onEdit($event)"
      (remove)="onDelete($event)"
    />
  `,
})
export class TeachersComponent implements OnInit {
  teachers: Teacher[] = [];
  selectedTeacher: Teacher | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.fetchTeachers();
  }

  fetchTeachers(): void {
    this.api.getTeachers().subscribe({
      next: (teachers) => (this.teachers = teachers),
      error: (error) => console.error('Error fetching teachers:', error),
    });
  }

  onSubmit(teacher: Teacher): void {
    const request$ =
      this.selectedTeacher && this.selectedTeacher.id != null
        ? this.api.updateTeacher(this.selectedTeacher.id, teacher)
        : this.api.createTeacher(teacher);
    request$.subscribe(() => {
      this.fetchTeachers();
      this.selectedTeacher = null;
    });
  }

  onEdit(teacher: Teacher): void {
    this.selectedTeacher = teacher;
  }

  onDelete(id: string | number | undefined): void {
    if (id == null) {
      return;
    }
    this.api.deleteTeacher(id).subscribe(() => this.fetchTeachers());
  }
}
