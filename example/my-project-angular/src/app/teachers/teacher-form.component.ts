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
import { Teacher } from '../models';

@Component({
  selector: 'app-teacher-form',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="form-row">
      <mat-form-field>
        <mat-label>Name</mat-label>
        <input
          matInput
          id="teacher-form-name"
          name="name"
          [(ngModel)]="teacher.name"
          required
        />
      </mat-form-field>
      <mat-form-field>
        <mat-label>Subject</mat-label>
        <input
          matInput
          id="teacher-form-subject"
          name="subject"
          [(ngModel)]="teacher.subject"
          required
        />
      </mat-form-field>
      <mat-form-field>
        <mat-label>Years of Experience</mat-label>
        <input
          matInput
          id="teacher-form-experience"
          name="yearsOfExperience"
          type="number"
          [(ngModel)]="teacher.yearsOfExperience"
          required
        />
      </mat-form-field>
      <button
        mat-raised-button
        color="primary"
        id="teacher-form-submit"
        (click)="submit()"
      >
        {{ selectedTeacher ? 'Update' : 'Create' }}
      </button>
    </div>
  `,
})
export class TeacherFormComponent implements OnChanges {
  @Input() selectedTeacher: Teacher | null = null;
  @Output() submitTeacher = new EventEmitter<Teacher>();

  teacher: Teacher = { name: '', subject: '', yearsOfExperience: '' };

  ngOnChanges(): void {
    if (this.selectedTeacher) {
      this.teacher = { ...this.selectedTeacher };
    }
  }

  submit(): void {
    this.submitTeacher.emit(this.teacher);
    this.teacher = { name: '', subject: '', yearsOfExperience: '' };
  }
}
