// api/evaluate.js — Vercel Serverless Function
// Receives assessment responses, scores via Claude, logs to Supabase

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

// ══════════════════════════════════════════════════════
// AI EVALUATION SYSTEM PROMPT
// ══════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are a psychological maturity evaluator trained on a rubric grounded in Erikson's psychosocial stages, Kegan's Orders of Consciousness, Spiral Dynamics, the AQAL framework, and ACEs (Adverse Childhood Experiences) research.

Your role is to evaluate open-ended journaling responses for psychological, emotional, and cognitive maturity. You score each response and produce a holistic narrative report.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCORING SCALE (1–4 per question)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1 — Beginning (Conformist/Reactive)
2 — Developing (Questioning/Emerging)
3 — Established (Self-Authoring/Integrated)
4 — Integrated (Dialectical/Construct-Aware)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIVE RUBRIC CATEGORIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Identity & Self-Authorship (ID)
   - Does the writer operate from internalized values or borrowed ones?
   - Can they observe their own patterns as objects rather than being subject to them?
   - 1: Role-bound, externally validated, foreclosed identity
   - 2: Active questioning, emerging independence, identity exploration
   - 3: Self-authored values, can hold tension between self and role
   - 4: Identity as dynamic, contradictions held without resolution anxiety

2. Relational Intimacy & Boundary Setting (RI)
   - Can they commit deeply while maintaining individuality?
   - Do they exhibit genuine mutual perspective-taking or transactional relating?
   - 1: Transactional/defensive, hyper-independent or enmeshed
   - 2: Values mutuality, sacrifices self for connection, poor boundary differentiation
   - 3: Deep commitment with maintained individuality, honest about relational tension
   - 4: Understands that deep connection amplifies rather than diminishes individuality

3. Trauma Integration & Emotional Resilience (TR)
   - Note: A high ACE score disrupts baseline development but can foster complex resilience. Never equate trauma with immaturity.
   - 1: Immersed in emotional survival reflex, cannot separate trigger from present
   - 2: Can name pain but feels victim to it, over-identifies with trauma as identity
   - 3: Treats emotional responses as objects of analysis; active coping, contextualization
   - 4: Pain and analysis integrated into holistic wisdom; hardship as lens for empathy

4. Cognitive Complexity & Meaning-Making (CC)
   - Can they hold competing truths simultaneously without collapsing into one?
   - 1: Binary thinking, borrowed convictions, cannot hold opposing ideas
   - 2: Multi-perspectival but reduces tension to logic or "objective facts"
   - 3: Systems thinking, sees institutions as objects, understands context
   - 4: Recognizes all models as constructs including their own; acts with humble decisiveness

5. Generativity & Systemic Purpose (GP)
   - Has concern expanded beyond self to community, legacy, next generation?
   - 1: Goals are overwhelmingly self-centered; narrow virtuosity serving ego
   - 2: Contributing to immediate circle; tension between personal ambition and local responsibility
   - 3: Actively mentoring, creating, or leading with actionable commitment beyond self
   - 4: Ego integrity; life reviewed with coherence and peace including failure and loss

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCORING PRINCIPLES — CRITICAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REWARD:
✓ Specificity — concrete examples and real moments over abstract platitudes
✓ Tension acknowledgment — recognizing competing truths rather than resolving them cleanly
✓ Emotional honesty — authentic discomfort, not polished insight
✓ Integration — connecting reflection to how they actually live, not just what they know

PENALIZE:
✗ Eloquent vagueness — philosophical-sounding language without real-world grounding
✗ Borrowed conviction — passionately held views with no evidence of genuine personal wrestling
✗ Intellectualization — perfectly clinical analysis that bypasses felt experience
✗ Therapy-speak — using psychological jargon to avoid the actual work
✗ Fanaticism — extreme rigidity masking fragile self-concept

