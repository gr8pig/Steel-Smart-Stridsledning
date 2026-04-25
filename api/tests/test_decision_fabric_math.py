import pytest
from api.decision_fabric import _logistic_load, project_collapse

def test_logistic_curve():
    assert _logistic_load(0) < 0.1
    assert _logistic_load(15) == 0.5
    assert _logistic_load(30) > 0.9

def test_ema_smoothing():
    # 0.4 current, 0.45 prev, dt=2.0 -> raw_vel = -0.025
    # ema_vel = 0.0
    # smoothed_vel = (0.2 * -0.025) + (0.8 * 0.0) = -0.005
    proj, new_ema = project_collapse(0.4, 0.45, 2.0, 0.0, ema_vel=0.0)
    assert new_ema == pytest.approx(-0.005)
    assert proj is not None and proj > 0
