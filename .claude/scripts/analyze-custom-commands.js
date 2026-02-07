#!/usr/bin/env node
/**
 * Custom Command Analytics - Transcript Analyzer
 * Runs as SessionEnd hook to collect command usage statistics
 *
 * Input: transcript.jsonl via stdin (from SessionEnd hook)
 * Output: Updates .claude/tool-usage/personal/{username}/commands.json
 *
 * Error handling: ALWAYS exits 0 (never blocks Claude Code)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Parse JSONL transcript into array of entries
 * @param {string} jsonlString - JSONL content
 * @returns {Array<object>} Parsed entries (skips invalid lines)
 */
function parseTranscript(jsonlString) {
  return jsonlString
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(entry => entry !== null);
}

/**
 * Extract custom command name from Bash tool_input
 * @param {object} toolInput - tool_input from transcript
 * @returns {string|null} Command name or null if not a custom command
 */
function extractCommandName(toolInput) {
  const cmd = toolInput?.command;
  if (!cmd) return null;

  // Pattern 1: Slash command (/command-name)
  const slashMatch = cmd.match(/^\/([a-zA-Z0-9_-]+)/);
  if (slashMatch) return slashMatch[1];

  // Pattern 2: Script in .claude/commands/ (node .claude/commands/foo.js)
  const commandsMatch = cmd.match(/\.claude\/commands\/([^/\s]+)\.(js|sh|py|md)/);
  if (commandsMatch) return commandsMatch[1];

  // Pattern 3: Script in .claude/scripts/custom-*.js
  const customMatch = cmd.match(/\.claude\/scripts\/custom-([^/\s]+)\.js/);
  if (customMatch) return `custom-${customMatch[1]}`;

  return null;
}

/**
 * Get list of custom command definitions from .claude/commands/
 * @param {string} baseDir - Project base directory
 * @returns {Array<string>} List of command names
 */
function getCustomCommandDefinitions(baseDir) {
  const commandsDir = path.join(baseDir, '.claude', 'commands');

  try {
    if (!fs.existsSync(commandsDir)) return [];

    return fs.readdirSync(commandsDir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace(/\.md$/, ''));
  } catch {
    return [];
  }
}

/**
 * Initialize empty command stats entry
 */
function createCommandStats() {
  return { count: 0, errors: [], timestamps: [] };
}

/**
 * Analyze transcript entries and extract command usage
 * @param {Array<object>} entries - Parsed transcript entries
 * @param {Array<string>} customCommands - List of valid custom commands
 * @returns {object} Session analysis { commands: Map, startTime, endTime }
 */
function analyzeCommands(entries, customCommands) {
  const commandMap = new Map();
  const commandSet = new Set(customCommands);
  let startTime = null;
  let endTime = null;
  let previousToolUse = null;

  for (const entry of entries) {
    // Track session timestamps
    if (entry.timestamp) {
      startTime = startTime || entry.timestamp;
      endTime = entry.timestamp;
    }

    // Process tool_use entries for Bash commands
    if (entry.type === 'tool_use' && entry.tool_name === 'Bash') {
      const cmdName = extractCommandName(entry.tool_input);

      if (cmdName && commandSet.has(cmdName)) {
        if (!commandMap.has(cmdName)) {
          commandMap.set(cmdName, createCommandStats());
        }

        const stats = commandMap.get(cmdName);
        stats.count++;
        stats.timestamps.push(entry.timestamp);
        previousToolUse = { cmdName, timestamp: entry.timestamp };
      } else {
        previousToolUse = null;
      }
      continue;
    }

    // Process tool_result entries to detect errors
    if (entry.type === 'tool_result' && previousToolUse && entry.error) {
      const stats = commandMap.get(previousToolUse.cmdName);
      if (stats) {
        stats.errors.push({
          timestamp: previousToolUse.timestamp,
          message: String(entry.error).substring(0, 200)
        });
      }
    }

    if (entry.type === 'tool_result') {
      previousToolUse = null;
    }
  }

  return { commands: commandMap, startTime, endTime };
}

