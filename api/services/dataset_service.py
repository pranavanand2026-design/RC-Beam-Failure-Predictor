from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd


class DatasetService:
    def __init__(self, df: pd.DataFrame, id_col: str = "BN"):
        self.df = df
        self.id_col = id_col

    def list_beam_ids(self) -> List[str]:
        return sorted(self.df[self.id_col].astype(str).unique().tolist())

    INDEX_FEATURES = ["L", "Ac", "Cc", "As", "Af", "tins", "hi", "LR"]
    VALID_MODES = {"Deflection Failure", "Strength Failure", "No Failure"}

    def beam_index(self) -> Tuple[List[str], List[list]]:
        """Return (columns, rows) for every beam with a known failure mode.

        Rows are naturally ordered by group then beam number (I1_ B2 before I1_ B10).
        """
        cols = [self.id_col, "LimitState", "FR", *self.INDEX_FEATURES]
        sub = self.df[[c for c in cols if c in self.df.columns]].copy()
        sub = sub[sub["LimitState"].astype(str).isin(self.VALID_MODES)]
        ids = sub[self.id_col].astype(str)
        parts = ids.str.extract(r"^(\D*)(\d+)\D*(\d*)")
        sub["_g"] = parts[0] + parts[1].fillna("")
        sub["_n"] = pd.to_numeric(parts[2], errors="coerce").fillna(0)
        sub = sub.sort_values(["_g", "_n"]).drop(columns=["_g", "_n"])
        out_cols = ["id", "mode", "frt", *[c for c in self.INDEX_FEATURES if c in sub.columns]]
        rows = []
        for rec in sub.itertuples(index=False):
            row = [str(rec[0]), str(rec[1])]
            for v in rec[2:]:
                f = pd.to_numeric(v, errors="coerce")
                row.append(round(float(f), 2) if pd.notna(f) else None)
            rows.append(row)
        return out_cols, rows

    def get_beam(self, beam_id: str) -> Optional[pd.Series]:
        matches = self.df[self.df[self.id_col].astype(str) == str(beam_id)]
        if matches.empty:
            return None
        return matches.iloc[0]

    def get_beam_features(
        self, beam_id: str, feature_names: List[str]
    ) -> Optional[Dict[str, float]]:
        row = self.get_beam(beam_id)
        if row is None:
            return None
        features = {}
        for f in feature_names:
            if f in row.index:
                val = row[f]
                try:
                    features[f] = float(pd.to_numeric(val, errors="coerce"))
                except (TypeError, ValueError):
                    features[f] = 0.0
            else:
                features[f] = 0.0
        return features

    def get_ground_truth(
        self, beam_id: str
    ) -> Optional[Tuple[Optional[str], Optional[float]]]:
        row = self.get_beam(beam_id)
        if row is None:
            return None
        mode = None
        for col in ("LimitState", "target"):
            if col in row.index and pd.notna(row[col]):
                mode = str(row[col])
                break
        frt = None
        if "FR" in row.index:
            try:
                val = float(pd.to_numeric(row["FR"], errors="coerce"))
                if np.isfinite(val):
                    frt = val
            except (TypeError, ValueError):
                pass
        return mode, frt

    def compute_feature_ranges(
        self, features: List[str]
    ) -> Dict[str, Dict[str, float]]:
        ranges = {}
        for feat in features:
            if feat not in self.df.columns:
                continue
            col = pd.to_numeric(self.df[feat], errors="coerce").dropna()
            if col.empty:
                continue
            ranges[feat] = {
                "min": float(col.quantile(0.05)),
                "max": float(col.quantile(0.95)),
                "mean": float(col.mean()),
                "step": float(
                    max((col.quantile(0.75) - col.quantile(0.25)) / 20.0, 0.1)
                ),
            }
        return ranges

    def get_feature_defaults(self, features: List[str]) -> Dict[str, float]:
        defaults = {}
        for f in features:
            if f in self.df.columns:
                col = pd.to_numeric(self.df[f], errors="coerce").dropna()
                defaults[f] = float(col.median()) if not col.empty else 0.0
            else:
                defaults[f] = 0.0
        return defaults
