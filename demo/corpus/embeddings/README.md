# Corpus Transformer (Text Embedding)

## Running locally

To run the test:

```python
➜ `poetry run pytest --capture=no`

# Watch
➜ `poetry run pwt`

# Verbose watch
➜ `poetry run ptw --runner "pytest -v --capture=no"`
➜ `poetry run ptw --runner "pytest -v --capture=no -k test_chat_engine"`

# Watch with pretty logging output
➜ `POWERTOOLS_LOG_DEDUPLICATION_DISABLED="1" poetry run ptw --runner "pytest -o log_cli=1"`
```
