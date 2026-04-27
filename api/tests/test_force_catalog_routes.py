import unittest
import os
import sys
from unittest.mock import MagicMock

from fastapi.testclient import TestClient


project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

try:
    import runpod  # type: ignore
except ImportError:
    runpod = MagicMock()
    sys.modules['runpod'] = runpod


class TestForceCatalogRoutes(unittest.TestCase):
    def setUp(self):
        from api.main import app

        self.client = TestClient(app)

    def test_force_catalog_summary_includes_counts(self):
        response = self.client.get("/api/force-catalog")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["forceCount"], 78)
        self.assertEqual(data["unitCount"], 78)
        self.assertEqual(data["platformCount"], 18)
        self.assertGreater(data["forceGroupCount"], 0)
        self.assertGreater(data["categoryCount"], 0)
        self.assertGreater(data["sourceCount"], 0)

    def test_force_catalog_unit_exposes_platform_metadata(self):
        response = self.client.get("/api/force-catalog/forces/JAS_39_Gripen_C_D")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["_platform_id"], "GRIPEN_CD")
        self.assertEqual(data["_platform_profile"]["id"], "GRIPEN_CD")
        self.assertEqual(data["_platform_profile"]["origin_country"], "SWEDEN")
        self.assertEqual(data["_threat_class"], "AIRCRAFT")

    def test_force_catalog_list_entries_keep_platform_metadata(self):
        response = self.client.get("/api/force-catalog/forces", params={"nation": "sweden"})

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreater(len(data), 0)
        gripen = next(unit for unit in data if unit["_id"] == "JAS_39_Gripen_C_D")
        self.assertEqual(gripen["_platform_id"], "GRIPEN_CD")


if __name__ == "__main__":
    unittest.main()
