import os
import json
import shutil
import subprocess #nosec
from pathlib import Path
from huggingface_hub import snapshot_download

__TESTING__ = os.environ.get("PYTHON_ENV", "production") == "test"

CODEBUILD_BUILD_ID=os.environ["CODEBUILD_BUILD_ID"]
CODEBUILD_SRC_DIR=os.environ["CODEBUILD_SRC_DIR"]

ARTIFACT_BASE_DIR=os.environ["ARTIFACT_BASE_DIR"]
HF_REPO_ID=os.environ["HF_REPO_ID"]
MODEL_TAR_FILENAME="model.tar.gz"

CUSTOM_ASSET_CODEBUILD_SRC_DIR=os.environ.get("CODEBUILD_SRC_DIR_CustomAsset")
SNAPSHOT_DOWNLOAD_OPTIONS=os.environ.get("SNAPSHOT_DOWNLOAD_OPTIONS")

repo_id=HF_REPO_ID
model_id=repo_id.split("/")[-1]

WORKDIR=Path(os.path.join(CODEBUILD_SRC_DIR, repo_id))
WORKDIR.mkdir(exist_ok=True, parents=True)
OUTDIR=Path(os.path.join(CODEBUILD_SRC_DIR, ARTIFACT_BASE_DIR))
OUTDIR.mkdir(exist_ok=True, parents=True)

local_dir=Path(os.path.join(WORKDIR, "model"))
model_tar_file=Path(os.path.join(OUTDIR, MODEL_TAR_FILENAME))

print("WORKDIR:", WORKDIR)
print("OUTDIR:", OUTDIR)
print("model_tar_file:", model_tar_file)

##########################################
# download snapshot
##########################################
print("downloading snapshot...")
download_options = {}
if SNAPSHOT_DOWNLOAD_OPTIONS != None:
    download_options = json.loads(SNAPSHOT_DOWNLOAD_OPTIONS)
snapshot_download(
  repo_id=repo_id,
  **download_options,
  local_dir=local_dir,
  local_dir_use_symlinks=True,
)
print("local_dir:", local_dir)
print(os.listdir(local_dir))

if CUSTOM_ASSET_CODEBUILD_SRC_DIR != None:
    custom_asset_dir = Path(CUSTOM_ASSET_CODEBUILD_SRC_DIR)
    print("CustomAsset:", CUSTOM_ASSET_CODEBUILD_SRC_DIR, os.listdir(CUSTOM_ASSET_CODEBUILD_SRC_DIR))
    print("Copying custom asset files into local dir")
    shutil.copytree(str(custom_asset_dir), str(local_dir), dirs_exist_ok=True)

##########################################
# tar the model
##########################################
print("create tarbar...")
subprocess.run(f"tar -chf {model_tar_file} --use-compress-program=pigz *", shell=True, check=True, cwd=str(local_dir)) #nosec
print(f"{MODEL_TAR_FILENAME} created at ${model_tar_file}")
print("Model Tar Size:" + str(os.path.getsize(model_tar_file) * 1e-6) + "MB")

##########################################
# complete
##########################################
print("Success!")
