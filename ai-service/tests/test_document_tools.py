import tempfile
import unittest
from pathlib import Path

from docx import Document
from pypdf import PdfWriter

from app.document_tools import extract_document


class DocumentToolsTest(unittest.TestCase):
    def test_txt_and_docx_extraction(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            text_file = root / "company.txt"
            text_file.write_text("We build web apps with React and Laravel.", encoding="utf-8")
            self.assertEqual(extract_document(text_file)[0]["text"], "We build web apps with React and Laravel.")

            docx_file = root / "company.docx"
            document = Document()
            document.add_paragraph("Our technology stack includes Python.")
            document.save(docx_file)
            self.assertIn("Python", extract_document(docx_file)[0]["text"])

    def test_limits_and_scanned_pdf_fallback(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            text_file = root / "large.txt"
            text_file.write_text("hello", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "size limit"):
                extract_document(text_file, max_bytes=4)
            with self.assertRaisesRegex(ValueError, "character limit"):
                extract_document(text_file, max_characters=4)

            pdf_file = root / "blank.pdf"
            writer = PdfWriter()
            writer.add_blank_page(width=100, height=100)
            with pdf_file.open("wb") as output:
                writer.write(output)
            with self.assertRaisesRegex(ValueError, "OCR"):
                extract_document(pdf_file)


if __name__ == "__main__":
    unittest.main()
