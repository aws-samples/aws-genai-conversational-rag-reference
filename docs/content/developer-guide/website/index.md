# Website

The website front end provided as part of Galileo is based on the [Cloudscape React TS Website](https://aws.github.io/aws-pdk/developer_guides/cloudscape-react-ts-website/index.html) construct, which is part of the [AWS Project Development Kit (PDK)](https://aws.github.io/aws-pdk/).

Configuration values used by the deployed website (such as the Cognito User Pool Id or the region) are generated at deployment time and stored in a file called "runtime-config.json", which you will need if you want to host a local instance of the website during development.

To do this, obtain a copy of the deployed configuration file from the root of the URL of the CloudFront distribution deployed by Galileo (`https://[root_cloudfront_url]/runtime-config.json`) and copy it to the `demo/website/public` directory before running `pnpm run dev` from the `demo/website` directory.

```sh
cd /path/to/ckeckedout/project/demo/website
curl -o public/runtime-config.json https://[root_cloudfront_url]/runtime-config.json
pnpm run dev
```
