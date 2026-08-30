from abc import ABC, abstractmethod
import logging
import os
from pathlib import Path
import shutil
from typing import Optional, Tuple
from PIL import Image
import pytesseract

from app.core.config import settings

logger = logging.getLogger(__name__)


class BaseOCRProcessor(ABC):
    """Abstract interface for OCR engines."""

    @abstractmethod
    def is_available(self) -> bool:
        """Return True if the OCR backend is installed and ready."""
        pass

    @abstractmethod
    def extract_text_and_confidence(
        self, image: Image.Image
    ) -> Tuple[str, Optional[float]]:
        """
        Extract text and calculate confidence score from an in-memory image.

        Returns:
            Tuple of (extracted_text, average_confidence_score_or_None)
        """
        pass


class TesseractOCRProcessor(BaseOCRProcessor):
    """OCR engine powered by Tesseract via pytesseract."""

    def __init__(self, tesseract_cmd: Optional[str] = None):
        self._tesseract_cmd = tesseract_cmd or settings.TESSERACT_CMD or self._discover_tesseract()
        if self._tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = self._tesseract_cmd
            logger.info(f"Tesseract OCR configured at: {self._tesseract_cmd}")
        else:
            logger.info("Tesseract OCR binary not detected on system. Graceful fallback active.")

    def _discover_tesseract(self) -> Optional[str]:
        """Auto-detect Tesseract executable on Windows and standard environments."""
        # 1. Check system PATH
        if which_path := shutil.which("tesseract"):
            return which_path

        # 2. Check standard Windows installation directories
        candidates = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Tesseract-OCR\tesseract.exe"),
            os.path.expandvars(r"%PROGRAMFILES%\Tesseract-OCR\tesseract.exe"),
        ]

        for path_str in candidates:
            if Path(path_str).is_file():
                return path_str

        return None

    def is_available(self) -> bool:
        """Check if Tesseract binary is available on the system."""
        return self._tesseract_cmd is not None and Path(self._tesseract_cmd).is_file()

    def extract_text_and_confidence(
        self, image: Image.Image
    ) -> Tuple[str, Optional[float]]:
        """
        Extract text from an image with word-level confidence score calculation.
        """
        if not self.is_available():
            logger.warning("Tesseract binary is not installed or available; skipping OCR extraction.")
            return "", None

        try:
            # Extract structured OCR data with bounding box confidence scores
            data = pytesseract.image_to_data(
                image,
                output_type=pytesseract.Output.DICT,
            )

            words = []
            confidences = []

            # Aggregate words and valid confidence scores (conf >= 0)
            for text, conf in zip(data.get("text", []), data.get("conf", [])):
                word = str(text).strip()
                try:
                    conf_val = float(conf)
                except (ValueError, TypeError):
                    conf_val = -1.0

                if word:
                    words.append(word)
                    if conf_val >= 0:
                        confidences.append(conf_val)

            extracted_text = " ".join(words).strip()
            avg_confidence = (
                round(sum(confidences) / len(confidences), 2)
                if confidences
                else None
            )

            return extracted_text, avg_confidence

        except pytesseract.TesseractNotFoundError:
            logger.warning("TesseractNotFoundError during OCR execution. Degrading gracefully.")
            return "", None
        except Exception as err:
            logger.error(f"Unexpected error during Tesseract OCR extraction: {err}")
            return "", None
