---
title: RC Beam Fire API
colorFrom: red
colorTo: gray
sdk: docker
app_port: 8000
pinned: false
short_description: Predicts how FRP-strengthened concrete beams fail in fire
---

# RC Beam Fire API

FastAPI backend for [RC Beam Fire Studio](https://rcbeam.netlify.app). It predicts the failure mode and
fire resistance time of FRP-strengthened reinforced concrete beams, and suggests design changes.

- `GET /health`: liveness check
- `GET /api/v1/meta`: feature metadata and defaults
- `POST /api/v1/playground`: live prediction for a beam design
- `POST /api/v1/analyze`: prediction plus design recommendations

Source: [github.com/pranavanand2026-design/rc_beam-risk_model](https://github.com/pranavanand2026-design/rc_beam-risk_model)
