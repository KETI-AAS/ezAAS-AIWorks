FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml poetry.lock* /app/
RUN python -m pip install --upgrade pip && pip install poetry && poetry config virtualenvs.create false && poetry install --no-root --no-interaction --no-ansi
COPY . /app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
