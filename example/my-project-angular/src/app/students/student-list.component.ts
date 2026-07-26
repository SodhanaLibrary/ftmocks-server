import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Student } from '../models';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [MatButtonModule],
  template: `
    <table class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Age</th>
          <th>Grade</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        @for (student of students; track student.id) {
          <tr>
            <td>{{ student.name }}</td>
            <td>{{ student.age }}</td>
            <td>{{ student.grade }}</td>
            <td>
              <button
                mat-raised-button
                color="primary"
                [id]="'student-' + student.id + '-edit-btn'"
                (click)="edit.emit(student)"
              >
                Edit
              </button>
              <button
                mat-raised-button
                color="warn"
                [id]="'student-' + student.id + '-delete-btn'"
                style="margin-left: 8px"
                (click)="remove.emit(student.id)"
              >
                Delete
              </button>
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class StudentListComponent {
  @Input() students: Student[] = [];
  @Output() edit = new EventEmitter<Student>();
  @Output() remove = new EventEmitter<string | number | undefined>();
}
