# Open Quran Engine — API Reference

The engine is a FastAPI service. The core endpoint is `POST /v1/correct`: send a
Quran recitation (as base64 audio) and get back the transcript, the matched verse,
word-by-word corrections, and tajweed rules.

Interactive docs: `/docs` (Swagger UI) · OpenAPI spec: `/openapi.json`

## POST /v1/correct — correct a recitation

**Request body (JSON):**

```json
{
  "audio_base64": "<base64-encoded audio — any format ffmpeg can decode>",
  "surah": 1,
  "ayah": 1
}
```

| Field | Type | Notes |
|---|---|---|
| `audio_base64` | string | Base64 of the audio (WAV / WebM / MP3 / …) |
| `audio_url` | string | Alternative to `audio_base64` (not yet wired) |
| `surah` | int | Optional — surah number (1–114) |
| `ayah` | int | Optional — ayah number within the surah |
| `ayah_id` | int | Optional — global ayah id (overrides surah/ayah) |

If you omit the target, the engine **fuzzy-matches** the verse from the transcript.

**Response (JSON):**

```json
{
  "status": "ok",
  "transcript": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  "ayah_id": 1,
  "matched_ayah_text": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  "note": null,
  "errors": [
    { "index": 0, "word": "…", "expected": "…", "recognized": "…", "error_type": "substitution", "tajweed_rule": null }
  ],
  "tajweed": [
    { "rule": "ghunnah", "letter": "ن", "description": "…" }
  ]
}
```

- `errors` — word-level diff vs. the reference ayah (`error_type`: substitution / omission / insertion).
- `tajweed` — tajweed rules detected in the reference ayah.
- `note` — set when the verse couldn't be confidently matched.

**Example (curl):**

```bash
curl -X POST https://tilawah.me/v1/correct \
  -H 'Content-Type: application/json' \
  -d '{"audio_base64":"<base64>","surah":1,"ayah":1}'
```

## Platform endpoints (used by the Tilawah reference app)

`/v1/auth/*` (register/login), `/v1/qari/*` (profile, next-verse), `/v1/surahs`,
`/v1/recitations`, `/v1/coverage`, `/v1/leaderboard`, `/v1/assignments`, `/v1/admin/*`.

These power the Tilawah Qari-collection platform and are **not required** to build
your own client — `/v1/correct` is the engine.
