# canteen/middleware.py
import re
from django.utils.deprecation import MiddlewareMixin
from django.middleware.csrf import CsrfViewMiddleware
from django.conf import settings

class CustomCSRFMiddleware(CsrfViewMiddleware):
    def process_view(self, request, callback, callback_args, callback_kwargs):
        # Check if the request path should be exempt from CSRF
        exempt_urls = getattr(settings, 'CSRF_EXEMPT_URLS', [])
        
        for pattern in exempt_urls:
            if re.match(pattern, request.path):
                return None
        
        # Continue with normal CSRF processing
        return super().process_view(request, callback, callback_args, callback_kwargs)
