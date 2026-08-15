import { describe, expect, it } from 'vitest';
import { titleCase } from './titleCase';

describe('titleCase', () => {
  it('capitalizes the first letter of each word and lowercases the rest', () => {
    expect(titleCase('hello world')).toBe('Hello World');
  });

  it('lowercases already-uppercase letters after the first', () => {
    expect(titleCase('HELLO WORLD')).toBe('Hello World');
  });

  it('handles a single word', () => {
    expect(titleCase('movies')).toBe('Movies');
  });

  it('handles an empty string', () => {
    expect(titleCase('')).toBe('');
  });

  it('handles numbers and mixed alphanumeric words', () => {
    expect(titleCase('release_date 2024')).toBe('Release_date 2024');
  });

  it('handles multiple spaces between words', () => {
    expect(titleCase('foo  bar')).toBe('Foo  Bar');
  });
});
