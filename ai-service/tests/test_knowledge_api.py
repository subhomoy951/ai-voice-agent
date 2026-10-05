import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app


class KnowledgeApiTest(unittest.TestCase):
    def test_extraction_requires_token_and_returns_text(self):
        with patch.dict(os.environ, {'KNOWLEDGE_SERVICE_TOKEN': 'test-only'}):
            client = TestClient(app)
            files = {'file': ('company.txt', b'We build applications with React.', 'text/plain')}
            self.assertEqual(client.post('/api/knowledge/extract', files=files).status_code, 401)
            response = client.post('/api/knowledge/extract', files=files, headers={'Authorization': 'Bearer test-only'})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()['sections'][0]['text'], 'We build applications with React.')


if __name__ == '__main__':
    unittest.main()
