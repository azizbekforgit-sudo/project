import uvicorn
import os
from app.main import app

# Этот файл — точка входа для Railway (Dockerfile)
# Он просто перенаправляет всё в app/main.py, чтобы не было путаницы

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
