# HTML Report Style Guide

When generating the HTML recap report, follow this CSS/HTML reference for consistent, polished output.

## Base Setup

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AI Collaboration Recap</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* ... inline CSS below ... */
  </style>
</head>
<body>
  <div class="container">
    <!-- content -->
  </div>
</body>
</html>
```

## Core CSS

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f8fafc; color: #334155; line-height: 1.65; padding: 48px 24px; }
.container { max-width: 800px; margin: 0 auto; }
h1 { font-size: 32px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
h2 { font-size: 20px; font-weight: 600; color: #0f172a; margin-top: 48px; margin-bottom: 16px; }
.subtitle { color: #64748b; font-size: 15px; margin-bottom: 32px; }
.section-intro { font-size: 14px; color: #64748b; margin-bottom: 16px; }
```

## Navigation TOC

```css
.nav-toc { display: flex; flex-wrap: wrap; gap: 8px; margin: 24px 0 32px 0; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e2e8f0; }
.nav-toc a { font-size: 12px; color: #64748b; text-decoration: none; padding: 6px 12px; border-radius: 6px; background: #f1f5f9; transition: all 0.15s; }
.nav-toc a:hover { background: #e2e8f0; color: #334155; }
```

## Stats Row

```css
.stats-row { display: flex; gap: 24px; margin-bottom: 40px; padding: 20px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; }
.stat { text-align: center; }
.stat-value { font-size: 24px; font-weight: 700; color: #0f172a; }
.stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; }
```

## At a Glance Box

```css
.at-a-glance { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; }
.glance-title { font-size: 16px; font-weight: 700; color: #92400e; margin-bottom: 16px; }
.glance-section { font-size: 14px; color: #78350f; line-height: 1.6; margin-bottom: 12px; }
.glance-section strong { color: #92400e; }
.see-more { color: #b45309; text-decoration: none; font-size: 13px; }
```

## Project Area Cards

```css
.project-area { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.area-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.area-name { font-weight: 600; font-size: 15px; color: #0f172a; }
.area-count { font-size: 12px; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; }
.area-desc { font-size: 14px; color: #475569; line-height: 1.5; }
```

## Narrative Section (How You Use CC)

```css
.narrative { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
.narrative p { margin-bottom: 12px; font-size: 14px; color: #475569; line-height: 1.7; }
.key-insight { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-top: 12px; font-size: 14px; color: #166534; }
```

## Big Wins (green), Friction (red)

```css
.big-win { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.big-win-title { font-weight: 600; font-size: 15px; color: #166534; margin-bottom: 8px; }
.big-win-desc { font-size: 14px; color: #15803d; line-height: 1.5; }

.friction-category { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.friction-title { font-weight: 600; font-size: 15px; color: #991b1b; margin-bottom: 6px; }
.friction-desc { font-size: 13px; color: #7f1d1d; margin-bottom: 10px; }
.friction-examples { margin: 0 0 0 20px; font-size: 13px; color: #334155; }
```

## CLAUDE.md Suggestions

```css
.claude-md-section { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
.claude-md-item { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px; padding: 10px 0; border-bottom: 1px solid #dbeafe; }
.cmd-code { background: white; padding: 8px 12px; border-radius: 4px; font-size: 12px; color: #1e40af; border: 1px solid #bfdbfe; font-family: monospace; flex: 1; white-space: pre-wrap; }
.cmd-why { font-size: 12px; color: #64748b; width: 100%; padding-left: 24px; margin-top: 4px; }
```

## Feature Cards (green), Pattern Cards (blue), Horizon Cards (purple)

```css
.feature-card { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.pattern-card { background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.horizon-card { background: linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%); border: 1px solid #c4b5fd; border-radius: 8px; padding: 16px; margin-bottom: 12px; }

.feature-title, .pattern-title { font-weight: 600; font-size: 15px; color: #0f172a; margin-bottom: 6px; }
.horizon-title { font-weight: 600; font-size: 15px; color: #5b21b6; margin-bottom: 8px; }
```

## Copyable Code / Prompt Blocks

```css
.copyable-prompt { background: #f8fafc; padding: 10px 12px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #334155; border: 1px solid #e2e8f0; white-space: pre-wrap; }
.copy-btn { background: #e2e8f0; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; color: #475569; }
.copy-btn:hover { background: #cbd5e1; }
```