/**
 * Create default stats structure
 */
function createDefaultStats() {
  return {
    version: '1.0',
    username: getUsername(),
    lastUpdated: new Date().toISOString(),
    totalSessions: 0,
    commands: {}
  };
}

/**
 * Create default command stats entry for merged stats
 */
function createMergedCommandStats() {
  return {
    count: 0,
    errorCount: 0,
    lastUsed: null,
    recentErrors: [],
    sessionCount: 0
  };
}

/**
 * Merge session analysis into existing stats
 * @param {object} existingStats - Current stats object
 * @param {object} sessionAnalysis - Analysis from current session
 * @returns {object} Updated stats
 */
function mergeStats(existingStats, sessionAnalysis) {
  const stats = existingStats || createDefaultStats();
  stats.totalSessions = (stats.totalSessions || 0) + 1;
  stats.lastUpdated = new Date().toISOString();

  for (const [cmdName, sessionData] of sessionAnalysis.commands) {
    if (!stats.commands[cmdName]) {
      stats.commands[cmdName] = createMergedCommandStats();
    }

    const cmdStats = stats.commands[cmdName];
    cmdStats.count += sessionData.count;
    cmdStats.errorCount += sessionData.errors.length;
    cmdStats.sessionCount++;

    // Update lastUsed to most recent timestamp
    const lastTimestamp = sessionData.timestamps?.at(-1);
    if (lastTimestamp && (!cmdStats.lastUsed || lastTimestamp > cmdStats.lastUsed)) {
      cmdStats.lastUsed = lastTimestamp;
    }

    // Merge recent errors (keep last 5)
    if (sessionData.errors?.length > 0) {
      cmdStats.recentErrors = [...cmdStats.recentErrors, ...sessionData.errors].slice(-5);
    }
  }

  return stats;
}

/**
 * Generate insights from statistics
 * @param {object} stats - Statistics object
 * @param {Array<string>} allCommands - All defined commands
 * @returns {object} Insights { unused, highError, summary }
 */
function generateInsights(stats, allCommands) {
  const commands = stats.commands || {};
  const usedCommands = new Set(Object.keys(commands));
  const unused = allCommands.filter(cmd => !usedCommands.has(cmd));

  // Find high-error commands (>5% error rate)
  const highError = Object.entries(commands)
    .map(([name, cmdStats]) => ({
      name,
      rate: cmdStats.count > 0 ? cmdStats.errorCount / cmdStats.count : 0
    }))
    .filter(cmd => cmd.rate > 0.05);

  // Calculate summary metrics
  const totalCommandUses = Object.values(commands).reduce((sum, cmd) => sum + cmd.count, 0);
  const avgCommandsPerSession = stats.totalSessions > 0 ? totalCommandUses / stats.totalSessions : 0;

  return {
    unused,
    highError,
    summary: {
      totalCommandsUsed: usedCommands.size,
      totalCommandsDefined: allCommands.length,
      avgCommandsPerSession
    }
  };
}

/**
 * Get current username from environment or system
 * @returns {string} Username
 */
function getUsername() {
  try {
    return process.env.CLAUDE_CODE_USER || process.env.USER || os.userInfo().username || 'default';
  } catch {
    return 'default';
  }
}

/**
 * Load statistics from file
 * @param {string} filePath - Path to stats file
 * @returns {object|null} Stats object or null if not exists
 */
