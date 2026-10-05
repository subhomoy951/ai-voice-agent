import subprocess
import sys
import unittest
from unittest.mock import patch

import httpx

from passenger_wsgi import application


class PassengerTests(unittest.TestCase):
    def test_import_does_not_start_middleware(self):
        result = subprocess.run(
            [sys.executable, '-c',
             'import sys, threading; import passenger_wsgi as gateway; '
             'assert gateway._http_app is None; '
             'assert "app.main" not in sys.modules; '
             'assert threading.active_count() == 1'],
            capture_output=True, text=True, timeout=15,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def client(self):
        return httpx.Client(transport=httpx.WSGITransport(application), base_url='https://test')

    def test_mount_and_health(self):
        with self.client() as client:
            self.assertEqual(client.get('/ai/health').status_code, 200)
        transport = httpx.WSGITransport(application, script_name='/ai')
        with httpx.Client(transport=transport, base_url='https://test') as client:
            self.assertEqual(client.get('/health').status_code, 200)
            self.assertEqual(client.get('/ai/health').status_code, 200)

    def test_session_preserves_sdp_and_assistant(self):
        offer = b'v=0\r\n'
        def upstream(request):
            body = request.read()
            self.assertIn(offer, body)
            self.assertIn(b'Subrata', body)
            return httpx.Response(201, text='v=0\r\n', headers={'content-type': 'application/sdp'})
        original = httpx.AsyncClient
        def factory(**kwargs):
            return original(transport=httpx.MockTransport(upstream), **kwargs)
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-only'}), patch('app.main.httpx.AsyncClient', side_effect=factory):
            with self.client() as client:
                response = client.post('/ai/api/realtime/session?assistant=subrata', content=offer, headers={'content-type': 'application/sdp'})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.content, offer)

    def test_validation_and_unsupported_routes(self):
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-only'}):
            with self.client() as client:
                self.assertEqual(client.post('/ai/api/realtime/session', content='bad').status_code, 415)
                self.assertEqual(client.post('/ai/api/schedule/extract', json={}).status_code, 422)
                self.assertEqual(client.get('/ai/api/realtime/ws').status_code, 501)
                self.assertEqual(client.get('/ai/leads').status_code, 404)

    def test_knowledge_extraction_route_is_available_through_passenger(self):
        def downstream(environ, start_response):
            self.assertEqual(environ['PATH_INFO'], '/api/knowledge/extract')
            start_response('200 OK', [('Content-Type', 'text/plain')])
            return [b'allowed']

        with patch('passenger_wsgi.get_wsgi_app', return_value=downstream):
            with self.client() as client:
                response = client.post('/ai/api/knowledge/extract')
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.text, 'allowed')


if __name__ == '__main__':
    unittest.main()
