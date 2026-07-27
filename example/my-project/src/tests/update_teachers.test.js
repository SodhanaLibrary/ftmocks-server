/* eslint-disable */

import React from 'react';
import {
  cleanup,
  fireEvent,
  render,
  queryByAttribute,
  getByText,
  waitFor,
} from '@testing-library/react';
import { initiateJestFetch } from 'ftmocks-utils';
import '@testing-library/jest-dom';
import App from '../App';
import { ftmocksConifg } from './test-config';

const getById = queryByAttribute.bind(null, 'id');
// Recorded selectors are a mix of XPath and CSS; resolve both.
const getByXPath = (container, selector) => {
  if (typeof selector === 'string' && /^\(?\//.test(selector)) {
    const iterator = document.evaluate(
      selector,
      container,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return iterator.singleNodeValue;
  }
  try {
    return container.querySelector(selector);
  } catch {
    return null;
  }
};
jest.setTimeout(60000);

afterEach(cleanup);

// update teachers test case
it('update teachers', async () => {
  await initiateJestFetch(jest, ftmocksConifg, 'update teachers');
  const dom = render(<App />);

  await waitFor(() => {expect(getByXPath(dom.container, "//*[@id='teacher-6-edit-btn']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//*[@id='teacher-6-edit-btn']"))

  await waitFor(() => {expect(getByXPath(dom.container, "input[name='name']")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "input[name='name']"))
  fireEvent.change(getByXPath(dom.container, "//*[@id='teacher-form-name']"), { target: { value: "Dr.Update" } });

  await waitFor(() => {expect(getByXPath(dom.container, "//button[contains(text(), 'Update')]")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//button[contains(text(), 'Update')]"))

  await waitFor(() => {expect(getByXPath(dom.container, "//td[contains(text(), 'Dr.Update')]")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//td[contains(text(), 'Dr.Update')]"))

  await waitFor(() => {expect(getByXPath(dom.container, "//td[contains(text(), 'Chem')]")).toBeInTheDocument();});
  fireEvent.click(getByXPath(dom.container, "//td[contains(text(), 'Chem')]"))
});
