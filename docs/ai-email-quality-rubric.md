# AI Email Quality Rubric

Score each generated email from 0 to 2 for every category. A score of 12 or higher out of 16 is considered ship-ready for v0.1.

## Categories

1. Subject line
   - 0: vague, spammy, too long, or misleading.
   - 1: clear but ordinary.
   - 2: specific, concise, and likely to earn an open.

2. Preheader
   - 0: missing, duplicates the subject, or wastes the inbox preview.
   - 1: useful but generic.
   - 2: complements the subject and adds concrete context.

3. Copy clarity
   - 0: generic AI prose or unclear ask.
   - 1: understandable but wordy.
   - 2: direct, specific, and easy to act on.

4. CTA quality
   - 0: no clear CTA or multiple competing CTAs.
   - 1: CTA exists but is weak.
   - 2: one clear, relevant, high-intent CTA.

5. SaaS specificity
   - 0: could be for any business.
   - 1: includes some product context.
   - 2: reflects the SaaS use case and user moment.

6. Visual structure
   - 0: broken or cluttered layout.
   - 1: readable but plain.
   - 2: polished, restrained, and mobile-friendly.

7. MJML validity
   - 0: does not compile.
   - 1: compiles with meaningful warnings or weak structure.
   - 2: compiles cleanly or only with harmless warnings.

8. Ship-readiness
   - 0: founder would rewrite it.
   - 1: founder would edit several parts.
   - 2: founder would send it after minor tweaks or no edits.

## Notes

The goal is not maximum creativity. The goal is a high-quality, specific SaaS email that can be shipped quickly.
