from __future__ import annotations

import json

from tests.conftest import ANALYSIS_PARAMS_DEFAULTS, PREPROCESSING_PARAMS_DEFAULTS


def _build_params_form_value(
    analysis_param_overrides: dict | None = None,
    per_file_param_overrides: dict | None = None,
    file_names: tuple[str, ...] = ("sprint.csv",),
) -> str:
    analysis_params = {**ANALYSIS_PARAMS_DEFAULTS, **(analysis_param_overrides or {})}
    per_file_param_overrides = per_file_param_overrides or {}
    per_file_params = {
        file_name: {**analysis_params, **per_file_param_overrides.get(file_name, {})}
        for file_name in file_names
    }
    return json.dumps({
        "per_file_params": per_file_params,
        "preprocessing_params": dict(PREPROCESSING_PARAMS_DEFAULTS),
    })


class TestAnalyzeFilesAuth:
    def test_rejects_when_session_cookie_missing(self, monkeypatch, sprint_csv_text):
        monkeypatch.setenv("APP_PASSWORD", "pw")
        monkeypatch.setenv("APP_SESSION_SECRET", "s")
        from fastapi.testclient import TestClient

        from app.main import app

        with TestClient(app) as unauthenticated_client:
            response = unauthenticated_client.post(
                "/analysis/analyze",
                files={"files": ("sprint.csv", sprint_csv_text, "text/csv")},
                data={"params": _build_params_form_value()},
            )
        assert response.status_code == 401


class TestAnalyzeFiles:
    def test_returns_analysis_for_valid_csv(self, client, sprint_csv_text):
        response = client.post(
            "/analysis/analyze",
            files={"files": ("sprint.csv", sprint_csv_text, "text/csv")},
            data={"params": _build_params_form_value()},
        )
        assert response.status_code == 200
        result = response.json()["results"][0]
        assert result["file_name"] == "sprint.csv"
        assert result.get("error") is None

        analysis = result["analysis"]
        assert len(analysis["time_series"]["relative_times"]) == 100
        assert len(analysis["time_series"]["speeds"]) == 100
        assert len(analysis["time_series"]["accs"]) == 100
        assert len(analysis["acc_events"]["full"]["all"]) >= 1
        assert len(analysis["dec_events"]["full"]["all"]) >= 1
        assert analysis["acc_profile_fit"] is not None
        assert analysis["dec_profile_fit"] is not None
        assert analysis["meta"]["body_mass_kg"] == 75.0

    def test_returns_422_when_files_missing(self, client):
        response = client.post("/analysis/analyze", data={"params": _build_params_form_value()})
        assert response.status_code == 422

    def test_returns_422_when_params_missing(self, client, sprint_csv_text):
        response = client.post(
            "/analysis/analyze",
            files={"files": ("sprint.csv", sprint_csv_text, "text/csv")},
        )
        assert response.status_code == 422

    def test_reports_per_file_error_when_time_not_monotonic(self, client):
        invalid_csv_text = (
            "time,speed,lat,lon\n"
            "00:00:00.5,5.0,52.0,21.0\n"
            "00:00:00.2,5.0,52.0,21.0\n"
        )
        response = client.post(
            "/analysis/analyze",
            files={"files": ("invalid.csv", invalid_csv_text, "text/csv")},
            data={"params": _build_params_form_value(file_names=("invalid.csv",))},
        )
        assert response.status_code == 200
        result = response.json()["results"][0]
        assert result["file_name"] == "invalid.csv"
        assert "analysis" not in result
        assert "increasing" in result["error"].lower()

    def test_returns_422_when_per_file_params_missing(self, client, sprint_csv_text):
        response = client.post(
            "/analysis/analyze",
            files={"files": ("sprint.csv", sprint_csv_text, "text/csv")},
            data={"params": _build_params_form_value(file_names=())},
        )
        assert response.status_code == 422

    def test_returns_400_when_all_speeds_below_pitch_projection_threshold(self, client):
        lines = ["time,speed,lat,lon"]
        for sample_index in range(30):
            lines.append(
                f"00:00:{sample_index * 0.1:06.3f},1.0,52.0,{21.0 + sample_index * 1e-6:.7f}"
            )
        response = client.post(
            "/analysis/analyze",
            files={"files": ("slow.csv", "\n".join(lines) + "\n", "text/csv")},
            data={"params": _build_params_form_value(file_names=("slow.csv",))},
        )
        assert response.status_code == 400

    def test_uses_per_file_params_for_each_file(self, client, sprint_csv_text):
        response = client.post(
            "/analysis/analyze",
            files=[
                ("files", ("light.csv", sprint_csv_text, "text/csv")),
                ("files", ("heavy.csv", sprint_csv_text, "text/csv")),
            ],
            data={
                "params": _build_params_form_value(
                    per_file_param_overrides={
                        "light.csv": {"body_mass_kg": 70.0},
                        "heavy.csv": {"body_mass_kg": 95.0},
                    },
                    file_names=("light.csv", "heavy.csv"),
                )
            },
        )
        assert response.status_code == 200
        results_by_file_name = {
            result["file_name"]: result for result in response.json()["results"]
        }
        assert results_by_file_name["light.csv"]["analysis"]["meta"]["body_mass_kg"] == 70.0
        assert results_by_file_name["heavy.csv"]["analysis"]["meta"]["body_mass_kg"] == 95.0
