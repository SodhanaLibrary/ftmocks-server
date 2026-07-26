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
import { Subject } from '../models';

@Component({
  selector: 'app-subject-form',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="form-row">
      <mat-form-field>
        <mat-label>Name</mat-label>
        <input
          matInput
          id="subject-form-name"
          name="name"
          [(ngModel)]="subject.name"
          required
        />
      </mat-form-field>
      <mat-form-field>
        <mat-label>Credits</mat-label>
        <input
          matInput
          id="subject-form-credits"
          name="credits"
          type="number"
          [(ngModel)]="subject.credits"
          required
        />
      </mat-form-field>
      <button
        mat-raised-button
        color="primary"
        id="subject-form-submit"
        (click)="submit()"
      >
        {{ selectedSubject ? 'Update' : 'Create' }}
      </button>
    </div>
  `,
})
export class SubjectFormComponent implements OnChanges {
  @Input() selectedSubject: Subject | null = null;
  @Output() submitSubject = new EventEmitter<Subject>();

  subject: Subject = { name: '', credits: '' };

  ngOnChanges(): void {
    if (this.selectedSubject) {
      this.subject = { ...this.selectedSubject };
    }
  }

  submit(): void {
    this.submitSubject.emit(this.subject);
    this.subject = { name: '', credits: '' };
  }
}
