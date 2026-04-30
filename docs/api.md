# API Contract

## POST `/api/ai-email-generator/generate`

Creates the first email draft.

Request:

```json
{
  "prompt": "Trial ending in 3 days for a $49/mo design tool..."
}
```

Success:

```json
{
  "subject": "Your trial ends Friday",
  "preheader": "Keep your workspace active and save 20% on annual.",
  "mjml": "<mjml>...</mjml>",
  "html": "<!doctype html>...",
  "usage": {
    "remaining": {
      "generatesToday": 4,
      "generatesThisHour": 2,
      "refinesToday": 30
    }
  }
}
```

Errors:

- `400 invalid_request`
- `429 rate_limit_exceeded`
- `500 generation_failed`
- `503 upstream_unavailable`

## POST `/api/ai-email-generator/refine`

Refines the current email. The client reads a streamed response from `fetch()`.

Request:

```json
{
  "originalPrompt": "Trial ending in 3 days...",
  "currentEmail": {
    "subject": "Your trial ends Friday",
    "preheader": "Keep your workspace active...",
    "mjml": "<mjml>...</mjml>"
  },
  "messages": [
    { "role": "user", "content": "Make the CTA more urgent." }
  ],
  "newMessage": "Make it shorter and more founder-like."
}
```

Stream events:

```txt
event: started
data: {\"message\":\"Refinement started\"}

event: progress
data: {\"message\":\"Updating the email copy and layout\"}

event: complete
data: {\"subject\":\"...\",\"preheader\":\"...\",\"mjml\":\"...\",\"html\":\"...\"}
```
