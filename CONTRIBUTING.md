# Contributing to Open Quran Engine

Thanks for your interest in contributing! Open Quran Engine is an open-source
engine that **listens to Quran recitation and corrects it word-by-word with
tajweed feedback**. Anyone can use it to build their own Quran apps.

## Ways to contribute

- 🐛 Report a bug
- 💡 Suggest a feature
- 📖 Improve the docs
- 🧠 Improve ASR / verse-matching / tajweed correctness
- 🌍 Add translations, recitations, or tajweed-rule data

## Getting started

1. Fork and clone the repo.
2. Run the engine locally (see [README](README.md) → Quickstart):

   ```bash
   cd server
   python -m venv .venv && .venv\Scripts\activate   # Windows (Linux/macOS: source .venv/bin/activate)
   pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8010
   # open http://localhost:8010/docs
   ```

3. Make your change on a feature branch.
4. Run the tests: `cd server && python -m unittest discover -s tests`.
5. Open a pull request with a clear description of what/why.

## Pull request checklist

- [ ] Follows existing style (PEP 8, type hints where useful).
- [ ] Tests pass (`python -m unittest discover -s tests`).
- [ ] No secrets, keys, or large binary files committed.
- [ ] README/docs updated if behavior changed.

## Notes

- Be kind and patient — this is a community *waqf* (a gift for the ummah).
- See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- By contributing, you agree your work is licensed under the [MIT License](LICENSE).
