import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Subject } from '../models';

@Component({
  selector: 'app-subject-list',
  standalone: true,
  imports: [MatButtonModule],
  template: `
    <table class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Credits</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        @for (subject of subjects; track subject.id) {
          <tr>
            <td>{{ subject.name }}</td>
            <td>{{ subject.credits }}</td>
            <td>
              <button
                mat-raised-button
                color="primary"
                [id]="'subject-' + subject.id + '-edit-btn'"
                (click)="edit.emit(subject)"
              >
                Edit
              </button>
              <button
                mat-raised-button
                color="warn"
                [id]="'subject-' + subject.id + '-delete-btn'"
                style="margin-left: 8px"
                (click)="remove.emit(subject.id)"
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
export class SubjectListComponent {
  @Input() subjects: Subject[] = [];
  @Output() edit = new EventEmitter<Subject>();
  @Output() remove = new EventEmitter<string | number | undefined>();
}
