import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from mangum import Mangum
from server import app

handler = Mangum(app)
