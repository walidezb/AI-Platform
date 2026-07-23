import os
from fastapi import Request
from fastapi.responses import JSONResponse

async def verify_internal_secret(request: Request, call_next):
    secret = os.getenv('INTERNAL_SERVICE_SECRET', '')
    if not secret:
        # No secret configured — allow (dev mode)
        return await call_next(request)

    # Skip health check & docs
    if request.url.path in ['/health', '/', '/docs', '/openapi.json', '/redoc']:
        return await call_next(request)

    hdr_secret = request.headers.get('X-Internal-Secret', '')
    if hdr_secret != secret:
        return JSONResponse(
            status_code=403,
            content={'detail': 'Unauthorized: invalid internal secret'}
        )
    return await call_next(request)
