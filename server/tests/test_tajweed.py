"""Tests for the text-level tajweed rule detector."""
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.tajweed_rules import detect_tajweed, tajweed_summary


class TestTajweed(unittest.TestCase):
    def test_detects_madd(self):
        rules = detect_tajweed("قَالَ")
        self.assertIn("madd", [r["rule"] for r in rules])

    def test_detects_ghunnah(self):
        rules = detect_tajweed("إِنَّ")
        self.assertIn("ghunnah", [r["rule"] for r in rules])

    def test_detects_qalqalah(self):
        rules = detect_tajweed("أَحَدْ")
        self.assertIn("qalqalah", [r["rule"] for r in rules])

    def test_detects_ikhfa(self):
        rules = detect_tajweed("مِنْ شَرِّ")
        self.assertIn("ikhfa", [r["rule"] for r in rules])

    def test_summary_counts(self):
        rules = detect_tajweed("قَالَ إِنَّ أَحَدْ")
        s = tajweed_summary(rules)
        self.assertGreaterEqual(s.get("madd", 0), 1)


if __name__ == "__main__":
    unittest.main()
