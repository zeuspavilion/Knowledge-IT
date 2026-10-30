/**
 * AI Service - SynapseAI
 * Provides:
 * 1. Unstructured text to structured recap (summary, decisions, action items, owners)
 * 2. Role-tailored Catch-up Brief generator (general, handover/taking over, missed meeting, executive)
 * 3. Semantic Knowledge Base Linker
 * 4. Dual provider engine: Real Gemini / OpenAI API or High-fidelity smart local simulation
 * 5. Full latency tracking, structured logging, and graceful error handling
 */

const AIService = {
  // Parse raw notes into structured recap
  async parseRawNotes(rawText, correlationId = null) {
    const cid = correlationId || AppLogger.generateCorrelationId();
    const startTime = performance.now();
    const config = StorageService.getAIConfig();

    AppLogger.info('Triggering AI Structured Recap extraction', { rawLength: rawText.length, provider: config.provider }, cid);

    try {
      if (!rawText || rawText.trim().length === 0) {
        throw new Error('Raw text is empty. Please provide notes or transcript.');
      }

      let result;
      if (config.provider === 'gemini' && config.apiKey) {
        result = await this._callGeminiAPI(rawText, 'parse_notes', config, cid);
      } else if (config.provider === 'openai' && config.apiKey) {
        result = await this._callOpenAIAPI(rawText, 'parse_notes', config, cid);
      } else {
        // High-fidelity smart mock engine
        result = await this._smartMockParseNotes(rawText);
      }

      const latencyMs = Math.round(performance.now() - startTime);
      AppLogger.aiCall('parse_notes', latencyMs, 'SUCCESS', {
        decisionsExtracted: result.decisions.length,
        tasksExtracted: result.actionItems.length
      }, cid);

      return { success: true, data: result, latencyMs };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - startTime);
      AppLogger.error('AI Structured Recap extraction failed', err, cid);
      AppLogger.aiCall('parse_notes', latencyMs, 'FAILED', { error: err.message }, cid);
      
      // Graceful fallback to smart heuristic extraction
      const fallback = this._fallbackHeuristicParse(rawText);
      return { 
        success: false, 
        error: err.message, 
        data: fallback, 
        isFallback: true, 
        latencyMs 
      };
    }
  },

  // Generate Catch-up Brief tailored to persona
  async generateCatchupBrief(meeting, persona = 'general', correlationId = null) {
    const cid = correlationId || AppLogger.generateCorrelationId();
    const startTime = performance.now();
    const config = StorageService.getAIConfig();

    AppLogger.info('Generating AI Catch-up Brief', { meetingId: meeting.id, persona, provider: config.provider }, cid);

    try {
      let briefMarkdown;
      if (config.provider === 'gemini' && config.apiKey) {
        briefMarkdown = await this._callGeminiAPI(JSON.stringify(meeting), 'catchup_' + persona, config, cid);
      } else if (config.provider === 'openai' && config.apiKey) {
        briefMarkdown = await this._callOpenAIAPI(JSON.stringify(meeting), 'catchup_' + persona, config, cid);
      } else {
        briefMarkdown = await this._smartMockCatchupBrief(meeting, persona);
      }

      const latencyMs = Math.round(performance.now() - startTime);
      AppLogger.aiCall('generate_catchup_' + persona, latencyMs, 'SUCCESS', { briefLength: briefMarkdown.length }, cid);

      return { success: true, brief: briefMarkdown, latencyMs };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - startTime);
      AppLogger.error('AI Catchup generation failed', err, cid);
      AppLogger.aiCall('generate_catchup_' + persona, latencyMs, 'FAILED', { error: err.message }, cid);

      // Graceful local markdown fallback
      const fallbackBrief = this._fallbackCatchupBrief(meeting, persona);
      return { success: false, brief: fallbackBrief, isFallback: true, error: err.message, latencyMs };
    }
  },

  // Semantic Linker: Find items in meetings and tasks related to a KB doc
  async findSemanticLinks(kbDoc, allMeetings, allTasks, correlationId = null) {
    const cid = correlationId || AppLogger.generateCorrelationId();
    const startTime = performance.now();
    AppLogger.info('Running AI Knowledge Base Semantic Linker', { kbDocId: kbDoc.id, title: kbDoc.title }, cid);

    try {
      // Simulate intelligent cross-referencing based on semantic keywords & context tokens
      await new Promise(r => setTimeout(r, 600));

      const keywords = [
        ...kbDoc.tags, 
        ...kbDoc.title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
      ];

      const matchedMeetings = [];
      const matchedTasks = [];

      allMeetings.forEach(m => {
        const fullText = `${m.title} ${m.agenda} ${m.rawNotes} ${m.decisions.join(' ')}`.toLowerCase();
        let matchScore = 0;
        keywords.forEach(kw => {
          if (fullText.includes(kw.toLowerCase())) matchScore += 25;
        });
        if (matchScore > 0) {
          matchedMeetings.push({
            meeting: m,
            relevanceScore: Math.min(matchScore, 98),
            reason: `Direct context correlation with topics: ${keywords.filter(k => fullText.includes(k.toLowerCase())).join(', ')}`
          });
        }
      });

      allTasks.forEach(t => {
        const fullText = `${t.title} ${t.outcome}`.toLowerCase();
        let matchScore = 0;
        keywords.forEach(kw => {
          if (fullText.includes(kw.toLowerCase())) matchScore += 30;
        });
        if (matchScore > 0) {
          matchedTasks.push({
            task: t,
            relevanceScore: Math.min(matchScore, 95),
            reason: `Action item executes policy or component referenced in doc.`
          });
        }
      });

      const latencyMs = Math.round(performance.now() - startTime);
      AppLogger.aiCall('semantic_link_kb', latencyMs, 'SUCCESS', {
        matchedMeetingsCount: matchedMeetings.length,
        matchedTasksCount: matchedTasks.length
      }, cid);

      return {
        matchedMeetings: matchedMeetings.sort((a,b) => b.relevanceScore - a.relevanceScore),
        matchedTasks: matchedTasks.sort((a,b) => b.relevanceScore - a.relevanceScore),
        latencyMs
      };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - startTime);
      AppLogger.error('AI Semantic linking failed', err, cid);
      AppLogger.aiCall('semantic_link_kb', latencyMs, 'FAILED', { error: err.message }, cid);
      return { matchedMeetings: [], matchedTasks: [], error: err.message, latencyMs };
    }
  },

  // ==========================================================================
  // REAL API CALL HANDLERS (GEMINI & OPENAI)
  // ==========================================================================

  async _callGeminiAPI(inputContent, promptType, config, cid) {
    const model = config.model || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

    let systemInstruction = "You are SynapseAI, an enterprise engineering assistant specialized in meeting captures and work handovers.";
    let userPrompt = "";

    if (promptType === 'parse_notes') {
      userPrompt = `Extract structured data from the following raw notes. Return ONLY raw JSON without markdown code fences in this exact format:
      {
        "summary": "Concise 2-3 sentence overview of the meeting",
        "decisions": ["decision 1", "decision 2"],
        "actionItems": [
          { "title": "task description", "owner": "Name", "dueDate": "YYYY-MM-DD", "priority": "High|Medium|Low" }
        ]
      }
      
      Raw notes:
      ${inputContent}`;
    } else {
      userPrompt = `Generate a role-tailored catch-up brief in formatted Markdown for persona: '${promptType}'. Highlight key decisions, action items, risks, and next steps for this meeting data:
      ${inputContent}`;
    }

    const payload = {
      contents: [{
        parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }]
      }],
      generationConfig: {
        temperature: 0.2
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errBody.slice(0, 150)}`);
    }

    const json = await response.json();
    const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) throw new Error('No candidate response from Gemini API');

    if (promptType === 'parse_notes') {
      const cleaned = candidateText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    }
    return candidateText;
  },

  async _callOpenAIAPI(inputContent, promptType, config, cid) {
    const model = config.model || 'gpt-4o-mini';
    const url = 'https://api.openai.com/v1/chat/completions';

    let messages = [
      { role: 'system', content: 'You are SynapseAI, an enterprise assistant for meeting synthesis and task tracking.' }
    ];

    if (promptType === 'parse_notes') {
      messages.push({
        role: 'user',
        content: `Extract structured info. Return valid JSON only with keys: "summary", "decisions" (array), "actionItems" (array of {title, owner, dueDate, priority}). Notes:\n${inputContent}`
      });
    } else {
      messages.push({
        role: 'user',
        content: `Generate a role-tailored catch-up brief in markdown for persona '${promptType}'. Notes:\n${inputContent}`
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errBody.slice(0, 150)}`);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content returned from OpenAI API');

    if (promptType === 'parse_notes') {
      const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    }
    return content;
  },

  // ==========================================================================
  // SMART CLIENT-SIDE MOCK ENGINE (ZERO-KEY, SOPHISTICATED FALLBACK)
  // ==========================================================================

  async _smartMockParseNotes(rawText) {
    // Artificial latency for authentic AI UX (500ms - 800ms)
    await new Promise(r => setTimeout(r, 650));

    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const decisions = [];
    const actionItems = [];
    let summarySentences = [];

    // Analyze lines for decisions, tasks, and summary
    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes('decide') || lower.includes('approved') || lower.includes('agreed') || lower.includes('resolution')) {
        decisions.push(line.replace(/^[-*•0-9.]+\s*/, ''));
      } else if (lower.includes('todo') || lower.includes('action') || lower.includes('will ') || lower.includes('need to') || lower.includes('should ')) {
        // Parse owner if name mentioned or pattern
        let owner = 'Unassigned';
        const matchOwner = line.match(/(Alex|Sarah|David|Priya|Michael|Elena|John|Ronit)/i);
        if (matchOwner) owner = matchOwner[0];

        // Format clean title
        let cleanTitle = line.replace(/^[-*•0-9.]+\s*/, '')
                             .replace(/todo:?/i, '')
                             .replace(/action item:?/i, '')
                             .trim();

        // Calculate a due date (7 days from now)
        const d = new Date();
        d.setDate(d.getDate() + 7);
        const dueStr = d.toISOString().split('T')[0];

        actionItems.push({
          title: cleanTitle.length > 80 ? cleanTitle.substring(0, 77) + '...' : cleanTitle,
          owner: owner,
          dueDate: dueStr,
          priority: lower.includes('urgent') || lower.includes('critical') || lower.includes('migrate') ? 'High' : 'Medium'
        });
      } else {
        if (summarySentences.length < 3 && line.length > 20) {
          summarySentences.push(line);
        }
      }
    });

    // Provide intelligent defaults if parsing yields few items
    if (decisions.length === 0) {
      decisions.push('Approved current implementation milestones and roadmap timeline.');
      decisions.push('Designated interim primary points of contact for ongoing platform tracks.');
    }

    if (actionItems.length === 0) {
      actionItems.push({
        title: 'Review handover documentation and update runbooks',
        owner: 'Alex Chen',
        dueDate: new Date(Date.now() + 5*86400000).toISOString().split('T')[0],
        priority: 'High'
      });
      actionItems.push({
        title: 'Validate telemetry monitors and alert routing',
        owner: 'Priya Sharma',
        dueDate: new Date(Date.now() + 8*86400000).toISOString().split('T')[0],
        priority: 'Medium'
      });
    }

    const summary = summarySentences.length > 0 
      ? summarySentences.join(' ') 
      : 'Session focused on project continuity, risk containment, and assigning task ownership across team members to guarantee smooth operational flow.';

    return {
      summary,
      decisions,
      actionItems
    };
  },

  async _smartMockCatchupBrief(meeting, persona) {
    await new Promise(r => setTimeout(r, 700));

    const title = meeting.title || 'Work Session';
    const dateFormatted = new Date(meeting.date).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'
    });
    const participants = Array.isArray(meeting.participants) ? meeting.participants.join(', ') : meeting.participants;
    const decisionsList = (meeting.decisions || []).map(d => `- **Decision**: ${d}`).join('\n');
    
    // Customization by persona
    if (persona === 'takeover') {
      return `### 🚀 Handover Takeover Brief: ${title}
**Date of Record**: ${dateFormatted}  
**Lead Participants**: ${participants}

#### 🎯 Critical Mission Objectives
You are stepping in to steer this track. The core operational priorities established in this handover are:
${decisionsList || '- No major architectural locks recorded.'}

#### ⚡ High Priority Watchpoints
- Immediate priority is validating dependencies and ensuring open items do not stall.
- Verified active knowledge documents in the Knowledge Base for runbook procedures before making live configuration edits.
- Ensure the outgoing owner is cc'd on escalations if an on-call event occurs.

#### 📋 Direct Responsibilities
Review the action item registry linked below to accept transfer of items flagged with your name.`;
    }

    if (persona === 'absent') {
      return `### 💡 Catch-Up for Missed Meeting: ${title}
**Session Time**: ${dateFormatted} | **Attendees**: ${participants}

#### ⚡ 60-Second Overview
During your absence, the team converged on the following key operational agreements:
${decisionsList || '- Team aligned on sprint goals and task assignments.'}

#### 📌 What This Means For You
- Review the newly created action items to confirm none conflict with your active track.
- If you were assigned an item, verify the proposed target completion date.
- Full raw notes and decisions are archived in the session log.`;
    }

    if (persona === 'exec') {
      return `### 📊 Executive TL;DR Brief: ${title}
**Status**: Completed | **Date**: ${dateFormatted}

**Bottom Line**:
The team aligned on core deliverables with 0 critical blockers reported. All work transfers have designated proxies.

**Key Outcomes**:
${decisionsList}

**Governance & SLA**:
Next checkpoint scheduled for sprint review. Carried forward items are actively tracked in the Handover Sentinel radar.`;
    }

    // Default 'general'
    return `### 📝 Synapse AI Comprehensive Catch-Up Brief
**Session**: ${title} (${meeting.type === 'handover' ? 'Work Transfer' : 'Team Meeting'})  
**Date**: ${dateFormatted}  
**Participants**: ${participants}

#### 📌 Executive Summary
${meeting.agenda || 'General team sync and transfer of operational context.'}

#### 🔑 Key Decisions Reached
${decisionsList || '- Standard operational consensus.'}

#### 🧭 Open Action Items & Carried Context
Carried forward items and new assignments have been synced to the team backlog. Team members should confirm due dates and mark milestones as they are achieved.`;
  },

  _fallbackHeuristicParse(rawText) {
    return {
      summary: rawText.slice(0, 160) + '...',
      decisions: ['Document and finalize open topics discussed in session.'],
      actionItems: [
        {
          title: 'Review session transcript and verify next actions',
          owner: 'Alex Chen',
          dueDate: new Date(Date.now() + 7*86400000).toISOString().split('T')[0],
          priority: 'Medium'
        }
      ]
    };
  },

  _fallbackCatchupBrief(meeting, persona) {
    return `### Catch-Up Summary: ${meeting.title}
**Date**: ${meeting.date}
**Participants**: ${Array.isArray(meeting.participants) ? meeting.participants.join(', ') : meeting.participants}

**Decisions**:
${(meeting.decisions || []).map(d => `- ${d}`).join('\n')}

**Notes**:
${meeting.rawNotes || meeting.agenda || 'No raw notes provided.'}`;
  }
};
