#!/usr/bin/env node
/**
 * Custom Command Analytics - Report Generator
 * Generates human-readable usage reports from collected statistics
 *
 * Usage: node .claude/scripts/generate-command-report.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

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
 * Load user statistics
 * @param {string} username - Username
 * @param {string} projectDir - Project directory
 * @returns {object|null} Stats object or null
 */
function loadUserStats(username, projectDir) {
  const statsPath = path.join(projectDir, '.claude', 'tool-usage', 'personal', username, 'commands.json');

  try {
    if (!fs.existsSync(statsPath)) return null;
    return JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  } catch (error) {
    console.error('Failed to load statistics:', error.message);
    return null;
  }
}

/** Date format options for Japanese locale */
const DATE_FORMAT_OPTIONS = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
};

/**
 * Format date to readable string
 * @param {string} isoString - ISO timestamp
 * @returns {string} Formatted date
 */
function formatDate(isoString) {
  if (!isoString) return 'N/A';

  try {
    return new Date(isoString).toLocaleString('ja-JP', DATE_FORMAT_OPTIONS);
  } catch {
    return isoString;
  }
}

/** Milliseconds per day constant */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Calculate days since a timestamp
 * @param {string} isoString - ISO timestamp
 * @returns {number} Days since timestamp (-1 if invalid)
 */
function daysSince(isoString) {
  if (!isoString) return -1;

  try {
    return Math.floor((Date.now() - new Date(isoString).getTime()) / MS_PER_DAY);
  } catch {
    return -1;
  }
}

/**
 * Create empty metrics structure
 * @param {Array<string>} allCommands - All defined commands
 * @returns {object} Empty metrics
 */
function createEmptyMetrics(allCommands) {
  return {
    topCommands: [],
    unusedCommands: allCommands,
    highErrorCommands: [],
    rarelyUsedCommands: [],
    summary: {
      totalDefined: allCommands.length,
      totalActive: 0,
      totalUnused: allCommands.length,
      avgUsesPerSession: 0
    }
  };
}

/**
 * Transform command data to metrics format
 * @param {string} name - Command name
 * @param {object} data - Command statistics
 * @returns {object} Transformed command metrics
 */
function transformCommandData(name, data) {
  return {
    name,
    count: data.count,
    errorCount: data.errorCount,
    errorRate: data.count > 0 ? data.errorCount / data.count : 0,
    avgPerSession: data.sessionCount > 0 ? data.count / data.sessionCount : 0,
    lastUsed: data.lastUsed
  };
}

/**
 * Calculate metrics from statistics
 * @param {object} stats - Statistics object
 * @param {Array<string>} allCommands - All defined commands
 * @returns {object} Calculated metrics
 */
function calculateMetrics(stats, allCommands) {
  if (!stats?.commands) return createEmptyMetrics(allCommands);

  // Transform and sort commands by usage count
  const topCommands = Object.entries(stats.commands)
    .map(([name, data]) => transformCommandData(name, data))
    .sort((a, b) => b.count - a.count);

  const usedCommands = new Set(Object.keys(stats.commands));
  const unusedCommands = allCommands.filter(cmd => !usedCommands.has(cmd));

  // High-error commands (error rate > 5%)
  const highErrorCommands = topCommands
    .filter(cmd => cmd.errorRate > 0.05 && cmd.errorCount > 0)
    .sort((a, b) => b.errorRate - a.errorRate);

  // Rarely used commands (< 3 uses)
  const rarelyUsedCommands = topCommands
    .filter(cmd => cmd.count < 3)
    .map(cmd => ({ ...cmd, daysSinceLastUse: daysSince(cmd.lastUsed) }));

  // Summary metrics
  const totalCommandUses = topCommands.reduce((sum, cmd) => sum + cmd.count, 0);
  const avgUsesPerSession = stats.totalSessions > 0 ? totalCommandUses / stats.totalSessions : 0;

  return {
    topCommands: topCommands.slice(0, 5),
    unusedCommands,
    highErrorCommands,
    rarelyUsedCommands,
    summary: {
      totalDefined: allCommands.length,
      totalActive: usedCommands.size,
      totalUnused: unusedCommands.length,
      avgUsesPerSession: avgUsesPerSession.toFixed(1)
    }
  };
}

/** Report section separator */
const SEPARATOR = '━'.repeat(70);

/**
 * Format a single top command entry
 * @param {object} cmd - Command metrics
 * @param {number} index - Position in list
 * @returns {string} Formatted line
 */
function formatTopCommandLine(cmd, index) {
  const errorIcon = cmd.errorRate > 0.05 ? '⚠️' : '✅';
  const errorPercent = (cmd.errorRate * 100).toFixed(1);
  const errorMsg = `${errorIcon} ${errorPercent}% error rate`;

  const nameCol = cmd.name.padEnd(25);
  const countCol = `${cmd.count} uses`.padEnd(12);
  const avgCol = `(${cmd.avgPerSession.toFixed(1)}/session)`.padEnd(15);

  return `${index + 1}. ${nameCol} ${countCol} ${avgCol} ${errorMsg}`;
}

