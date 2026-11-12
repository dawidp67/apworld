# AP World Study Hub

Single-file study site (`index.html`). Each chapter is a `CH.push((function(){ ... })())` block holding its data; the app engine is the IIFE at the bottom.

## Adding a new chapter (do all of this every time)

1. **Chapter block**: copy an existing chapter's structure (vocab, sheet, tables, timeline, contentQ, tfQ, packet, optional notesPage). Use the next chapter number as `id`/`num`.
2. **Teacher material** (when the user sends Knowt sets or test screenshots):
   - Vocab definitions use the teacher's wording. Turn Knowt question-style cards ("What process transferred...?") into statements ("The process that transferred...").
   - AP value ratings go in `var AP = {term: rating}` and `ap:AP` in the return. Terms must match vocab terms exactly.
   - Terms the teacher tested that have no rating go in `var TEACHER = [...]` and `teacher:TEACHER`.
   - Teacher Q&A cards go in `var TEACHER_QA = [{q, a}, ...]` and `teacherQA:TEACHER_QA` (this shows the Teacher Q&A tab).
   - Matching definitions from a real test should replace the vocab definitions for those terms, word for word.
3. **Question bank**: add an entry for the chapter id in `AP_BANK` (just above the engine). Aim for about 20 medium/hard multiple-choice questions and 12 true/false statements. If the user sends a real test, add its questions word for word with the `"test"` marker.

## Question bank format

```
mc: [stem, [correct, wrong, wrong, wrong], explanation, theme, level, "test"?]
tf: [statement, isTrue, explanation, theme, "test"?]
```
- The correct answer is always listed first; the quiz shuffles choices.
- `level` 2 = medium (cause/effect, "why"), 3 = hard (AP / unit-test style). TF bank items count as level 3.
- `theme` must be one of the chapter's `CATS`.
- Optional `"test"` marks a question copied from a real unit test (tagged "From your test" in the quiz).

## The teacher's test style (match this for level-3 questions)

The unit tests are inference-heavy. A stem gives a fact or a short summary, then asks for the best conclusion, interpretation, or evidence. Common stems:
- "[Fact]. Which conclusion is best supported?"
- "[Fact]. Which interpretation best fits this evidence?" / "...best connects these developments?" / "...best accounts for this combination?"
- "Historical summary: A; B; C. Which relationship does this pattern illustrate?"
- "Which evidence best challenges / most strongly qualifies / would best support the claim that ...?"
- "Why would it be misleading to describe ... as ...?"
- "From the perspective of [a person], why/what ...?"
- "[Fact]. Which consequence would most directly follow?"
- "Which statement most carefully expresses this connection?" (the right answer avoids overstatement: "could contribute", not "made inevitable")

Answer choices are short general statements (about 50 to 90 characters), all in the same grammatical form. Example: "Political loyalties could shape a ruler's treatment of religious authorities." Wrong answers use overstatement ("every", "immediately", "chiefly", "without any"), reversed cause and effect, the wrong actor or region, or anachronism. For "qualify" or "challenge" questions, the wrong answers are true facts that support the claim instead.

True/false statements are precise and contain one twisted detail when false (wrong actor, "chiefly by", "without incorporating", "began in response to"). Example: "The Songhay Empire fell to Portuguese forces attempting to establish control over the Niger River." (False: it fell to Moroccan forces.)

Explanations are one or two short sentences saying why the answer is right, or what the trap was.

## Checks before committing

- **Answer length:** the correct answer must not usually be the longest choice. Across the bank it should be the longest in no more than about 40% of questions. The real tests are near 25%. Lengthen a wrong answer with plausible detail to fix this.
- **Themes:** every theme value is in the chapter's `CATS`, and every question has four distinct choices.
- **Browser test:** load `index.html#chNN`, run a quiz at each difficulty, and confirm there are no console errors.
