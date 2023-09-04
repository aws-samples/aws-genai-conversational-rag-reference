import os
import json
import shutil
import tarfile
import sagemaker
import boto3
import hashlib
from huggingface_hub import snapshot_download

from typing import TypedDict, Literal, Optional

__TESTING__ = os.environ.get("PYTHON_ENV", "production") == "test"

if __TESTING__:
  from tempfile import gettempdir
  os.environ["TMPDIR"] = gettempdir()
else:
  os.environ["TMPDIR"] = "/tmp" # nosec

class ResourceProperties(TypedDict):
  Bucket: str
  BucketKeyPrefix: str
  ModelId: str


class HandlerEvent(TypedDict):
  RequestType: str
  PhysicalResourceId: Optional[str]
  ResourceProperties: ResourceProperties

class Data(TypedDict):
  S3Location: str
  EntryPoint: str
  ModelId: str

class HandlerResponse(TypedDict):
  PhysicalResourceId: Optional["str"]
  Data: Optional[Data]
  NoEcho: Optional[bool]

session = sagemaker.Session()

MODEL_TAR_FILENAME="model.tar.gz"

def handler(event: HandlerEvent, context):
  print("Received event: " + json.dumps(event, indent=2))

  response: HandlerResponse = {} # type: ignore

  props = event['ResourceProperties']

  MODEL_ID=props["ModelId"]
  REPO_ID=f"sentence-transformers/{MODEL_ID}"

  if __TESTING__:
    CACHE_DIR = os.path.join(os.environ["TMPDIR"], REPO_ID)
    MODEL_TAR_FILE=os.path.join(os.environ["TMPDIR"], MODEL_TAR_FILENAME)
  else:
    CACHE_DIR = f"/tmp/.cache/huggingface/hub/{REPO_ID}" # nosec
    MODEL_TAR_FILE = f"/tmp/{MODEL_TAR_FILENAME}" # nosec

  print("CACHE_DIR:", CACHE_DIR)
  if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)

  if event['RequestType'] == 'Create':
    ##########################################
    # download snapshot
    ##########################################
    print("downloading snapshot...")
    SNAPSHOT=snapshot_download(repo_id=REPO_ID, cache_dir=CACHE_DIR)
    print(SNAPSHOT)
    print(os.listdir(SNAPSHOT))

    ##########################################
    # copy code/* files into snapshot
    ##########################################
    print("mutating snapshot with code/* files...")
    SHAPSHOT_CODE=f"{SNAPSHOT}/code/"
    shutil.copytree("./code", SHAPSHOT_CODE, dirs_exist_ok=True)
    print("copied code files:", os.listdir(SHAPSHOT_CODE))

    ##########################################
    # tar the model including the code/inference.py
    ##########################################
    print("create tarbar...")
    if os.path.exists(MODEL_TAR_FILE):
        os.remove(MODEL_TAR_FILE)

    def reset(tarinfo):
        tarinfo.uid = tarinfo.gid = 0
        tarinfo.uname = tarinfo.gname = "root"
        return tarinfo

    tar = tarfile.open(MODEL_TAR_FILE, "w:gz", dereference=True)
    for f in os.listdir(SNAPSHOT):
        tar.add(f"{SNAPSHOT}/{f}", arcname=f, filter=reset)
    print(tar.list())
    tar.close()
    print("Model Tar Size:" + str(os.path.getsize(MODEL_TAR_FILE) * 1e-6) + "MB")

    # get zip hash
    zip_hash = hashlib.md5(open(MODEL_TAR_FILE, 'rb').read(), usedforsecurity=False).hexdigest()

    ##########################################
    # upload model tar to s3
    ##########################################
    print("uploading to bucket...")
    bucket=props["Bucket"]
    key_prefix=props["BucketKeyPrefix"]
    s3_key=f"{key_prefix}/{REPO_ID}/{zip_hash}/{MODEL_TAR_FILENAME}"
    s3_location=f"s3://{bucket}/{s3_key}"

    if __TESTING__:
      print("TESTING: skipping upload:", MODEL_TAR_FILE, bucket, s3_key)
    else:
      s3_client = boto3.client('s3')
      s3_client.upload_file(MODEL_TAR_FILE, bucket, s3_key)

    print("Success: ", s3_location)

    response["Data"] = {
       "EntryPoint": "code/inference.py",
       "S3Location": s3_location,
       "ModelId": MODEL_ID,
    }

  print("Response: " + json.dumps(response))

  return response
