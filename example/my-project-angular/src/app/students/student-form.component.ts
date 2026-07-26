import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Student } from '../models';

@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="form-row">
      <mat-form-field>
        <mat-label>Name</mat-label>
        <input
          matInput
          id="student-form-name"
          name="name"
          [(ngModel)]="student.name"
          required
        />
      </mat-form-field>
      <mat-form-field>
        <mat-label>Age</mat-label>
        <input
          matInput
          id="student-form-age"
          name="age"
          type="number"
          [(ngModel)]="student.age"
          required
        />
      </mat-form-field>
      <mat-form-field>
        <mat-label>Grade</mat-label>
        <input
          matInput
          id="student-form-grade"
          name="grade"
          [(ngModel)]="student.grade"
          required
        />
      </mat-form-field>
      <button
        mat-raised-button
        color="primary"
        id="student-form-submit"
        (click)="submit()"
      >
        {{ selectedStudent ? 'Update' : 'Create' }}
      </button>
    </div>
  `,
})
export class StudentFormComponent implements OnChanges {
  @Input() selectedStudent: Student | null = null;
  @Output() submitStudent = new EventEmitter<Student>();

  student: Student = { name: '', age: '', grade: '' };

  ngOnChanges(): void {
    if (this.selectedStudent) {
      this.student = { ...this.selectedStudent };
    }
  }

  submit(): void {
    this.submitStudent.emit(this.student);
    this.student = { name: '', age: '', grade: '' };
  }
}