/**
 * Format high-error command section
 * @param {object} cmd - Command metrics
 * @param {object} cmdStats - Command statistics
 * @returns {Array<string>} Formatted lines
 */
function formatHighErrorCommand(cmd, cmdStats) {
  const lines = [
    `${cmd.name} (${(cmd.errorRate * 100).toFixed(1)}% error rate)`,
    `  Total uses: ${cmd.count}, Errors: ${cmd.errorCount}`
  ];

  const lastError = cmdStats?.recentErrors?.at(-1);
  if (lastError) {
    lines.push(`  Last error: ${formatDate(lastError.timestamp)}`);
    if (lastError.message) {
      const truncated = lastError.message.substring(0, 80);
      lines.push(`  Message: ${truncated}${lastError.message.length > 80 ? '...' : ''}`);
    }
  }

  lines.push('  → Consider improving error handling or adding validation');
  lines.push('');
  return lines;
}

/**
 * Format report from metrics
 * @param {object} metrics - Calculated metrics
 * @param {object} stats - Original stats object
 * @returns {string} Formatted report
 */
function formatReport(metrics, stats) {
  const lines = ['', '📊 Custom Command Analytics Report', SEPARATOR, ''];

  if (!stats) {
    lines.push('No statistics available yet. Use Claude Code to generate data.', '');
    return lines.join('\n');
  }

  // User info
  lines.push(
    `👤 User: ${stats.username}`,
    `📅 Last updated: ${formatDate(stats.lastUpdated)}`,
    `📈 Sessions analyzed: ${stats.totalSessions}`,
    '', SEPARATOR, ''
  );

  // Top 5 commands
  if (metrics.topCommands.length > 0) {
    lines.push('🔥 TOP 5 MOST USED COMMANDS', '');
    metrics.topCommands.forEach((cmd, index) => {
      lines.push(formatTopCommandLine(cmd, index));
    });
    lines.push('', SEPARATOR, '');
  }

  // High-error commands
  if (metrics.highErrorCommands.length > 0) {
    lines.push('⚠️  COMMANDS NEEDING ATTENTION', '');
    metrics.highErrorCommands.forEach(cmd => {
      lines.push(...formatHighErrorCommand(cmd, stats.commands[cmd.name]));
    });
    lines.push(SEPARATOR, '');
  }

  // Rarely used or unused commands
  if (metrics.rarelyUsedCommands.length > 0 || metrics.unusedCommands.length > 0) {
    lines.push('💤 RARELY USED OR UNUSED COMMANDS', '');

    if (metrics.rarelyUsedCommands.length > 0) {
      lines.push('Rarely used (< 3 uses):');
      metrics.rarelyUsedCommands.forEach(cmd => {
        const days = cmd.daysSinceLastUse >= 0 ? `${cmd.daysSinceLastUse} days ago` : 'never';
        lines.push(`  • ${cmd.name.padEnd(25)} ${cmd.count} uses, last: ${days}`);
      });
      lines.push('');
    }

    if (metrics.unusedCommands.length > 0) {
      lines.push('Never used:');
      metrics.unusedCommands.forEach(cmd => lines.push(`  • ${cmd}`));
      lines.push('');
    }

    lines.push('💡 Suggestion: Consider removing unused commands to reduce clutter', '', SEPARATOR, '');
  }

  // Overall statistics
  lines.push(
    '📊 OVERALL STATISTICS', '',
    `Total commands defined:     ${metrics.summary.totalDefined}`,
    `Active commands (>0 uses):  ${metrics.summary.totalActive}`,
    `Unused commands:            ${metrics.summary.totalUnused}`,
    `Average uses per session:   ${metrics.summary.avgUsesPerSession} commands`,
    ''
  );

  return lines.join('\n');
}

/**
 * Get list of custom command definitions
 * @param {string} projectDir - Project directory
 * @returns {Array<string>} Command names
 */
function getCustomCommandDefinitions(projectDir) {
  const commandsDir = path.join(projectDir, '.claude', 'commands');

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
 * Main function
 */
function main() {
  try {
    const username = getUsername();
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

    const stats = loadUserStats(username, projectDir);
    const allCommands = getCustomCommandDefinitions(projectDir);
    const metrics = calculateMetrics(stats, allCommands);

    console.log(formatReport(metrics, stats));
  } catch (error) {
    console.error('[Analytics] Error generating report:', error.message);
    process.exit(0);
  }
}

// Export for testing
if (require.main !== module) {
  module.exports = {
    loadUserStats,
    calculateMetrics,
    formatReport,
    getUsername,
    formatDate,
    daysSince
  };
} else {
  main();
}
