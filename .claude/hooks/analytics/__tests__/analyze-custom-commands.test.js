#!/usr/bin/env node
/**
 * Tests for analyze-custom-commands.js
 * Run with: node .claude/hooks/analytics/__tests__/analyze-custom-commands.test.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Test helper to load the module functions
function loadModule() {
  const modulePath = path.join(__dirname, '..', 'analyze-custom-commands.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

// Test suite runner
class TestRunner {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(description, fn) {
    this.tests.push({ description, fn });
  }

  async run() {
    console.log(`\n📦 ${this.name}\n${'='.repeat(50)}`);

    for (const { description, fn } of this.tests) {
      try {
        await fn();
        console.log(`✅ ${description}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${description}`);
        console.log(`   Error: ${error.message}`);
        if (error.stack) {
          console.log(`   ${error.stack.split('\n').slice(1, 3).join('\n   ')}`);
        }
        this.failed++;
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Results: ${this.passed} passed, ${this.failed} failed`);

    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

// Create test suite
const suite = new TestRunner('analyze-custom-commands.js');

// Load fixtures
const fixturesDir = path.join(__dirname, 'fixtures');
const transcriptSample = fs.readFileSync(
  path.join(fixturesDir, 'transcript-sample.jsonl'),
  'utf8'
);
const statsSample = JSON.parse(
  fs.readFileSync(path.join(fixturesDir, 'stats-sample.json'), 'utf8')
);

// Test: parseTranscript
suite.test('parseTranscript: parses valid JSONL', () => {
  const mod = loadModule();
  const result = mod.parseTranscript(transcriptSample);

  assert.ok(Array.isArray(result), 'Should return an array');
  assert.ok(result.length > 0, 'Should have entries');
  assert.strictEqual(result[0].type, 'tool_use', 'First entry should be tool_use');
});

suite.test('parseTranscript: handles malformed JSONL', () => {
  const mod = loadModule();
  const input = '{invalid json}\n{"id":"1","type":"tool_use"}';
  const result = mod.parseTranscript(input);

  assert.strictEqual(result.length, 1, 'Should skip invalid lines');
  assert.strictEqual(result[0].id, '1', 'Should parse valid line');
});

suite.test('parseTranscript: handles empty input', () => {
  const mod = loadModule();
  const result = mod.parseTranscript('');

  assert.strictEqual(result.length, 0, 'Should return empty array');
});

// Test: extractCommandName
suite.test('extractCommandName: extracts from slash command', () => {
  const mod = loadModule();
  const toolInput = { command: '/list-issues' };
  const result = mod.extractCommandName(toolInput);

  assert.strictEqual(result, 'list-issues', 'Should extract command name');
});

suite.test('extractCommandName: extracts from script path', () => {
  const mod = loadModule();
  const toolInput = { command: 'node .claude/commands/check-ci.js' };
  const result = mod.extractCommandName(toolInput);

  assert.strictEqual(result, 'check-ci', 'Should extract from script path');
});

suite.test('extractCommandName: returns null for non-commands', () => {
  const mod = loadModule();
  const toolInput = { command: 'ls -la' };
  const result = mod.extractCommandName(toolInput);

  assert.strictEqual(result, null, 'Should return null');
});

suite.test('extractCommandName: handles missing command field', () => {
  const mod = loadModule();
  const toolInput = {};
  const result = mod.extractCommandName(toolInput);

  assert.strictEqual(result, null, 'Should return null');
});

suite.test('extractCommandName: extracts from Windows-style script path', () => {
  const mod = loadModule();
  const toolInput = { command: 'node .claude\\commands\\check-ci.js' };
  const result = mod.extractCommandName(toolInput);

  assert.strictEqual(result, 'check-ci', 'Should extract from Windows path');
});

suite.test('extractCommandName: extracts from Windows-style custom script', () => {
  const mod = loadModule();
  const toolInput = { command: 'node .claude\\scripts\\custom-report.js' };
  const result = mod.extractCommandName(toolInput);

  assert.strictEqual(result, 'custom-report', 'Should extract from Windows custom script');
});

suite.test('extractCommandName: handles mixed path separators', () => {
  const mod = loadModule();
  const toolInput = { command: 'node .claude/commands\\check-ci.js' };
  const result = mod.extractCommandName(toolInput);

  assert.strictEqual(result, 'check-ci', 'Should handle mixed separators');
});

// Test: getCustomCommandDefinitions
suite.test('getCustomCommandDefinitions: loads commands from directory', () => {
  const mod = loadModule();
  // Navigate up from .claude/hooks/analytics/__tests__/ to project root
  const baseDir = path.join(__dirname, '../../../..');
  const result = mod.getCustomCommandDefinitions(baseDir);

  assert.ok(Array.isArray(result), 'Should return array');
  assert.ok(result.includes('list-issues'), 'Should include list-issues');
  assert.ok(result.includes('show-issue'), 'Should include show-issue');
});

suite.test('getCustomCommandDefinitions: handles missing directory', () => {
  const mod = loadModule();
  const result = mod.getCustomCommandDefinitions('/nonexistent');

  assert.strictEqual(result.length, 0, 'Should return empty array');
});

// Test: analyzeCommands
suite.test('analyzeCommands: counts command usage', () => {
  const mod = loadModule();
  const entries = mod.parseTranscript(transcriptSample);
  const customCommands = ['list-issues', 'show-issue', 'check-ci'];
  const result = mod.analyzeCommands(entries, customCommands);

  assert.ok(result.commands instanceof Map, 'Should return Map');
  assert.ok(result.commands.has('show-issue'), 'Should detect show-issue');
  assert.ok(result.startTime, 'Should have start time');
  assert.ok(result.endTime, 'Should have end time');
});

suite.test('analyzeCommands: detects errors', () => {
  const mod = loadModule();
  const entries = mod.parseTranscript(transcriptSample);
  const customCommands = ['check-ci'];
  const result = mod.analyzeCommands(entries, customCommands);

  const checkCi = result.commands.get('check-ci');
  assert.ok(checkCi, 'Should have check-ci command');
  assert.strictEqual(checkCi.errors.length, 1, 'Should detect 1 error');
  assert.ok(checkCi.errors[0].message.includes('not found'), 'Should capture error message');
});

// Test: mergeStats
suite.test('mergeStats: merges session data into existing stats', () => {
  const mod = loadModule();
  const existing = JSON.parse(JSON.stringify(statsSample));
  const sessionAnalysis = {
    commands: new Map([
      ['list-issues', { count: 2, errors: [], timestamps: ['2026-01-28T09:00:00Z'] }],
      ['show-issue', { count: 1, errors: [], timestamps: ['2026-01-28T09:30:00Z'] }]
    ]),
    startTime: '2026-01-28T09:00:00Z',
    endTime: '2026-01-28T09:30:00Z'
  };

  const result = mod.mergeStats(existing, sessionAnalysis);

  assert.strictEqual(result.commands['list-issues'].count, 22, 'Should add counts');
  assert.strictEqual(result.commands['show-issue'].count, 11, 'Should add counts');
  assert.strictEqual(result.totalSessions, 6, 'Should increment session count');
});

suite.test('mergeStats: creates new command entry', () => {
  const mod = loadModule();
  const existing = { version: '1.0', totalSessions: 1, commands: {} };
  const sessionAnalysis = {
    commands: new Map([['new-command', { count: 1, errors: [], timestamps: ['2026-01-28T09:00:00Z'] }]]),
    startTime: '2026-01-28T09:00:00Z',
    endTime: '2026-01-28T09:30:00Z'
  };

  const result = mod.mergeStats(existing, sessionAnalysis);

  assert.ok(result.commands['new-command'], 'Should create new entry');
  assert.strictEqual(result.commands['new-command'].count, 1, 'Should set count');
});

// Test: generateInsights
suite.test('generateInsights: identifies unused commands', () => {
  const mod = loadModule();
  const stats = { commands: { 'list-issues': { count: 10 } } };
  const allCommands = ['list-issues', 'show-issue', 'check-ci'];

  const result = mod.generateInsights(stats, allCommands);

  assert.ok(result.unused.includes('show-issue'), 'Should identify unused');
  assert.ok(result.unused.includes('check-ci'), 'Should identify unused');
});

suite.test('generateInsights: identifies high-error commands', () => {
  const mod = loadModule();
  const stats = {
    commands: {
      'check-ci': { count: 10, errorCount: 2 }, // 20% error rate
      'list-issues': { count: 100, errorCount: 2 } // 2% error rate
    }
  };

  const result = mod.generateInsights(stats, []);

  assert.strictEqual(result.highError.length, 1, 'Should find 1 high-error command');
  assert.strictEqual(result.highError[0].name, 'check-ci', 'Should be check-ci');
  assert.ok(result.highError[0].rate > 0.05, 'Error rate should be > 5%');
});

// Run the test suite
suite.run().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
