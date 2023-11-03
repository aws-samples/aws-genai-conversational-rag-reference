import os
import json
import shutil
import subprocess #nosec
from pathlib import Path
import sys
from huggingface_hub import snapshot_download

__TESTING__ = os.environ.get("PYTHON_ENV", "production") == "test"

CODEBUILD_BUILD_ID=os.environ["CODEBUILD_BUILD_ID"]
CODEBUILD_SRC_DIR=os.environ["CODEBUILD_SRC_DIR"]

ARTIFACT_BASE_DIR=os.environ["ARTIFACT_BASE_DIR"]
MODEL_TAR_FILENAME="model.tar.gz"

CUSTOM_ASSET_CODEBUILD_SRC_DIR=os.environ.get("CODEBUILD_SRC_DIR_CustomAsset")
SNAPSHOT_DOWNLOAD_OPTIONS=os.environ.get("SNAPSHOT_DOWNLOAD_OPTIONS")

model_ids = os.environ["HF_MODEL_ID"]
models_list = list(map(lambda val: val.strip(), model_ids.split(",")))
models_num = len(models_list)

WORKDIR=Path(os.path.join(CODEBUILD_SRC_DIR, "workdir"))
WORKDIR.mkdir(exist_ok=True, parents=True)
os.environ["WORKDIR"] = str(WORKDIR)
OUTDIR=Path(os.path.join(CODEBUILD_SRC_DIR, ARTIFACT_BASE_DIR))
OUTDIR.mkdir(exist_ok=True, parents=True)

model_tar_file=Path(os.path.join(OUTDIR, MODEL_TAR_FILENAME))

print("WORKDIR:", WORKDIR)
print("OUTDIR:", OUTDIR)
print("model_tar_file:", model_tar_file)

for model_id in models_list:
    if models_num == 1 and os.getenv("FORCE_MODEL_FOLDERS") != "True":
        model_folder = WORKDIR
    else:
        model_folder = Path(WORKDIR, model_id)
        if model_folder.exists():
            shutil.rmtree(str(model_folder))
        model_folder.mkdir(exist_ok=True, parents=True)

    print(f"Model folder: {model_folder}", flush=True)
    print(
        f"Downloading model snapshot for: {model_id} into {model_folder}",
        flush=True,
    )

    ##########################################
    # download snapshot
    ##########################################
    print("downloading snapshot...")
    download_options = {}
    if SNAPSHOT_DOWNLOAD_OPTIONS != None:
        download_options = json.loads(SNAPSHOT_DOWNLOAD_OPTIONS)
    snapshot_download(
      model_id,
      **download_options,
      local_dir=str(model_folder),
      local_dir_use_symlinks=True,
    )

    print(f"Model snapshot downloaded to: {model_folder}", flush=True)

# custom script, expected to contain /code folder or other overrides so is placed in root of out
if CUSTOM_ASSET_CODEBUILD_SRC_DIR != None:
    custom_asset_dir = Path(CUSTOM_ASSET_CODEBUILD_SRC_DIR)
    print("CustomAsset:", CUSTOM_ASSET_CODEBUILD_SRC_DIR, os.listdir(CUSTOM_ASSET_CODEBUILD_SRC_DIR))
    print("Copying custom asset files into local dir")
    shutil.copytree(str(custom_asset_dir), str(WORKDIR), dirs_exist_ok=True)

    # TODO: need to check if requirements are automatically loaded by container, I see them provided in examples
    # but don't see where they get loaded or reference to them. This is placeholder for where that should happen if needed
    # # install custom requirements if provided
    # custom_requirements = Path(WORKDIR, "requirements.txt")
    # if custom_requirements.exists:
    #   subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", str(custom_requirements)])


##########################################
# tar the model
##########################################
print("create tarbar...")
subprocess.run(f"tar -chf {model_tar_file} --use-compress-program=pigz *", shell=True, check=True, cwd=str(WORKDIR)) #nosec
print(f"{MODEL_TAR_FILENAME} created at ${model_tar_file}")
print("Model Tar Size:" + str(os.path.getsize(model_tar_file) * 1e-6) + "MB")

##########################################
# complete
##########################################
print("Success!")
