import pytest
from api.main import _calculate_spatial_density
from unittest.mock import Mock

def test_spatial_density():
    mock_threat1 = Mock(); mock_threat1.x = 10; mock_threat1.y = 10
    mock_threat2 = Mock(); mock_threat2.x = 12; mock_threat2.y = 12
    mock_threat3 = Mock(); mock_threat3.x = 10; mock_threat3.y = 12
    tracks = [mock_threat1, mock_threat2, mock_threat3]
    density = _calculate_spatial_density(tracks)
    assert density > 0.0