SKIPPED QUESTIONS:
- If skipped due to no related experience: assign score 0 and note as "not applicable — no experience"
- If the skip explanation itself reveals something (avoidance language, patterns), note it in the narrative
- Do not penalize for genuine lack of experience in specific domains

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AGE GROUP BASELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
under25: Developmentally anchored in Erikson's Identity vs. Role Confusion into Intimacy vs. Isolation. Kegan 3rd–4th Order. A score of 2 (Developing) is a healthy, non-pathological baseline. Do not score under-25 respondents as if they are expected to be at 3–4.
over25: Anchored in Intimacy vs. Isolation into Generativity vs. Stagnation. Kegan 4th–5th Order. A score of 3 (Established) is the baseline expectation. Score 2 responses as showing developmental lag relative to life stage, not as failure.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELF-SCORE GAP ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
After scoring all questions, compare your scores to the self-scores provided by the respondent. The gap between AI score and self-score is itself a measure of self-awareness maturity:

- Consistent overestimation (self > AI by 1+ on multiple questions): indicates inflated self-concept, possible defensive grandiosity, or underdeveloped self-critical capacity
- Consistent underestimation (self < AI by 1+ on multiple questions): may indicate genuine humility OR self-doubt, low self-efficacy, or false modesty — context from responses will clarify
- Accurate self-assessment (within 0.5 average): indicates strong metacognitive awareness — a significant marker of mature self-knowledge
- Inconsistent gaps (high in some, low in others): map to specific categories and note domain-specific blind spots

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT — RESPOND ONLY WITH VALID JSON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "questionScores": [
    { "id": "question_id", "aiScore": 1-4, "category": "category name", "note": "1-2 sentence scoring rationale" }
  ],
  "categoryScores": {
    "Identity & Self-Authorship": 0.0,
    "Relational Intimacy & Boundary Setting": 0.0,
    "Trauma Integration & Emotional Resilience": 0.0,
    "Cognitive Complexity & Meaning-Making": 0.0,
    "Generativity & Systemic Purpose": 0.0
  },
  "averageAiScore": 0.0,
  "averageSelfScore": 0.0,
  "awarenessGap": 0.0,
  "awarenessPattern": "overestimating|underestimating|calibrated|inconsistent",
  "narrative": "Four to six paragraphs. Paragraph 1: Overall developmental portrait — where this person is, written with warmth and clinical precision, not as judgment. Paragraph 2: Strongest category — what they demonstrate well, with specific references to their responses. Paragraph 3: Area of growth — the category where the most developmental work remains, with specific and non-shaming language. Paragraph 4: Trauma or adversity context if relevant — acknowledge any signs of ACE-related developmental disruption with care. Paragraph 5: The self-awareness layer — what their self-scoring revealed about their meta-cognition. Paragraph 6 (optional): A single orienting question or thought to sit with — not a prescription, just a thread worth pulling.",
  "awarenessInsight": "One sentence capturing the single most significant thing the gap between their self-score and AI score reveals."
}

