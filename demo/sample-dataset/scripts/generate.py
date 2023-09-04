import os
import shutil
import zipfile
import requests
import json
from typing import Dict, TypedDict

DIR = "./generated"
SOURCE_ZIP_NAME = "raw_cases[cases_39155]"
SOURCE_DIR = os.path.join(DIR, "source")
SOURCE_CASE_ZIP = os.path.join(SOURCE_DIR, f"{SOURCE_ZIP_NAME}.zip")
PROCESSED_DIR = os.path.join(DIR, "processed")
PROCESSED_CASES = os.path.join(PROCESSED_DIR, "cases")
PROCESSED_MAP_TXT = os.path.join(PROCESSED_DIR, "Map.txt")
ASSETS_DIR = os.path.join(DIR, "assets")
GET_TIMEOUT = 10800 # three hour timeout

print("----------------------------------------------")
print("Building corpus dataset - SigmaLaw - Large Legal Text Corpus and Word Embeddings")

print("----------------------------------------------")

class DatasetMetadata(TypedDict):
    Domain: str
    Collection: str
    OriginalSource: str
    OriginalSourceUrl: str
    Example: str

class CategoryMetadata(TypedDict):
    Category: str
    CategoryId: str
    OriginalLocation: str
    AssetKeyPrefix: str

class AssetMetadata(DatasetMetadata, CategoryMetadata):
    pass

DEFAULT_METADATA = DatasetMetadata(
    Domain="Legal",
    Collection="casefiles",
    OriginalSource="OSF: SigmaLaw - Large Legal Text Corpus and Word Embeddings",
    OriginalSourceUrl="https://osf.io/qvg8s/files/osfstorage",
    Example="True"
)

TCategoryMap = Dict[str, str]

def parseCategories(map_txt_path: str) -> TCategoryMap:
    # Read category mapping
    mapping: TCategoryMap = {}
    with open(map_txt_path) as f:
        for line in f.readlines():
            parts = line.split("->")
            category_id = parts[0].strip()
            category_name = parts[1].strip()
            mapping[category_id] = category_name
    return mapping

if not os.path.isdir(ASSETS_DIR):
    os.makedirs(SOURCE_DIR, exist_ok=True)
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    os.makedirs(ASSETS_DIR, exist_ok=True)

    if not os.path.isfile(SOURCE_CASE_ZIP):
        print(f"[Start] Downloading {SOURCE_CASE_ZIP} ...")
        response = requests.get("https://osf.io/download/w3paz/", allow_redirects=True, timeout=GET_TIMEOUT)
        with open(SOURCE_CASE_ZIP, "wb") as file:
            file.write(response.content)
        print(f"[Complete] Downloaded {SOURCE_CASE_ZIP}")

    if not os.path.isfile(PROCESSED_MAP_TXT):
        print(f"[Start] Downloading {PROCESSED_MAP_TXT} ...")
        response = requests.get("https://osf.io/download/khpwd/", allow_redirects=True, timeout=GET_TIMEOUT)
        with open(PROCESSED_MAP_TXT, "wb") as file:
            file.write(response.content)
        print(f"[Complete] Downloaded {PROCESSED_MAP_TXT}")

    categories: TCategoryMap = parseCategories(PROCESSED_MAP_TXT)

    if not os.path.isdir(PROCESSED_CASES):
        print(f"[Start] Unzipping {SOURCE_CASE_ZIP} -> {SOURCE_DIR} ...")
        with zipfile.ZipFile(SOURCE_CASE_ZIP, "r") as zip_ref:
            zip_ref.extractall(SOURCE_DIR)
        shutil.move(os.path.join(SOURCE_DIR, SOURCE_ZIP_NAME), PROCESSED_CASES)
        print(f"[Complete] Unzipped {SOURCE_CASE_ZIP} -> {SOURCE_DIR}")

    print(f"[Start] Zipping processed assets to {ASSETS_DIR} ...")
    os.chdir(PROCESSED_DIR)

    dir_path = "./cases"
    for subdir in os.listdir(dir_path):
        subdir_path = os.path.join(dir_path, subdir)
        if os.path.isdir(subdir_path):
            categoryId = subdir
            metadata = AssetMetadata(
                **DEFAULT_METADATA,
                CategoryId=categoryId,
                Category=categories[categoryId],
                OriginalLocation=f"https://osf.io/8mjcy#preprocessed_cases[cases_29404]/{categoryId}",
                AssetKeyPrefix=f"/cases/{categoryId}/"
            )

            metadata_file = os.path.join("..", "assets", f"category-{categoryId}.zip.metadata")
            with open(metadata_file, "w") as file:
                json.dump(metadata, file, indent=2)

            zip_file = os.path.join("..", "assets", f"category-{categoryId}.zip")
            zip_dir = os.path.join("cases", subdir)

            with zipfile.ZipFile(zip_file, "w", zipfile.ZIP_DEFLATED) as zip_ref:
                for root, dirs, files in os.walk(zip_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arc_name = os.path.relpath(file_path, start=zip_dir)
                        zip_ref.write(file_path, arc_name)

    os.chdir("..")
    print(f"[Complete] Zipped all assets to {ASSETS_DIR}")
else:
    print("Already cached, nothing to build - delete the ASSETS_DIR to rebuild, and DIR to redownload and build from scratch")

print(f"Successfully built corpus dataset > {ASSETS_DIR}")
print("----------------------------------------------")