**Every code snippet and every copyable prompt MUST have a Copy button next to it.**

## Team Feedback Section

```css
.feedback-section { margin-top: 16px; }
.feedback-section h3 { font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 12px; }
.feedback-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.feedback-card.team-card { background: #eff6ff; border-color: #bfdbfe; }
.feedback-card.model-card { background: #faf5ff; border-color: #e9d5ff; }
.feedback-title { font-weight: 600; font-size: 14px; color: #0f172a; margin-bottom: 6px; }
.feedback-detail { font-size: 13px; color: #475569; line-height: 1.5; }
.feedback-evidence { font-size: 12px; color: #64748b; margin-top: 8px; }
```

Always visible section.

## Charts (thin, integrated)

```css
.chart-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
.chart-title { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 12px; }
.charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; }
.bar-row { display: flex; align-items: center; margin-bottom: 6px; }
.bar-label { width: 100px; font-size: 11px; color: #475569; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-track { flex: 1; height: 6px; background: #f1f5f9; border-radius: 3px; margin: 0 8px; }
.bar-fill { height: 100%; border-radius: 3px; }
.bar-value { width: 28px; font-size: 11px; font-weight: 500; color: #64748b; text-align: right; }
```

## Fun Ending

```css
.fun-ending { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #fbbf24; border-radius: 12px; padding: 24px; margin-top: 40px; text-align: center; }
.fun-headline { font-size: 18px; font-weight: 600; color: #78350f; margin-bottom: 8px; }
.fun-detail { font-size: 14px; color: #92400e; }
```

## Responsive

```css
@media (max-width: 640px) { .charts-row { grid-template-columns: 1fr; } .stats-row { justify-content: center; } }
```

## JavaScript

```js
// Copy individual item
function copyText(btn) {
  const code = btn.previousElementSibling;
  navigator.clipboard.writeText(code.textContent).then(() => {
    btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy', 2000);
  });
}

// Copy all checked CLAUDE.md items
function copyAllCheckedClaudeMd() {
  const checkboxes = document.querySelectorAll('.cmd-checkbox:checked');
  const texts = Array.from(checkboxes).map(cb => cb.dataset.text).filter(Boolean);
  navigator.clipboard.writeText(texts.join('\n')).then(() => {
    const btn = document.querySelector('.copy-all-btn');
    if (btn) { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy All Checked', 2000); }
  });
}

// No collapsible sections — all content always visible
```

## Chart Colors

| Category | Color |
|----------|-------|
| Goals/Primary | #2563eb |
| Tools | #0891b2 |
| Languages | #10b981 |
| Session Types | #8b5cf6 |
| Time of Day | #8b5cf6 |
| Response Time | #6366f1 |
| Outcomes | #8b5cf6 |
| Success Factors | #16a34a |
| Friction | #dc2626 |
| Satisfaction | #eab308 |
| Tool Errors | #dc2626 |
| Horizon | #7c3aed |

## Timezone Indicator

Show in subtitle: `Times shown in [timezone]` (e.g., "Times shown in Asia/Seoul")

## Response Time Histogram

Use the same bar chart pattern. Show median and average below:
```html
<div style="font-size: 12px; color: #64748b; margin-top: 8px;">
  Median: 63.2s &bull; Average: 198.6s
</div>
```


## Section Order in HTML

1. Title + subtitle (stats summary line + timezone indicator)
2. At a Glance (warm gradient box with → section links)
3. Navigation TOC (horizontal links)
4. Stats row
5. **What You Work On** — project area cards + goal categories chart
6. **How You Use Claude Code** — narrative + key pattern box + response time histogram + multi-clauding stats + session types chart
7. **Impressive Things** — big win cards + outcomes chart + what helped most chart + satisfaction chart
8. **Where Things Go Wrong** — friction cards + friction types chart + tool errors chart
9. **Key Prompts** — verbatim blockquotes
10. **Suggestions** — CLAUDE.md checkboxes, Feature cards with code, Pattern cards with prompts
11. **On the Horizon** — horizon cards with prompts
12. **Bottom Stats** — tools, languages, time of day, day of week charts
13. **Session Assessment** — table with badge-styled outcomes
14. **Team Feedback** — blue team cards + purple AI cards
15. Fun Ending (optional)
