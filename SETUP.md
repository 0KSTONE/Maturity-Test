# Maturity Assessment — Setup & Deployment Guide

## What You're Deploying
# BF
```
maturity-assessment/
├── public/
│   └── index.html          ← The full assessment frontend
├── api/
│   └── evaluate.js         ← Serverless function: AI scoring + Supabase logging
├── vercel.json             ← Vercel routing config
├── supabase_schema.sql     ← Database schema + analytics queries
└── SETUP.md                ← This file
```

---

## Step 1 — Supabase (Database)

1. Go to https://supabase.com → Create a free account
2. Create a new project (name it anything, e.g. "maturity-assessment")
3. Wait for it to provision (~1 minute)
4. Go to **SQL Editor** in the left sidebar
5. Paste the entire contents of `supabase_schema.sql` and click **Run**
6. You should see two tables created: `assessment_sessions` and `assessment_responses`

**Get your keys:**
- Go to **Project Settings → API**
- Copy your **Project URL** → this is `SUPABASE_URL`
- Copy the **service_role** key (not anon) → this is `SUPABASE_SERVICE_KEY`
  - Note: service_role key has full access — keep it secret, never put it in frontend code

---

## Step 2 — Vercel (Hosting)

1. Go to https://vercel.com → Create a free account
2. Install Vercel CLI: `npm install -g vercel`
3. In your terminal, navigate to the `maturity-assessment` folder
4. Run `vercel` and follow the prompts
   - Link to your Vercel account
   - Set project name (e.g. "maturity-assessment")
   - Framework: Other
   - Root directory: ./
5. After first deploy, add environment variables:

```
vercel env add ANTHROPIC_API_KEY
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
```

Paste each value when prompted. Select **Production**, **Preview**, and **Development**.

6. Redeploy to apply the env vars:
```
vercel --prod
```

7. Vercel gives you a URL like `https://maturity-assessment-xxx.vercel.app`
   **That is your shareable link.**

---

## Step 3 — Get Your Anthropic API Key

1. Go to https://console.anthropic.com
2. Go to **API Keys** → Create a new key
3. Copy it — this is `ANTHROPIC_API_KEY`

---

## Environment Variables Summary

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API → service_role key |

---

## Step 4 — Test It

1. Open your Vercel URL
2. Complete a test run (you can write short placeholder responses)
3. Check Supabase → **Table Editor** → `assessment_sessions` to confirm logging works
4. Check `assessment_responses` to see individual question logs

---

## Sharing

- **One link for both age groups:** `https://your-app.vercel.app`
  The app asks for age first and routes automatically.
- You can also add a custom domain in Vercel settings for free.

---

## Viewing Your Data

In Supabase → SQL Editor, you can run the analytics queries at the bottom of `supabase_schema.sql`. Useful ones:

```sql
-- Overall stats by age group
SELECT age_group, 
  ROUND(AVG(avg_ai_score),2) as avg_score,
  ROUND(AVG(awareness_gap),2) as avg_gap,
  COUNT(*) as total_sessions
FROM assessment_sessions 
GROUP BY age_group;

-- Category breakdown
SELECT age_group,
  ROUND(AVG(category_identity),2) as identity,
  ROUND(AVG(category_relational),2) as relational,
  ROUND(AVG(category_trauma),2) as trauma,
  ROUND(AVG(category_cognitive),2) as cognitive,
  ROUND(AVG(category_generativity),2) as generativity
FROM assessment_sessions 
GROUP BY age_group;
```

---

## Cost Estimate (Free Tier)

| Service | Free Tier | Estimated usage per 100 assessments |
|---|---|---|
| Vercel | 100GB bandwidth/mo | ~50MB |
| Supabase | 500MB database, 50k rows | ~5MB, ~2,000 rows |
| Anthropic API | Pay per use | ~$0.15–0.30 per assessment (Claude Sonnet) |

For low-volume testing and early data collection, Vercel and Supabase are both free. Only Anthropic costs money per run.

---

## Updating Questions or Scoring

- **Questions:** Edit the `QUESTIONS` object in `public/index.html`
- **AI scoring logic:** Edit the `SYSTEM_PROMPT` constant in `api/evaluate.js`
- **Rubric descriptions shown to users:** Edit `RUBRIC_DESCRIPTIONS` in `public/index.html`
- After any changes: run `vercel --prod` to redeploy

---

## Troubleshooting

**Blank results after submission:** Check Vercel Function Logs (Vercel dashboard → your project → Functions tab) for errors.

**Supabase not logging:** Confirm `SUPABASE_SERVICE_KEY` is the service_role key, not the anon key.

**AI response parse error:** Claude occasionally returns malformed JSON under load. The app shows an error message. This is rare but can be retried.
