"""Unit tests for security primitives (password hashing + JWT) — no DB needed."""
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing(unittest.TestCase):
    def test_roundtrip(self):
        h = hash_password("s3cret-password")
        self.assertNotEqual(h, "s3cret-password")
        self.assertTrue(verify_password("s3cret-password", h))
        self.assertFalse(verify_password("wrong", h))


class TestJWT(unittest.TestCase):
    def test_roundtrip(self):
        token = create_access_token("user@example.com")
        self.assertEqual(decode_token(token), "user@example.com")


if __name__ == "__main__":
    unittest.main()
