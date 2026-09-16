import { describe, it, expect } from 'vitest';
import { qs } from './api';

describe('qs', () => {
  it('monta querystring ignorando vazios', () => {
    expect(qs({ query: 'sintel', genre: '' })).toBe('?query=sintel');
    expect(qs({})).toBe('');
    expect(qs({ genre: 'Ficção Científica' })).toBe('?genre=Fic%C3%A7%C3%A3o%20Cient%C3%ADfica');
  });
});
