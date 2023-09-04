# Local Docker Testing

> *CWD*: From shell with cwd of `demo/corpus` directory

1. Build
```sh
docker build --progress=plain -t galileo-corpus:test .
```

2. Run
*env:*
```sh
export AWS_DEFAULT_REGION=ap-southeast-2
export AWS_REGION=ap-southeast-2
export AWS_ACCESS_KEY_ID=xxxx
export AWS_SECRET_ACCESS_KEY=xxxx
export AWS_SESSION_TOKEN=xxxx
export RDS_PGVECTOR_STORE_SECRET=test
export EMBEDDING_TABLENAME=test
export INDEXING_BUCKET=test
```
*cmd:*
```sh
export TARGET="lambda" # "lambda" or "sagemaker" (default is "lambda")
```
*run:*
```sh
docker run \
-p 9000:8080 -e LOG_LEVEL=DEBUG \
-e AWS_DEFAULT_REGION -e AWS_REGION \
-e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_SESSION_TOKEN \
-e INDEXING_CACHE_TABLE=IndexingCacheTest \
-e RDS_PGVECTOR_STORE_SECRET \
-e EMBEDDING_TABLENAME \
-e INDEXING_BUCKET \
galileo-corpus:test ${TARGET}
```

*API:*
```sh
# embed query
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d "@test/events/emdedding/embed-query.json"

# embed documents
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d "@test/events/emdedding/embed-documents.json"

# similarity search
# DOES NOT WORK
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d "@test/events/emdedding/similarity-search.json"
```

*INDEXING:*
> Running indexing command should result in the following `Nothing to index - exiting` output
```sh
{"level":"INFO","message":"Nothing to index - exiting","service":"/function/logic","timestamp":"2023-08-05T01:35:21.040Z"}
{"_aws":{"Timestamp":1691199321041,"CloudWatchMetrics":[{"Namespace":"Galileo","Dimensions":[["service","component"]],"Metrics":[{"Name":"IndexingCache-resolveS3Metadata","Unit":"Milliseconds"}]}]},"service":"Corpus","component":"CorpusIndexing","IndexingCache-resolveS3Metadata":0.48941699997521937}
```
