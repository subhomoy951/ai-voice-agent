"""HTTP-only cPanel entry point; browser WebRTC media connects to OpenAI."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from a2wsgi import ASGIMiddleware
from app.main import app

_http_app = ASGIMiddleware(app)
_routes = {'/health', '/api/realtime/session', '/api/schedule/extract'}


def application(environ, start_response):
    # Passenger may include the mount prefix in PATH_INFO or only SCRIPT_NAME.
    environ = environ.copy()
    path = environ.get('PATH_INFO', '/')
    mount = environ.get('SCRIPT_NAME', '').rstrip('/')
    if mount and (path == mount or path.startswith(mount + '/')):
        path = path[len(mount):] or '/'
    elif path == '/ai' or path.startswith('/ai/'):
        path = path[3:] or '/'
    environ['PATH_INFO'] = path
    environ['SCRIPT_NAME'] = ''
    if path not in _routes:
        status = '501 Not Implemented' if path == '/api/realtime/ws' else '404 Not Found'
        body = json.dumps({'detail': 'This gateway supports HTTP call sessions and schedule extraction only.'}).encode()
        start_response(status, [('Content-Type', 'application/json'), ('Content-Length', str(len(body)))])
        return [body]
    return _http_app(environ, start_response)
