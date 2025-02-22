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
  initiateConsoleLogs,
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
  initiateConsoleLogs(jest, ftmocksConifg, 'create teachers');
  initiateJestFetch(jest, ftmocksConifg, 'create teachers');
  const dom = render(<App />);

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='teacher-form-name']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='teacher-form-name']"))
  fireEvent.change(getByXPath(dom.container, "//*[@id='teacher-form-name']"), "a");
  fireEvent.change(getByXPath(dom.container, "//*[@id='teacher-form-name']"), "ab");
  fireEvent.change(getByXPath(dom.container, "//*[@id='teacher-form-name']"), "abc");

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='teacher-form-subject']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='teacher-form-subject']"))
  fireEvent.change(getByXPath(dom.container, "//*[@id='teacher-form-subject']"), "m");
  fireEvent.change(getByXPath(dom.container, "//*[@id='teacher-form-subject']"), "ma");
  fireEvent.change(getByXPath(dom.container, "//*[@id='teacher-form-subject']"), "mat");
  fireEvent.change(getByXPath(dom.container, "//*[@id='teacher-form-subject']"), "math");
  fireEvent.change(getByXPath(dom.container, "//*[@id='teacher-form-subject']"), "maths");

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='teacher-form-experience']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='teacher-form-experience']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='teacher-form-submit']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='teacher-form-submit']"))
});

// update teachers test case
it('update teachers', async () => {
  initiateJestFetch(jest, ftmocksConifg, 'update teachers');
  initiateConsoleLogs(jest, ftmocksConifg, 'create teachers');
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
  initiateJestFetch(jest, ftmocksConifg, 'delete teachers');
  initiateConsoleLogs(jest, ftmocksConifg, 'create teachers');
  const dom = render(<App />);

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='teacher-6-delete-btn']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='teacher-6-delete-btn']"))
});

// create students test case
it('create students', async () => {
  initiateJestFetch(jest, ftmocksConifg, 'create students');
  initiateConsoleLogs(jest, ftmocksConifg, 'create teachers');
  const dom = render(<App />);

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='header-menu-students']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='header-menu-students']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='student-form-name']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='student-form-name']"))
  fireEvent.change(getByXPath(dom.container, "//*[@id='student-form-name']"), "s");
  fireEvent.change(getByXPath(dom.container, "//*[@id='student-form-name']"), "sr");
  fireEvent.change(getByXPath(dom.container, "//*[@id='student-form-name']"), "sri");

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='student-form-age']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='student-form-age']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='student-form-grade']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='student-form-grade']"))
  fireEvent.change(getByXPath(dom.container, "//*[@id='student-form-grade']"), "A");

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='student-form-submit']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='student-form-submit']"))
});

// update students test case
it('update students', async () => {
  initiateJestFetch(jest, ftmocksConifg, 'update students');
  initiateConsoleLogs(jest, ftmocksConifg, 'create teachers');
  const dom = render(<App />);

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='header-menu-students']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='header-menu-students']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='student-6-edit-btn']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='student-6-edit-btn']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='student-form-grade']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='student-form-grade']"))
  fireEvent.change(getByXPath(dom.container, "//*[@id='student-form-grade']"), "B");

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='student-form-submit']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='student-form-submit']"))
});

// delete students test case
it('delete students', async () => {
  initiateJestFetch(jest, ftmocksConifg, 'delete students');
  initiateConsoleLogs(jest, ftmocksConifg, 'create teachers');
  const dom = render(<App />);

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='header-menu-students']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='header-menu-students']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='student-6-delete-btn']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='student-6-delete-btn']"))
});

// create subjects test case
it('create subjects', async () => {
  initiateJestFetch(jest, ftmocksConifg, 'create subjects');
  initiateConsoleLogs(jest, ftmocksConifg, 'create teachers');
  const dom = render(<App />);

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='header-menu-subjects']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='header-menu-subjects']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='subject-form-name']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='subject-form-name']"))
  fireEvent.change(getByXPath(dom.container, "//*[@id='subject-form-name']"), "t");
  fireEvent.change(getByXPath(dom.container, "//*[@id='subject-form-name']"), "te");
  fireEvent.change(getByXPath(dom.container, "//*[@id='subject-form-name']"), "telu");
  fireEvent.change(getByXPath(dom.container, "//*[@id='subject-form-name']"), "tel");
  fireEvent.change(getByXPath(dom.container, "//*[@id='subject-form-name']"), "telug");
  fireEvent.change(getByXPath(dom.container, "//*[@id='subject-form-name']"), "telugu");

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='subject-form-credits']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='subject-form-credits']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='subject-form-submit']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='subject-form-submit']"))
});

// update subjects test case
it('update subjects', async () => {
  initiateJestFetch(jest, ftmocksConifg, 'update subjects');
  initiateConsoleLogs(jest, ftmocksConifg, 'create teachers');
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
  initiateJestFetch(jest, ftmocksConifg, 'delete subjects');
  initiateConsoleLogs(jest, ftmocksConifg, 'create teachers');
  const dom = render(<App />);

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='header-menu-subjects']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='header-menu-subjects']"))

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='subject-6-delete-btn']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='subject-6-delete-btn']"))
});


