import { describe, it, expect } from 'vitest';
import { titleCase } from '../src/rsDataGrid/titleCase.js';

describe('titleCase', () => {
  it('capitalizes the first letter of each word and lowercases the rest', () => {
    expect(titleCase('hello world')).toBe('Hello World');
  });

  it('handles ALL CAPS input', () => {
    expect(titleCase('FIRST NAME')).toBe('First Name');
  });

  it('handles camelCase / snake-ish dataField-style strings as a single word', () => {
    expect(titleCase('firstName')).toBe('Firstname');
  });

  it('handles empty string', () => {
    expect(titleCase('')).toBe('');
  });

  it('handles single character words', () => {
    expect(titleCase('a b c')).toBe('A B C');
  });
});
