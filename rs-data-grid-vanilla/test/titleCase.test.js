import { describe, it, expect } from 'vitest';
import { titleCase } from '../src/rsDataGrid/titleCase.js';

describe('titleCase', () => {
  it('capitalizes the first letter of each word and lowercases the rest', () => {
    expect(titleCase('hello world')).toBe('Hello World');
  });

  it('lowercases already-uppercase letters after the first', () => {
    expect(titleCase('HELLO WORLD')).toBe('Hello World');
  });

  it('handles a single word', () => {
    expect(titleCase('university')).toBe('University');
  });

  it('handles snake_case-ish dataFields with underscores as part of the word', () => {
    expect(titleCase('first_name')).toBe('First_name');
  });

  it('handles an empty string', () => {
    expect(titleCase('')).toBe('');
  });
});
