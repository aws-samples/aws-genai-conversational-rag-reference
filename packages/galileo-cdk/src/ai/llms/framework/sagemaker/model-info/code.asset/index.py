import json
from sagemaker_uri import get_sagemaker_uris

def handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))

    props: dict = event['ResourceProperties']

    if event['RequestType'] != 'Delete':
      data = get_sagemaker_uris(
         framework=props['Framework'],
         id=props['ModelId'],
         region=props['ModelRegion'],
         instance_type=props.get('ModelInstanceType', None),
         scope=props.get('Scope', 'inference'),
         version=props.get('Version', '*'),
         image_uri_only=props.get('ImageUriOnly', False),
      )
    else:
      data = {}

    output = {
        'Data': data
    }
    print("Output: " + json.dumps(output))

    return output