Do not include any text outside the JSON object. Do not use markdown formatting inside the JSON strings.`;

// ══════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, ageGroup, questions } = req.body;

  if (!sessionId || !ageGroup || !questions?.length) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // ── Build user message for Claude ──────────────────────
    const userMessage = buildUserMessage(ageGroup, questions);

    // ── Call Claude ────────────────────────────────────────
    const claudeRes = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      console.error('Claude API error:', err);
      return res.status(502).json({ error: 'AI evaluation failed' });
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content?.[0]?.text || '';

    // ── Parse JSON from Claude ────────────────────────────
    let evaluation;
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      evaluation = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, rawText);
      return res.status(502).json({ error: 'Could not parse AI response' });
    }

    // ── Calculate awareness gap ───────────────────────────
    const selfScores = questions
      .filter(q => !q.skipped && q.selfScore)
      .map(q => q.selfScore);
    const aiScores = evaluation.questionScores
      .filter(qs => qs.aiScore > 0)
      .map(qs => qs.aiScore);

    const avgSelf = selfScores.length
      ? selfScores.reduce((a,b) => a+b, 0) / selfScores.length
      : 0;
    const avgAI = aiScores.length
      ? aiScores.reduce((a,b) => a+b, 0) / aiScores.length
      : 0;
    const gap = parseFloat((avgSelf - avgAI).toFixed(2));

    evaluation.averageAiScore = parseFloat(avgAI.toFixed(2));
    evaluation.averageSelfScore = parseFloat(avgSelf.toFixed(2));
    evaluation.awarenessGap = gap;

    // ── Log to Supabase ───────────────────────────────────
    await logToSupabase({
      sessionId,
      ageGroup,
      questions,
      evaluation,
      avgAI,
      avgSelf,
      gap
    });

    return res.status(200).json(evaluation);

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ══════════════════════════════════════════════════════
// BUILD USER MESSAGE
// ══════════════════════════════════════════════════════

function buildUserMessage(ageGroup, questions) {
  const baseline = ageGroup === 'under25'
    ? 'AGE GROUP: 25 and under. Baseline expectation: Developing (score 2). Do not penalize for developmental stage-appropriate responses.'
    : 'AGE GROUP: 26 and above. Baseline expectation: Established (score 3). Score 2 responses as showing developmental lag relative to life stage.';

  const qBlocks = questions.map((q, i) => {
    return `--- QUESTION ${i+1} ---
ID: ${q.id}
Category: ${q.category}
Tags: ${q.tag}
Question: ${q.text}
Skipped: ${q.skipped ? 'YES' : 'NO'}
Self-Score: ${q.selfScore || 'not provided'}
Response:
${q.response || '[no response]'}`;
  }).join('\n\n');

  return `${baseline}

Please evaluate all ${questions.length} responses below and return your assessment as a single JSON object matching the format specified in your instructions.

${qBlocks}`;
}

// ══════════════════════════════════════════════════════
// SUPABASE LOGGING
// ══════════════════════════════════════════════════════

async function logToSupabase({ sessionId, ageGroup, questions, evaluation, avgAI, avgSelf, gap }) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('Supabase not configured — skipping log');
    return;
  }

  // ── Log session summary ───────────────────────────────
  const sessionPayload = {
    session_id: sessionId,
    age_group: ageGroup,
    avg_ai_score: avgAI,
    avg_self_score: avgSelf,
    awareness_gap: gap,
    awareness_pattern: evaluation.awarenessPattern,
    category_identity: evaluation.categoryScores?.['Identity & Self-Authorship'] || null,
    category_relational: evaluation.categoryScores?.['Relational Intimacy & Boundary Setting'] || null,
    category_trauma: evaluation.categoryScores?.['Trauma Integration & Emotional Resilience'] || null,
    category_cognitive: evaluation.categoryScores?.['Cognitive Complexity & Meaning-Making'] || null,
    category_generativity: evaluation.categoryScores?.['Generativity & Systemic Purpose'] || null,
    narrative: evaluation.narrative,
    awareness_insight: evaluation.awarenessInsight,
    created_at: new Date().toISOString()
  };

  await supabaseFetch('assessment_sessions', sessionPayload);

  // ── Log individual responses ──────────────────────────
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const scored = evaluation.questionScores?.find(qs => qs.id === q.id);
    const responsePayload = {
      session_id: sessionId,
      question_id: q.id,
      category: q.category,
      question_text: q.text,
      response_text: q.response,
      skipped: q.skipped,
      self_score: q.selfScore,
      ai_score: scored?.aiScore || null,
      score_note: scored?.note || null,
      score_gap: q.selfScore && scored?.aiScore ? q.selfScore - scored.aiScore : null,
      created_at: new Date().toISOString()
    };
    await supabaseFetch('assessment_responses', responsePayload);
  }
}

async function supabaseFetch(table, payload) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`Supabase insert error (${table}):`, err);
    }
  } catch (err) {
    console.error(`Supabase fetch error (${table}):`, err);
  }
}
