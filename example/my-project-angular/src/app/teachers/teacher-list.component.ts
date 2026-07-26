import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Teacher } from '../models';

@Component({
  selector: 'app-teacher-list',
  standalone: true,
  imports: [MatButtonModule],
  template: `
    <table class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Subject</th>
          <th>Years of Experience</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        @for (teacher of teachers; track teacher.id) {
          <tr>
            <td>{{ teacher.name }}</td>
            <td>{{ teacher.subject }}</td>
            <td>{{ teacher.yearsOfExperience }}</td>
            <td>
              <button
                mat-raised-button
                color="primary"
                [id]="'teacher-' + teacher.id + '-edit-btn'"
                (click)="edit.emit(teacher)"
              >
                Edit
              </button>
              <button
                mat-raised-button
                color="warn"
                [id]="'teacher-' + teacher.id + '-delete-btn'"
                style="margin-left: 8px"
                (click)="remove.emit(teacher.id)"
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
export class TeacherListComponent {
  @Input() teachers: Teacher[] = [];
  @Output() edit = new EventEmitter<Teacher>();
  @Output() remove = new EventEmitter<string | number | undefined>();
}
