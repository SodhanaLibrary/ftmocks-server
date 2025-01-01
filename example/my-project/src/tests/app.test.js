/* eslint-disable */

import React, { StrictMode } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  queryByAttribute,
  queryByText,
  getByText,
  getByTestId,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  initiateJestFetch,
  saveSnap,
  deleteAllSnaps
} from 'ftmocks-utils';
import App from '../App';
import { ftmocksConifg } from './test-config';


const getById = queryByAttribute.bind(null, 'id');
const getByXPath = (container, xpath) => {
  const iterator = document.evaluate(
    xpath,
    container,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  );
  return iterator.singleNodeValue;
}

const initiateGlobal = (jest) => {
  global.console = {
    ...console,
    // uncomment to ignore a specific log level
    log: jest.fn(),
    // debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // Deprecated
      removeListener: jest.fn(), // Deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};
jest.setTimeout(60000);

beforeEach(() => {
  initiateGlobal(jest);
});

afterEach(cleanup);


// create teachers test case
it('create teachers', async () => {
  await initiateJestFetch(jest, ftmocksConifg, 'create teachers');
  const dom = render(<App />);
  await deleteAllSnaps(ftmocksConifg, 'create teachers');

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='teacher-form-name']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='teacher-form-name']"))
  fireEvent.change(getByXPath(dom.container, "//*[@id='teacher-form-name']"), "undefined");
  fireEvent.change(getByXPath(dom.container, "//*[@id='teacher-form-name']"), "undefined");
  fireEvent.change(getByXPath(dom.container, "//*[@id='teacher-form-name']"), "undefined");
  await saveSnap(dom.container.outerHTML, ftmocksConifg, 'create teachers');

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='teacher-form-subject']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='teacher-form-subject']"))
  fireEvent.change(getByXPath(dom.container, "//*[@id='teacher-form-subject']"), "undefined");
  fireEvent.change(getByXPath(dom.container, "//*[@id='teacher-form-subject']"), "undefined");
  fireEvent.change(getByXPath(dom.container, "//*[@id='teacher-form-subject']"), "undefined");
  fireEvent.change(getByXPath(dom.container, "//*[@id='teacher-form-subject']"), "undefined");
  fireEvent.change(getByXPath(dom.container, "//*[@id='teacher-form-subject']"), "undefined");
  await saveSnap(dom.container.outerHTML, ftmocksConifg, 'create teachers');

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='teacher-form-experience']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='teacher-form-experience']"))
  await saveSnap(dom.container.outerHTML, ftmocksConifg, 'create teachers');

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='teacher-form-submit']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='teacher-form-submit']"))
  await saveSnap(dom.container.outerHTML, ftmocksConifg, 'create teachers');
});

// update teachers test case
it('update teachers', async () => {
  await initiateJestFetch(jest, ftmocksConifg, 'update teachers');
  const dom = render(<App />);

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='teacher-6-edit-btn']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='teacher-6-edit-btn']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='teacher-form-experience']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='teacher-form-experience']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='teacher-form-submit']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='teacher-form-submit']"))
});

// delete teachers test case
it('delete teachers', async () => {
  await initiateJestFetch(jest, ftmocksConifg, 'delete teachers');
  const dom = render(<App />);

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='teacher-6-delete-btn']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='teacher-6-delete-btn']"))
});

// create students test case
it('create students', async () => {
  await initiateJestFetch(jest, ftmocksConifg, 'create students');
  const dom = render(<App />);

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='header-menu-students']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='header-menu-students']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='student-form-name']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='student-form-name']"))
  fireEvent.change(getByXPath(dom.container, "//*[@id='student-form-name']"), "undefined");
  fireEvent.change(getByXPath(dom.container, "//*[@id='student-form-name']"), "undefined");
  fireEvent.change(getByXPath(dom.container, "//*[@id='student-form-name']"), "undefined");

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='student-form-age']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='student-form-age']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='student-form-grade']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='student-form-grade']"))
  fireEvent.change(getByXPath(dom.container, "//*[@id='student-form-grade']"), "undefined");

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='student-form-submit']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='student-form-submit']"))
});

// update students test case
it('update students', async () => {
  await initiateJestFetch(jest, ftmocksConifg, 'update students');
  const dom = render(<App />);

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='header-menu-students']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='header-menu-students']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='student-6-edit-btn']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='student-6-edit-btn']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='student-form-grade']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='student-form-grade']"))
  fireEvent.change(getByXPath(dom.container, "//*[@id='student-form-grade']"), "undefined");

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='student-form-submit']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='student-form-submit']"))
});

// delete students test case
it('delete students', async () => {
  await initiateJestFetch(jest, ftmocksConifg, 'delete students');
  const dom = render(<App />);

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='header-menu-students']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='header-menu-students']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='student-6-delete-btn']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='student-6-delete-btn']"))
});

// create subjects test case
it('create subjects', async () => {
  await initiateJestFetch(jest, ftmocksConifg, 'create subjects');
  const dom = render(<App />);

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='header-menu-subjects']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='header-menu-subjects']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='subject-form-name']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='subject-form-name']"))
  fireEvent.change(getByXPath(dom.container, "//*[@id='subject-form-name']"), "undefined");
  fireEvent.change(getByXPath(dom.container, "//*[@id='subject-form-name']"), "undefined");
  fireEvent.change(getByXPath(dom.container, "//*[@id='subject-form-name']"), "undefined");
  fireEvent.change(getByXPath(dom.container, "//*[@id='subject-form-name']"), "undefined");
  fireEvent.change(getByXPath(dom.container, "//*[@id='subject-form-name']"), "undefined");
  fireEvent.change(getByXPath(dom.container, "//*[@id='subject-form-name']"), "undefined");

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='subject-form-credits']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='subject-form-credits']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='subject-form-submit']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='subject-form-submit']"))
});

// update subjects test case
it('update subjects', async () => {
  await initiateJestFetch(jest, ftmocksConifg, 'update subjects');
  const dom = render(<App />);

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='header-menu-subjects']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='header-menu-subjects']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='subject-6-edit-btn']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='subject-6-edit-btn']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='subject-form-credits']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='subject-form-credits']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='subject-form-submit']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='subject-form-submit']"))
});

// delete subjects test case
it('delete subjects', async () => {
  await initiateJestFetch(jest, ftmocksConifg, 'delete subjects');
  const dom = render(<App />);

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='header-menu-subjects']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='header-menu-subjects']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='subject-6-delete-btn']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='subject-6-delete-btn']"))
});

