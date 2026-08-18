import importlib.util
import os
import unittest

SERVER_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEGMENT_PATH = os.path.join(SERVER_ROOT, "scripts", "segment.py")

spec = importlib.util.spec_from_file_location("segment", SEGMENT_PATH)
segment = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(segment)


class SegmentTest(unittest.TestCase):
    def test_norm_word_strips_diacritics_tatweel_and_punct(self):
        self.assertEqual(segment.norm_word("الرَّحْمَٰنِ"), "الرحمن")
        self.assertEqual(segment.norm_word("بِسْمِ"), "بسم")
        self.assertEqual(segment.norm_word("اللّٰهِ،"), "الله")

    def test_words_match_exact_and_containment(self):
        self.assertTrue(segment.words_match("الرحمن", "الرحمن"))
        # merged token contains the expected 2-letter word
        self.assertTrue(segment.words_match("ولقد", "قد"))
        # single-letter containment is not a match
        self.assertFalse(segment.words_match("قل", "ق"))
        self.assertFalse(segment.words_match("أب", "زد"))

    def test_align_clips_maps_ayah_boundaries(self):
        ayahs = [
            {"surah": 1, "ayah": 1, "words": ["بسم", "الله", "الرحمن", "الرحيم"]},
            {"surah": 1, "ayah": 2, "words": ["الحمد", "لله", "رب", "العالمين"]},
        ]
        recognized = [
            {"word": "بسم", "start": 0.0, "end": 0.4},
            {"word": "الله", "start": 0.4, "end": 0.8},
            {"word": "الرحمن", "start": 0.8, "end": 1.3},
            {"word": "الرحيم", "start": 1.3, "end": 1.7},
            {"word": "الحمد", "start": 2.0, "end": 2.5},
            {"word": "لله", "start": 2.5, "end": 2.9},
            {"word": "رب", "start": 2.9, "end": 3.3},
            {"word": "العالمين", "start": 3.3, "end": 4.0},
        ]
        clips = segment.align_clips(recognized, ayahs)
        self.assertEqual(len(clips), 2)
        self.assertEqual(clips[0]["ayah"], 1)
        self.assertAlmostEqual(clips[0]["start"], 0.0)
        self.assertAlmostEqual(clips[0]["end"], 1.7)
        self.assertEqual(clips[1]["ayah"], 2)
        self.assertAlmostEqual(clips[1]["start"], 2.0)
        self.assertAlmostEqual(clips[1]["end"], 4.0)

    def test_align_clips_tolerates_missing_words(self):
        ayahs = [{"surah": 112, "ayah": 1, "words": ["قل", "هو", "الله", "أحد"]}]
        recognized = [
            {"word": "قل", "start": 0.0, "end": 0.3},
            {"word": "هو", "start": 0.3, "end": 0.6},
            # "الله" misrecognized/missing
            {"word": "أحد", "start": 0.9, "end": 1.2},
        ]
        clips = segment.align_clips(recognized, ayahs)
        self.assertEqual(len(clips), 1)
        self.assertAlmostEqual(clips[0]["start"], 0.0)
        self.assertAlmostEqual(clips[0]["end"], 1.2)


if __name__ == "__main__":
    unittest.main()
