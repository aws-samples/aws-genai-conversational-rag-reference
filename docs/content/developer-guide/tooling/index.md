# Infra Tooling

During deployment, you can choose to enable "tooling" in dev stage. If you choose to deploy it, the following constructs will be created:

* Sagemaker Studio
* PgAdmin

## PgAdmin

PgAdmin construct will enable you to browse the RDS cluster with [PgAdmin](https://www.pgadmin.org/).

### How to access

> Note: By default, in CDK we do NOT add any public access to PgAdmin. In order to access it from your computer, you need to enable access to it.

> Note: All necessary information is recorded in the `Outputs` tab of `Dev-Galileo-ToolingNestedStack` stack in the `CloudFormation` service page in your AWS Console.

#### 1. Enable access through PgAdmin Security Group

1. Copy the `PgAdminSecurityGroup` `SecurityGroupId`
2. Open `Security Groups` in your AWS Console (`EC2` service > `Security Groups` menu)
3. Edit the Security Group's `Inbound Rules`:
    * Click `Edit inbound rules` button
    * Click `Add rule` button
    * Fill out `Type=HTTP`, `IP=<your IP address/VPN CIDR block>`, `Description=Temporary PgAdmin access`
    * Example:
      * `1.2.3.4/32` - replace with your IP address
      * `1.2.3.4/24` - replace with your VPN CIDR block
    * Click `Save rules`

#### 2. Acquire credentials for PgAdmin

1. **Email**: the _Administrator Email_ you provided during deployment
2. **Password**: a new `Secret` has been created, which you can retrieve
    * In `Secrets Manager`, open `PgAdminPass` secret
    * Click `Retrieve secret value` button and copy the password
3. **URL**: Open the website from `CloudFormation`'s `PgAdminALBDomain` output
4. Login to PgAdmin with the credentials

#### 3. Access the database

For all credentials needed to open a connection to your vector store, use the Secret called `VectorStoreClusterSecret` in your `Secrets Manager` AWS Console page.

1. **Name**: e.g.: `MyVectorStore`
2. **Host name/address**: secret > `host`
3. **Port**: secret > `port`
4. **Username**: secret >`username`
5. **Password**: secret > `password`
6. Save the connection and connect.
