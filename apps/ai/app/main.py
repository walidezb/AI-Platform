from fastapi import FastAPI

app = FastAPI(title="AI Learning Service")

@app.get("/health")
def health():
    return {"status": "ok"}
