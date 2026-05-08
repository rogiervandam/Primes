import { beforeEach, afterEach, vi } from 'vitest';

let consoleSpies = [];
let unexpectedConsoleCalls = [];

function formatConsoleArgs(args) {
  return args
    .map((value) => {
      if (value instanceof Error) return value.stack || value.message;
      if (typeof value === 'string') return value;
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    })
    .join(' ');
}

beforeEach(() => {
  unexpectedConsoleCalls = [];
  consoleSpies = [
    vi.spyOn(console, 'error').mockImplementation((...args) => {
      unexpectedConsoleCalls.push({ level: 'error', message: formatConsoleArgs(args) });
    }),
    vi.spyOn(console, 'warn').mockImplementation((...args) => {
      unexpectedConsoleCalls.push({ level: 'warn', message: formatConsoleArgs(args) });
    }),
  ];
});

afterEach(() => {
  for (const spy of consoleSpies) {
    spy.mockRestore();
  }
  consoleSpies = [];

  if (unexpectedConsoleCalls.length > 0) {
    const details = unexpectedConsoleCalls
      .map(({ level, message }) => `[console.${level}] ${message}`)
      .join('\n');
    unexpectedConsoleCalls = [];
    throw new Error(`Unexpected console output during test:\n${details}`);
  }
});