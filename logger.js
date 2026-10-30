/**
 * Structured Logger - SynapseAI
 * Meets DigiPlus Technical Assessment Logging Requirements:
 * - Proper log levels (INFO, WARN, ERROR, AI_CALL)
 * - Request / Correlation ID per operation
 * - Key events (created, reassigned, item closed)
 * - AI calls with latency and outcome
 * - Errors with full context
 * - Output written to local file download and browser state
 * - Automatic redaction of sensitive credentials (no secrets in logs)
 */

const AppLogger = {
  // Generate random correlation ID (e.g., req-9a8f2d)
  generateCorrelationId() {
    return 'req-' + Math.random().toString(36).substring(2, 9);
  },

  // Sanitize payload to strip API keys, secrets, or passwords
  sanitize(payload) {
    if (!payload) return payload;
    try {
      const copy = JSON.parse(JSON.stringify(payload));
      const redact = (obj) => {
        for (let key in obj) {
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            redact(obj[key]);
          } else if (typeof key === 'string') {
            const lower = key.toLowerCase();
            if (lower.includes('key') || lower.includes('secret') || lower.includes('token') || lower.includes('password') || lower.includes('auth')) {
              obj[key] = '[REDACTED_SECRET]';
            }
          }
        }
      };
      if (typeof copy === 'object') {
        redact(copy);
      }
      return copy;
    } catch (e) {
      return '[Unserializable Payload]';
    }
  },

  log(level, message, metadata = {}, correlationId = null) {
    const cid = correlationId || this.generateCorrelationId();
    const sanitizedMeta = this.sanitize(metadata);
    
    const entry = {
      timestamp: new Date().toISOString(),
      correlationId: cid,
      level: level.toUpperCase(),
      message: message,
      metadata: sanitizedMeta
    };

    // Save to storage
    const currentLogs = StorageService.getLogs();
    currentLogs.push(entry);
    StorageService.saveLogs(currentLogs);

    // Also output to DevTools console in a structured manner
    const consoleColor = {
      INFO: 'color: #38bdf8',
      WARN: 'color: #fbbf24',
      ERROR: 'color: #f87171; font-weight: bold',
      AI_CALL: 'color: #c084fc; font-weight: bold'
    }[entry.level] || 'color: #fff';

    console.log(`%c[${entry.timestamp}] [${entry.level}] [${entry.correlationId}] ${entry.message}`, consoleColor, sanitizedMeta);

    // Trigger UI update if listener registered
    if (window.onNewLogEntry) {
      window.onNewLogEntry(entry);
    }

    return entry;
  },

  info(message, metadata = {}, correlationId = null) {
    return this.log('INFO', message, metadata, correlationId);
  },

  warn(message, metadata = {}, correlationId = null) {
    return this.log('WARN', message, metadata, correlationId);
  },

  error(message, errorOrContext = {}, correlationId = null) {
    let meta = errorOrContext;
    if (errorOrContext instanceof Error) {
      meta = {
        name: errorOrContext.name,
        message: errorOrContext.message,
        stack: errorOrContext.stack
      };
    }
    return this.log('ERROR', message, meta, correlationId);
  },

  aiCall(endpoint, latencyMs, status, details = {}, correlationId = null) {
    return this.log('AI_CALL', `AI Model Call (${endpoint}) -> Status: ${status} in ${latencyMs}ms`, {
      endpoint,
      latencyMs,
      status,
      ...details
    }, correlationId);
  },

  // Export structured logs as downloadable JSON file
  exportLogsToFile() {
    const logs = StorageService.getLogs();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `synapse_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    this.info('Exported structured logs to file', { totalRecords: logs.length });
  },

  clearLogs() {
    StorageService.saveLogs([]);
    this.info('Log history cleared by user', {});
    if (window.renderLogsTerminal) {
      window.renderLogsTerminal();
    }
  }
};
