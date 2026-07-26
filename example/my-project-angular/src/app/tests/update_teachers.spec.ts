/* eslint-disable */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpErrorResponse,
  HttpResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { ftmocksHttpInterceptor, getByXPath } from 'ftmocks-utils';
import { AppComponent } from '../app.component';
import { ftmocksConifg } from './test-config';

jest.setTimeout(60000);

describe('update teachers', () => {
  it('update teachers', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideHttpClient(
          withInterceptors([
            ftmocksHttpInterceptor(ftmocksConifg, 'update teachers', {
              HttpResponse,
              HttpErrorResponse,
              of,
              throwError,
            }),
          ])
        ),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    const fixture: ComponentFixture<AppComponent> =
      TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    {
      const el = getByXPath(fixture.nativeElement, "//*[@id='teacher-6-edit-btn']");
      el && el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }
  });
});
