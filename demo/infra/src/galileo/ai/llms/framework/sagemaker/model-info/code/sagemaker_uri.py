from typing import Optional, Literal, TypedDict
import sagemaker
from sagemaker import image_uris, model_uris, script_uris, instance_types
import sagemaker.jumpstart.artifacts as jumpstart

session = sagemaker.Session()

Framework = Literal["JumpStart"]

class Response(TypedDict):
  ModelId: str
  ModelRegion: str
  Version: str
  Framework: Optional[Framework]
  Scope: Optional[str]
  ModelInstanceType: Optional[str]
  ModelUri: Optional[str]
  ModelImageUri: Optional[str]
  ModelScriptUri: Optional[str]
  ModelPackageArn: Optional[str]
  ModelBucketName: Optional[str]
  ModeBucketKey: Optional[str]

def get_sagemaker_uris(*,
                       id: str,
                       instance_type: Optional[str],
                       region: str,
                       scope: str = "inference",
                       version: str = "*",
                       framework: Optional[Framework],
                       image_uri_only: Optional[bool] = False
                      ):
    if instance_type == None:
      try:
        # Retrieve the inference instance type for the specified model.
        instance_type = instance_types.retrieve_default(model_id=id, model_version=version, scope=scope)
      except:
        print("Failed to resolve instance type")

    print(f"get_sagemaker_uris: model_id={id}, version={version}, instance_type={instance_type}, region={region}, scope={scope}, framework={framework}")

    response = Response(
      ModelId=id,
      ModelRegion=region,
      Version=version,
      Scope=scope,
      Framework=framework,
      ModelInstanceType = None,
      ModelUri = None,
      ModelScriptUri = None,
      ModelPackageArn = None,
      ModelImageUri = None,
      ModelBucketName = None,
      ModeBucketKey = None,
    )

    if framework == "JumpStart":
      response["ModelUri"] = jumpstart._retrieve_model_uri(model_id=id, model_version=version, model_scope=scope, region=region)
      response["ModelImageUri"] = jumpstart._retrieve_image_uri(model_id=id, model_version=version, image_scope=scope, region=region)
      response["ModelPackageArn"] = jumpstart._retrieve_model_package_arn(model_id=id, model_version=version, scope=scope, region=region)
      response["ModelPackageArn"] = jumpstart._retrieve_script_uri(model_id=id, model_version=version, script_scope=scope, region=region)
    else:
      # Retrieve the inference docker container uri.
      response["ModelImageUri"] = image_uris.retrieve(region=region,
                                            framework=None,
                                            model_id=id,
                                            model_version=version,
                                            image_scope=scope,
                                            instance_type=instance_type)

      if image_uri_only != True:
        # Retrieve the model uri.
        response["ModelUri"] = model_uris.retrieve(model_id=id,
                                              model_version=version,
                                              model_scope=scope)

        # Retrieve the model uri. (source)
        response["ModelScriptUri"] = script_uris.retrieve(model_id=id,
                                                model_version=version,
                                                script_scope=scope)

    if response["ModelUri"] != None:
      model_uri_parts = response["ModelUri"].split("/")
      response["ModelBucketName"] = model_uri_parts[2]
      response["ModeBucketKey"] = "/".join(model_uri_parts[3:])

    return response;
