import hashlib
import hmac
import time
import unittest
from unittest.mock import patch

from app.exotel_bridge import authorized_call


class ExotelBridgeAuthTests(unittest.TestCase):
    def test_signed_call_link_expires_and_rejects_tampering(self):
        expires = str(int(time.time()) + 60)
        signature = hmac.new(b"test-secret", f"42.{expires}".encode(), hashlib.sha256).hexdigest()
        with patch.dict("os.environ", {"EXOTEL_BRIDGE_TOKEN": "test-secret"}):
            self.assertTrue(authorized_call("42", expires, signature))
            self.assertFalse(authorized_call("43", expires, signature))
            self.assertFalse(authorized_call("42", str(int(time.time()) - 1), signature))
