/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
export const DKR_ECR_REGION = {
  "af-south-1": "626614931356",
  "ap-east-1": "871362719292",
  "ap-northeast-1": "763104351884",
  "ap-northeast-2": "763104351884",
  "ap-northeast-3": "364406365360",
  "ap-south-1": "763104351884",
  "ap-southeast-1": "763104351884",
  "ap-southeast-2": "763104351884",
  "ca-central-1": "763104351884",
  "cn-north-1": "727897471807",
  "cn-northwest-1": "727897471807",
  "eu-central-1": "763104351884",
  "eu-north-1": "763104351884",
  "eu-south-1": "692866216735",
  "eu-west-1": "763104351884",
  "eu-west-2": "763104351884",
  "eu-west-3": "763104351884",
  "me-south-1": "217643126080",
  "sa-east-1": "763104351884",
  "us-east-1": "763104351884",
  "us-east-2": "763104351884",
  "us-gov-west-1": "442386744353",
  "us-iso-east-1": "886529160074",
  "us-west-1": "763104351884",
  "us-west-2": "763104351884",
} as const;

export function isSupportedRegion(
  region: string
): region is keyof typeof DKR_ECR_REGION {
  return region in DKR_ECR_REGION;
}

export function getImageUriRepository(region: string, repoId: string): string {
  if (isSupportedRegion(region)) {
    return `${DKR_ECR_REGION[region]}.dkr.ecr.${region}.amazonaws.com/${repoId}`;
  } else {
    throw new Error(`Region ${region} is not mapped`);
  }
}

export function isGpuInstance(instanceType: string): boolean {
  return ["p", "g"].includes(instanceType.split(".")[1][0].toLowerCase());
}

/**
 * Get the number of GPUs for a given instance type.
 * This is very basic and only support small set of known instances.
 * - g5
 * - p4d
 */
export function numGpuFromInstanceType(
  instanceType: string,
  defaultValue: number = 1
): number {
  if (isGpuInstance(instanceType)) {
    instanceType = instanceType.toLowerCase();
    const [family, size] = instanceType.split(".");
    switch (family) {
      case "g5": {
        switch (size) {
          case "12xlarge":
          case "24xlarge":
            return 4;
          case "48xlarge":
            return 8;
        }
        break;
      }
      case "p4d":
      case "p4de": {
        switch (size) {
          case "24xlarge":
            return 8;
        }
        break;
      }
    }
  }

  return defaultValue;
}
