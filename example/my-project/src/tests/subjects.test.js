/* eslint-disable */

import React, { StrictMode } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  queryByAttribute,
  getByText,
  getByTestId,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import { initiateGlobal, initiateFetch } from './testUtils';
import { testConfig } from './test-config';

const getById = queryByAttribute.bind(null, 'id');
jest.setTimeout(60000);

beforeEach(() => {
  initiateGlobal(jest);
});

afterEach(cleanup);

it('Teachers page render', async () => {
  initiateFetch(jest);
  const dom = render(<App />);
  await waitFor(() => {
    expect(getByText(dom.container, 'Mathematics')).toBeInTheDocument();
  });
});

it('Create teacher', async () => {
  initiateFetch(jest, 'Create teacher');
  const dom = render(<App />);
  await waitFor(() => {
    expect(getByText(dom.container, 'Mathematics')).toBeInTheDocument();
  });
  
  expect(getById(dom.container, "teacher-form-name")).toBeInTheDocument();
  expect(getById(dom.container, "teacher-form-subject")).toBeInTheDocument();
  expect(getById(dom.container, "teacher-form-experience")).toBeInTheDocument();
  expect(getById(dom.container, "teacher-form-submit")).toBeInTheDocument();

  fireEvent.change(getById(dom.container, "teacher-form-name"), { target: { value: "Jane Doe" } });
  fireEvent.change(getById(dom.container, "teacher-form-subject"), { target: { value: "Science" } });
  fireEvent.change(getById(dom.container, "teacher-form-experience"), { target: { value: 10 } });

  fireEvent.click(getById(dom.container, "teacher-form-submit"));
});

it('Edit teacher', async () => {
  initiateFetch(jest, 'Create teacher');
  const dom = render(<App />);
  await waitFor(() => {
    expect(getByText(dom.container, 'Mathematics')).toBeInTheDocument();
  });
  
  expect(getById(dom.container, "teacher-form-name")).toBeInTheDocument();
  expect(getById(dom.container, "teacher-form-subject")).toBeInTheDocument();
  expect(getById(dom.container, "teacher-form-experience")).toBeInTheDocument();
  expect(getById(dom.container, "teacher-form-submit")).toBeInTheDocument();

  fireEvent.click(getById(dom.container, "teacher-1-edit-btn"));

  fireEvent.change(getById(dom.container, "teacher-form-name"), { target: { value: "Jane Doe" } });
  fireEvent.change(getById(dom.container, "teacher-form-subject"), { target: { value: "Science" } });
  fireEvent.change(getById(dom.container, "teacher-form-experience"), { target: { value: 10 } });

  fireEvent.click(getById(dom.container, "teacher-form-submit"));
});

it('Delete teacher', async () => {
  initiateFetch(jest, 'Create teacher');
  const dom = render(<App />);
  await waitFor(() => {
    expect(getByText(dom.container, 'Mathematics')).toBeInTheDocument();
  });
  
  expect(getById(dom.container, "teacher-form-name")).toBeInTheDocument();
  expect(getById(dom.container, "teacher-form-subject")).toBeInTheDocument();
  expect(getById(dom.container, "teacher-form-experience")).toBeInTheDocument();
  expect(getById(dom.container, "teacher-form-submit")).toBeInTheDocument();

  fireEvent.click(getById(dom.container, "teacher-1-delete-btn"));
});
