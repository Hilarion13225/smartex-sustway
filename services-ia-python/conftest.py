"""Rend le package `app` importable depuis les tests lances a la racine du service."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
