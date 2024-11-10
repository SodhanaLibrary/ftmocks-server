/* eslint-disable */

import React, { StrictMode } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  queryByAttribute,
  getByText,
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

it('Advanced page section render', async () => {
  initiateFetch(jest);
  const dom = render(<App />);
  await waitFor(() => {
    expect(getByText(dom.container, 'Mathematics')).toBeInTheDocument();
  });
});