function loadStats(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Ensure directory exists, creating it if necessary
 * @param {string} dirPath - Directory path
 */
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Save statistics to file
 * @param {string} filePath - Path to stats file
 * @param {object} stats - Stats object
 *
 * NOTE: Known race condition when multiple sessions end simultaneously.
 * Low-risk in practice. Future: Add file locking or rebuild from sessions.jsonl.
 */
function saveStats(filePath, stats) {
  try {
    ensureDirectory(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(stats, null, 2), 'utf8');
  } catch (error) {
    console.error('[Analytics] Failed to save stats:', error.message);
  }
}

/**
 * Append session to JSONL file
 * @param {string} filePath - Path to sessions.jsonl
 * @param {object} sessionData - Session data to append
 */
function appendSession(filePath, sessionData) {
  try {
    ensureDirectory(path.dirname(filePath));
    fs.appendFileSync(filePath, JSON.stringify(sessionData) + '\n', 'utf8');
  } catch (error) {
    console.error('[Analytics] Failed to append session:', error.message);
  }
}

/**
 * Clean old sessions from JSONL file
 * @param {string} filePath - Path to sessions.jsonl
 * @param {number} retentionDays - Number of days to retain
 * @returns {object} { removedCount: number }
 */
function cleanOldSessions(filePath, retentionDays = 90) {
  try {
    if (!fs.existsSync(filePath)) return { removedCount: 0 };

    const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(line => line.trim());
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    const recentSessions = lines.filter(line => {
      try {
        return new Date(JSON.parse(line).start).getTime() > cutoffTime;
      } catch {
        return false;
      }
    });

    const removedCount = lines.length - recentSessions.length;
    if (removedCount > 0) {
      fs.writeFileSync(filePath, recentSessions.join('\n') + '\n', 'utf8');
    }

    return { removedCount };
  } catch (error) {
    console.error('[Analytics] Failed to clean old sessions:', error.message);
    return { removedCount: 0 };
  }
}

/**
 * Process transcript and update statistics
 * @param {string} transcriptContent - Raw transcript JSONL content
 */
function processTranscript(transcriptContent) {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const customCommands = getCustomCommandDefinitions(projectDir);

  if (customCommands.length === 0) return;

  const entries = parseTranscript(transcriptContent);
  if (entries.length === 0) return;

  const sessionAnalysis = analyzeCommands(entries, customCommands);
  if (sessionAnalysis.commands.size === 0) return;

  // Setup file paths
  const username = getUsername();
  const userDir = path.join(projectDir, '.claude', 'tool-usage', 'personal', username);
  const statsPath = path.join(userDir, 'commands.json');
  const sessionsPath = path.join(userDir, 'sessions.jsonl');

  // Update and save stats
  const updatedStats = mergeStats(loadStats(statsPath), sessionAnalysis);
  updatedStats.insights = generateInsights(updatedStats, customCommands);
  saveStats(statsPath, updatedStats);

  // Append session record
  const sessionData = {
    sessionId: process.env.CLAUDE_SESSION_ID || `session-${Date.now()}`,
    start: sessionAnalysis.startTime,
    end: sessionAnalysis.endTime,
    commands: Array.from(sessionAnalysis.commands.keys()),
    errorCommands: Array.from(sessionAnalysis.commands.entries())
      .filter(([, data]) => data.errors.length > 0)
      .map(([name]) => name)
  };
  appendSession(sessionsPath, sessionData);
  cleanOldSessions(sessionsPath, 90);

  console.error(`[Analytics] Recorded ${sessionAnalysis.commands.size} command(s) for user ${username}`);
}

/**
 * Main function - orchestrates the analytics pipeline
 */
function main() {
  const chunks = [];

  process.stdin.on('data', chunk => chunks.push(chunk));

  process.stdin.on('end', () => {
    try {
      processTranscript(chunks.join(''));
    } catch (error) {
      console.error('[Analytics] Error processing transcript:', error.message);
    } finally {
      process.exit(0);
    }
  });

  process.stdin.on('error', error => {
    console.error('[Analytics] Fatal error:', error.message);
    process.exit(0);
  });
}

// Export functions for testing
if (require.main !== module) {
  module.exports = {
    parseTranscript,
    extractCommandName,
    getCustomCommandDefinitions,
    analyzeCommands,
    mergeStats,
    generateInsights,
    getUsername,
    loadStats,
    saveStats,
    appendSession,
    cleanOldSessions
  };
} else {
  // Run main if executed directly
  main();
}
