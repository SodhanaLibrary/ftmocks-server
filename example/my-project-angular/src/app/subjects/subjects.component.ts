import { Component, OnInit } from '@angular/core';
import { ApiService } from '../api.service';
import { Subject } from '../models';
import { SubjectFormComponent } from './subject-form.component';
import { SubjectListComponent } from './subject-list.component';

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [SubjectFormComponent, SubjectListComponent],
  template: `
    <h1 class="page-title">Subject Management</h1>
    <app-subject-form
      [selectedSubject]="selectedSubject"
      (submitSubject)="onSubmit($event)"
    />
    <app-subject-list
      [subjects]="subjects"
      (edit)="onEdit($event)"
      (remove)="onDelete($event)"
    />
  `,
})
export class SubjectsComponent implements OnInit {
  subjects: Subject[] = [];
  selectedSubject: Subject | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.fetchSubjects();
  }

  fetchSubjects(): void {
    this.api.getSubjects().subscribe({
      next: (subjects) => (this.subjects = subjects),
      error: (error) => console.error('Error fetching subjects:', error),
    });
  }

  onSubmit(subject: Subject): void {
    const request$ =
      this.selectedSubject && this.selectedSubject.id != null
        ? this.api.updateSubject(this.selectedSubject.id, subject)
        : this.api.createSubject(subject);
    request$.subscribe(() => {
      this.fetchSubjects();
      this.selectedSubject = null;
    });
  }

  onEdit(subject: Subject): void {
    this.selectedSubject = subject;
  }

  onDelete(id: string | number | undefined): void {
    if (id == null) {
      return;
    }
    this.api.deleteSubject(id).subscribe(() => this.fetchSubjects());
  }
}
