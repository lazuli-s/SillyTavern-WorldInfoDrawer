---
name: interview
description: Conducts a thorough, iterative interview using the AskUserQuestion tool to gather detailed information from the user on any topic. Use when the user invokes /interview or says things like "interview me", "ask me questions", or "gather my requirements by asking me questions". Keep asking until all important areas are covered.
---

# Interview

## Goal

Gather complete, detailed information from the user on a topic by asking structured questions using the AskUserQuestion tool. Continue until all relevant areas are covered.

## Process

1. **Determine the topic** — If the user has not stated what the interview is about, ask them before proceeding.

2. **Plan your questions** — Before asking, mentally outline the key areas you need to cover for the topic. Group related questions together.

3. **Ask in batches** — Use AskUserQuestion with up to 4 questions per call. Prefer focused, specific questions over vague open-ended ones. Use `multiSelect: true` when multiple choices may apply simultaneously.

4. **Follow up** — After each batch, review the answers. Ask follow-up questions about anything unclear or incomplete. Probe gaps.

5. **Keep going** — Continue batches until all important areas are covered. Do not stop after one round unless the topic is genuinely exhausted.

6. **Summarize** — When done, output a clear, structured summary of everything you learned.

## Rules

- Always use the AskUserQuestion tool — do not ask questions as plain text.
- Use options that reflect real, meaningful choices — not generic placeholders.
- Include an "Other / Not sure" or equivalent option when the user might not fit any listed option.
- Adapt follow-up questions based on what the user actually said.
- Do not pad with unnecessary questions — every question must serve the goal of understanding.
