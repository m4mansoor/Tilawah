"""Unit tests for the pure-Python core (no ML deps): Quran data, matching, diff."""
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.phonetics import phonetic_key
from app.quran_data import get_ayah_by_id, load_quran
from app.verse_match import find_best_ayah, find_best_reference, normalize
from app.tajweed import diff_words


class TestQuranData(unittest.TestCase):
    def test_loads_all_ayahs(self):
        self.assertEqual(len(load_quran()), 6236)

    def test_first_ayah(self):
        a = get_ayah_by_id(1)
        self.assertIsNotNone(a)
        self.assertTrue(normalize(a["text"]).startswith("بسم الله"))


class TestNormalization(unittest.TestCase):
    def test_strips_diacritics(self):
        self.assertEqual(normalize("بِسْمِ اللَّهِ"), "بسم الله")


class TestVerseMatch(unittest.TestCase):
    def test_matches_modified_ayah(self):
        ayahs = load_quran()
        # Ayah 2 (Al-Fatiha 1:2) normalized is "الحمد لله رب العالمين".
        altered = "الحمد لله رب العالمون"
        best = find_best_ayah(altered, ayahs)
        self.assertIsNotNone(best)
        self.assertEqual(best["id"], 2)

    def test_matches_full_surah(self):
        from app.verse_match import find_best_reference, normalize

        ayahs = load_quran()
        # Surah Al-Ikhlas (112), full, normalized (without Basmala).
        full = "قل هو الله احد الله الصمد لم يلد ولم يولد ولم يكن له كفوا احد"
        best = find_best_reference(full, ayahs)
        self.assertIsNotNone(best)
        self.assertIn("الصمد", normalize(best["text"]))


class TestDiff(unittest.TestCase):
    def test_detects_deletion(self):
        errors = diff_words("بسم الله الرحمن الرحيم", "بسم الله الرحيم")
        types = [e["error_type"] for e in errors]
        self.assertIn("deletion", types)


class TestPhoneticMatching(unittest.TestCase):
    """The correction engine must follow Arabic makharij (articulation points)."""

    def test_confusable_letters_share_phonetic_class(self):
        self.assertEqual(phonetic_key("ق"), phonetic_key("ك"))
        self.assertEqual(phonetic_key("ح"), phonetic_key("ه"))
        self.assertEqual(phonetic_key("ن"), phonetic_key("ل"))
        self.assertEqual(phonetic_key("س"), phonetic_key("ص"))
        self.assertEqual(phonetic_key("ت"), phonetic_key("ط"))
        self.assertNotEqual(phonetic_key("ق"), phonetic_key("م"))
        self.assertNotEqual(phonetic_key("ح"), phonetic_key("خ"))

    def test_no_false_errors_for_asr_letter_confusions(self):
        # Al-Ikhlas recited correctly; ASR confuses ق/ك, ح/ه, ن/ل. These must
        # not be flagged as substitutions.
        reference = "قل هو الله احد الله الصمد لم يلد ولم يولد ولم يكن له كفوا احد"
        recognized = "كل هو الله اهد الله الصمد لم يلد ولم يولد ولم يقل له كفوا اهد"
        self.assertEqual(diff_words(reference, recognized), [])

    def test_still_detects_distant_class_substitution(self):
        # ح (guttural) vs خ (uvular) is a real makhraj error — must be flagged.
        errors = diff_words("الحمد لله", "الخمد لله")
        types = [e["error_type"] for e in errors]
        self.assertIn("substitution", types)

    def test_matches_ikhlas_despite_asr_confusion(self):
        ayahs = load_quran()
        confused = "كل هو الله اهد الله الصمد لم يلد ولم يولد ولم يقل له كفوا اهد"
        best = find_best_reference(confused, ayahs)
        self.assertIsNotNone(best)
        self.assertIn("الصمد", normalize(best["text"]))


if __name__ == "__main__":
    unittest.main()
