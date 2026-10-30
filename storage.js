/**
 * Storage Service - SynapseAI
 * Manages local persistence for Meetings, Action Items, Knowledge Base, and AI Settings
 */

const STORAGE_KEYS = {
  MEETINGS: 'synapse_meetings_v1',
  TASKS: 'synapse_tasks_v1',
  KB_DOCS: 'synapse_kb_docs_v1',
  LOGS: 'synapse_app_logs_v1',
  AI_CONFIG: 'synapse_ai_config_v1'
};

const StorageService = {
  getMeetings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEETINGS);
      return data ? JSON.parse(data) : this.getSeedMeetings();
    } catch (e) {
      console.error('Error loading meetings', e);
      return this.getSeedMeetings();
    }
  },

  saveMeetings(meetings) {
    try {
      localStorage.setItem(STORAGE_KEYS.MEETINGS, JSON.stringify(meetings));
    } catch (e) {
      console.error('Error saving meetings', e);
    }
  },

  getTasks() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      return data ? JSON.parse(data) : this.getSeedTasks();
    } catch (e) {
      console.error('Error loading tasks', e);
      return this.getSeedTasks();
    }
  },

  saveTasks(tasks) {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.error('Error saving tasks', e);
    }
  },

  getKBDocs() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.KB_DOCS);
      return data ? JSON.parse(data) : this.getSeedKBDocs();
    } catch (e) {
      console.error('Error loading KB docs', e);
      return this.getSeedKBDocs();
    }
  },

  saveKBDocs(docs) {
    try {
      localStorage.setItem(STORAGE_KEYS.KB_DOCS, JSON.stringify(docs));
    } catch (e) {
      console.error('Error saving KB docs', e);
    }
  },

  getLogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOGS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveLogs(logs) {
    try {
      // Keep up to 500 recent logs to prevent browser overflow
      const trimmed = logs.slice(-500);
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Error saving logs', e);
    }
  },

  getAIConfig() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AI_CONFIG);
      return data ? JSON.parse(data) : {
        provider: 'mock', // 'mock', 'gemini', 'openai'
        apiKey: '',
        model: 'gemini-1.5-flash'
      };
    } catch (e) {
      return { provider: 'mock', apiKey: '', model: 'gemini-1.5-flash' };
    }
  },

  saveAIConfig(config) {
    try {
      localStorage.setItem(STORAGE_KEYS.AI_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Error saving AI config', e);
    }
  },

  // Initial Seed Data for immediate testing & assessment evaluation
  getSeedMeetings() {
    return [
      {
        id: 'mtg-101',
        title: 'Core Engine Architecture & Redis Cache Transition',
        type: 'meeting',
        date: '2026-10-24T14:30',
        participants: ['Alex Chen', 'Sarah Miller', 'David Kim'],
        agenda: 'Review Redis latency spikes, plan failover redundancy, and initiate cluster migration.',
        rawNotes: 'Redis latency spike observed during peak hours. Sarah investigated node 2 memory exhaustion. Need to migrate to Redis 7.2 cluster and implement rate-limiting proxy. Alex will review network security groups. David to update SLA targets for clients.',
        decisions: [
          'Approve migration of Redis cluster to version 7.2 with HA replicas.',
          'Enforce strict token-bucket rate limiting at API gateway layer.',
          'Schedule downtime window for next Sunday 02:00 UTC.'
        ],
        carriedTaskIds: [],
        createdAt: '2026-10-24T14:30:00.000Z'
      },
      {
        id: 'mtg-102',
        title: 'Sarah Miller Medical Leave Handover & Sprint 24 Tasks',
        type: 'handover',
        date: '2026-10-28T10:00',
        participants: ['Sarah Miller', 'Alex Chen', 'Priya Sharma'],
        agenda: 'Temporary handover of database maintenance, pending PRs, and emergency on-call rotation.',
        rawNotes: 'Sarah going on medical leave from Oct 31 to Nov 14. Handing over DB migrations and on-call rotation. Alex takes over Redis migration and cluster failover drill. Priya covers on-call primary rotation. Check runbook in Knowledge Base before touching shard keys.',
        decisions: [
          'Alex Chen designated primary interim owner for Database Migration Track.',
          'Priya Sharma added to pagerduty Tier 1 rotation until Nov 14.',
          'All urgent production escalations to be routed to #dev-infra-hotline.'
        ],
        carriedTaskIds: ['task-1'],
        createdAt: '2026-10-28T10:00:00.000Z'
      }
    ];
  },

  getSeedTasks() {
    return [
      {
        id: 'task-1',
        title: 'Migrate Redis cluster to HA 7.2 with failover drill',
        owner: 'Alex Chen',
        dueDate: '2026-11-04',
        status: 'In Progress',
        priority: 'High',
        sessionId: 'mtg-101',
        outcome: '',
        carriedForwardCount: 1,
        history: [
          { date: '2026-10-24', event: 'Created in Core Engine Architecture meeting', owner: 'Sarah Miller' },
          { date: '2026-10-28', event: 'Reassigned to Alex Chen during Sarah Leave Handover', owner: 'Alex Chen' }
        ]
      },
      {
        id: 'task-2',
        title: 'Draft API Gateway rate limiting proxy specification',
        owner: 'David Kim',
        dueDate: '2026-11-02',
        status: 'Open',
        priority: 'Medium',
        sessionId: 'mtg-101',
        outcome: '',
        carriedForwardCount: 0,
        history: [
          { date: '2026-10-24', event: 'Created in Core Engine Architecture meeting', owner: 'David Kim' }
        ]
      },
      {
        id: 'task-3',
        title: 'Update PagerDuty escalation policies for interim leave coverage',
        owner: 'Priya Sharma',
        dueDate: '2026-10-30',
        status: 'Closed',
        priority: 'High',
        sessionId: 'mtg-102',
        outcome: 'Completed on-call schedule adjustments and verified test page delivery.',
        carriedForwardCount: 0,
        history: [
          { date: '2026-10-28', event: 'Created in Sarah Miller Handover', owner: 'Priya Sharma' },
          { date: '2026-10-30', event: 'Closed with resolution outcome recorded', owner: 'Priya Sharma' }
        ]
      },
      {
        id: 'task-4',
        title: 'Audit orphan IAM access keys and service account roles',
        owner: 'Alex Chen',
        dueDate: '2026-11-06',
        status: 'Open',
        priority: 'Medium',
        sessionId: 'mtg-102',
        outcome: '',
        carriedForwardCount: 0,
        history: [
          { date: '2026-10-28', event: 'Created in Sarah Miller Handover', owner: 'Alex Chen' }
        ]
      }
    ];
  },

  getSeedKBDocs() {
    return [
      {
        id: 'kb-1',
        title: 'Database Cluster Sharding & Failover Runbook',
        category: 'Operations',
        tags: ['redis', 'database', 'failover', 'infra'],
        content: `### High-Availability Redis Runbook
- **Cluster Topology**: 3 Master shards with 1 replica each in Availability Zones A, B, and C.
- **Failover Procedure**: Execute \`redis-cli cluster failover takeover\` on the standby node during maintenance.
- **Critical Thresholds**: Memory usage > 80% triggers automated alerting to #dev-infra.
- **Responsible Teams**: Infrastructure, Backend Platform.`
      },
      {
        id: 'kb-2',
        title: 'Team On-Call Handover & Escalation Protocol (SOP)',
        category: 'Handovers',
        tags: ['sop', 'oncall', 'leave', 'pagerduty'],
        content: `### Standard Operating Procedure: Team Leave & Handovers
1. **Pre-Leave Briefing**: Schedule a handover session at least 3 business days prior to planned leave.
2. **Transfer of Open Tasks**: Carry forward active action items and assign a verified proxy owner.
3. **Escalations**: If an incident occurs during leave, secondary responder assumes primary responsibility without delay.`
      },
      {
        id: 'kb-3',
        title: 'API Gateway Rate Limiting & Quota Architecture',
        category: 'Architecture',
        tags: ['api', 'security', 'rate-limit', 'proxy'],
        content: `### Rate Limiting Architectural Guidelines
- Uses a distributed Token Bucket algorithm backed by Redis.
- Default limit: 500 requests / minute per verified client API key.
- 429 Too Many Requests response headers include \`Retry-After\` and \`X-RateLimit-Reset\`.`
      }
    ];
  }
};
