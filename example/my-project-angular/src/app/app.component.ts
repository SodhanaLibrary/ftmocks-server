import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { TeachersComponent } from './teachers/teachers.component';
import { StudentsComponent } from './students/students.component';
import { SubjectsComponent } from './subjects/subjects.component';

type View = 'teachers' | 'students' | 'subjects';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    TeachersComponent,
    StudentsComponent,
    SubjectsComponent,
  ],
  template: `
    <mat-toolbar color="primary">
      <span id="header-title">School Portal</span>
      <span class="spacer"></span>
      <button
        mat-button
        id="header-menu-teachers"
        (click)="currentView = 'teachers'"
      >
        Teachers
      </button>
      <button
        mat-button
        id="header-menu-students"
        (click)="currentView = 'students'"
      >
        Students
      </button>
      <button
        mat-button
        id="header-menu-subjects"
        (click)="currentView = 'subjects'"
      >
        Subjects
      </button>
    </mat-toolbar>

    <div class="container">
      @if (currentView === 'teachers') {
        <app-teachers />
      }
      @if (currentView === 'students') {
        <app-students />
      }
      @if (currentView === 'subjects') {
        <app-subjects />
      }
    </div>
  `,
})
export class AppComponent {
  currentView: View = 'teachers';
}
