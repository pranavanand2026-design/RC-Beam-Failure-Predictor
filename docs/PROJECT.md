# RC Beam Fire Studio: Project Overview

A single place for the context behind this project: what it's for, how it works, and how it's built and deployed.

**Live:** [rcbeam.netlify.app](https://rcbeam.netlify.app) · **API:** `https://rcbeam-api-48804248039.australia-southeast1.run.app` · **Report:** [RC_Beam_Report.pdf](RC_Beam_Report.pdf)

---

## Goal

Let anyone see **how long a reinforced concrete beam strengthened with FRP will last in a fire, and how it will fail**, without running a physical fire test, and show which design changes would make it safer.

Engineers normally answer this with expensive furnace tests or simplified lookup tables that ignore FRP, insulation and load. This project replaces that with machine learning models trained on 21,384 simulated fire tests, wrapped in an interactive 3D tool.

## Objectives

1. **Classify the failure mode**: deflection failure, strength failure, or no failure.
2. **Predict fire resistance time**: minutes until the beam fails under a standard fire.
3. **Recommend design changes**: the smallest changes (cover, insulation, steel, FRP, load) that get a beam to a target fire rating.
4. **Check against Eurocode**: compare the beam with EN 1992-1-2 tabulated requirements (R60/R90/R120).
5. **Make it usable by non-specialists**: a 3D beam that changes as you design it, a playable fire test, and plain-language explanations.

---

## The problem domain in brief

- **The fire:** tests follow the ISO 834 standard fire curve. The furnace reaches ~842 °C at 30 min, ~945 °C at 60 min and ~1049 °C at 120 min.
- **What weakens:**
  - The FRP strip's adhesive softens at its glass transition temperature (~70–90 °C).
  - Concrete loses ~15% of its strength by 300 °C.
  - Steel bars are down to ~80% strength at 500 °C and about half at 600 °C (EN 1992-1-2).
- **Failure modes in the dataset:**

| Mode | Share | Typical time | What it means |
|---|---|---|---|
| Deflection failure | 86% | median 80 min | The beam bends past the safe deflection limit. Gradual, so there is some warning |
| Strength failure | 11% | median 50 min | Capacity drops below the applied load. Sudden collapse |
| No failure | 2% | full 300 min test | Survives the whole 5-hour test |

- **What buys time** (dataset medians):
  - Cover of 30 mm or more lasts 130 min, against 45 min at 20 mm or less.
  - A load under 50% of capacity lasts 145 min, against 50 min at 60% or more.
  - Every beam that survived the full test was insulated.

---

## Data

- **Source:** Bhatt, Kodur and Naser simulated fire tests of FRP-strengthened RC beams.
- **Size:** 21,384 labelled beams in `data/processed/dataset.parquet`, with the raw spreadsheet in `data/raw/`.
- **17 input features:**

| Group | Features |
|---|---|
| Geometry | `L` span, `Ac` section area, `Cc` concrete cover |
| Reinforcement | `As` steel area, `Af` FRP area |
| Materials | `fc` concrete strength, `fy` steel yield, `Es` steel modulus, `fu` FRP strength, `Efrp` FRP modulus, `Tg` adhesive glass transition temperature |
| Protection | `tins` insulation thickness (underside), `hi` insulation depth (sides), `kins` conductivity, `rinscins` heat capacity |
| Loading | `Ld` applied load, `LR` load ratio |

- **Targets:** `LimitState` (failure mode) and `FR` (fire resistance, minutes).
- **Beam IDs** look like `I1_ B42`, where `I1`–`I5` are the dataset's beam groups. The UI shows them as `I1 · B42`.

## Models

- **Classifier:** a blend of XGBoost and LDAM-DRW (large-margin loss with deferred re-weighting). It's built for the heavy class imbalance (86 / 11 / 2%):
  - targeted SMOTE resampling
  - isotonic probability calibration
  - per-class decision thresholds
- **Regressor:** LightGBM predicting fire resistance time.
- **Validation:** grouped 5-fold cross-validation, so beams from the same study never sit on both sides of a split. Confidence intervals come from 1,000 bootstrap resamples.
- **Results:**
  - classifier: ~91% accuracy, 0.94 ROC-AUC
  - regressor: R² 0.94, typical error ~9 min

  Because always guessing deflection failure scores 86%, per-class recall and macro-F1 are the more honest measures, and the report covers them.
- **Artifacts:** `models/checkpoints/blend_xgb_ldam_nophys.joblib` and `frt_regressor.joblib`.

---

## Stack

| Layer | Technology |
|---|---|
| ML | Python 3.12, XGBoost, LightGBM, scikit-learn, imbalanced-learn, pandas, NumPy |
| API | FastAPI, Uvicorn, Pydantic (GZip responses, CORS) |
| Frontend | Next.js 16 (static export), React 19, three.js via React Three Fiber, Tailwind CSS 4, TanStack Query, Figtree font |
| Hosting | Google Cloud Run (API, Docker) · Netlify (frontend) |
| Tooling | pytest, ESLint, TypeScript, Makefile, gcloud CLI |

## Architecture

```
Browser ──► Netlify (static Next.js site)
   │
   └──REST──► Cloud Run: FastAPI
                 ├── ModelService      classifier + regressor
                 ├── AnalysisService   recommendations, Eurocode check
                 └── DatasetService    21,384 beams, feature ranges
```

**API endpoints** (`api/routers/`):

| Endpoint | Purpose |
|---|---|
| `GET /health` | Liveness |
| `GET /api/v1/meta` | Feature metadata, defaults, ranges |
| `GET /api/v1/meta/beams/index` | All beams with mode, time and key features (for Explore) |
| `GET /api/v1/meta/beams/{id}` | One beam's features and lab result |
| `POST /api/v1/playground` | Live prediction for a design |
| `POST /api/v1/analyze` | Prediction + ranked design recommendations |
| `POST /api/v1/predict` | Prediction only |

**Frontend pages** (`web/src/app/`):

| Page | What it does |
|---|---|
| `/` | Headline, looping 3D fire test, three onboarding steps |
| `/studio` | 3D beam built from the inputs, sliders, live verdict dial, playable fire test, design suggestions, first-visit guide |
| `/explore` | Browse/filter/sort all 21,384 beams with cross-section thumbnails; open any in the studio |
| `/about` | The three failure modes, heat scale, what buys time, model summary |

**The 3D beam** (`web/src/components/beam/`) is generated from the model inputs:
- the section comes from `Ac`, the bars from `As`, and the cage sits inside the concrete by `Cc`
- the FRP strip comes from `Af`, and the insulation from `tins` and `hi`

The span is compressed for display, while the cross-section keeps its real proportions. One shader handles bending, the strength-failure kink, heat glow and highlighting the part being edited.

## Repository layout

```
api/              FastAPI backend
web/              Next.js frontend
src/rcbeam_fire/  ML library (data, models, analysis, dashboard)
scripts/          Pipeline CLI (scan → preprocess → train → analyse)
  experiments/    Earlier model trials, kept for reference
tests/            pytest suite
data/             raw/ and processed/ dataset
models/           trained checkpoints
docs/             report, figures, pitch deck, this file
deploy/cloudrun/  one-command API deploy
```

---

## Running locally

```bash
make setup                                  # venv + package (use Python 3.11–3.12)
make run                                    # full training pipeline
uvicorn api.main:app --port 8000            # API (~2 s to load locally)
cd web && npm install && npm run dev        # frontend on :3000
```

Set `web/.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:8000`.

## Deployment

**API on Google Cloud Run:**
- **Where:** project `rc-beam-fire`, region `australia-southeast1`, service `rcbeam-api`.
- **How to deploy:** `PROJECT=rc-beam-fire deploy/cloudrun/deploy.sh` builds the root `Dockerfile` remotely.
- **Settings:** 2 GiB RAM, scales to zero, at most 2 instances, startup CPU boost.
- **Image:** about 235 MB. It uses `xgboost-cpu` to avoid ~400 MB of unused GPU libraries.
- **Cold start:** about 10 s.

**Frontend on Netlify:**
- **Build:** from `main`, as a static export of `web/`.
- **API address:** `NEXT_PUBLIC_API_URL` is set in `netlify.toml`, which overrides the Netlify dashboard.
- **On load:** any page wakes the API and prefetches metadata. A circular progress ring shows during a cold start.

**CORS:** the API allows `rcbeam.netlify.app`, its Netlify deploy previews (`*--rcbeam.netlify.app`) and localhost. Override with the `CORS_ORIGINS` / `CORS_ORIGIN_REGEX` environment variables.

## Known limitations

- **Not for real engineering decisions.** Predictions are only as good as the simulated dataset, and the sliders are limited to its training ranges.
- **The 3D model is illustrative.** The span is compressed, and bar counts are inferred from steel area.
- **The first visit after idle waits about 10 s** while Cloud Run starts an instance.
- **The test suite has 8 passing and 3 failing tests:**
  - Two metric tests need `make run` first, because their output files aren't committed.
  - `tests/test_dashboard.py` fails with a real bug in the dashboard loader ("too many values to unpack").
