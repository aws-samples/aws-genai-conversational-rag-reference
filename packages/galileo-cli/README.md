# GALILEO CLI

Useful tool for repeated tasks.

> Note: Currently in experimental mode: executable is registered as `galileo-cli-experimental`.

## Usage

```zsh
# usage
pnpm run galileo-cli-experimental --help

# list available commands
pnpm run galileo-cli-experimental commands
```

## Commands

### Deploy

```shell
> pnpm run galileo-cli-experimental deploy --help

Deploy Galileo into your AWS account

USAGE
  $ galileo-cli-experimental deploy [--name <value>] [--projen] [--profile <value>] [--appRegion <value>] [--llmRegion <value>] [--skipConfirmations] [--cdkCommand <value>] [--cdkRequireApproval
    <value>] [--build] [--saveExec] [--dryRun] [--replay]

FLAGS
  --appRegion=<value>           The region you want to deploy your application
  --build                       Perform build
  --cdkCommand=<value>          [default: deploy] CDK command to run
  --cdkRequireApproval=<value>  [default: never] CDK approval level
  --dryRun                      Only log commands but don't execute them
  --llmRegion=<value>           The region you want to deploy/activate your LLM
  --name=<value>                [default: Galileo] Application name
  --profile=<value>             The profile set up for your AWS CLI (associated with your AWS account)
  --projen                      Run projen to synth project
  --replay                      Replay last successful task(s) execution
  --saveExec                    Save successful task(s) execution to enable replay
  --skipConfirmations           Skip prompt confirmations (always yes)

DESCRIPTION
  Deploy Galileo into your AWS account

EXAMPLES
  $ galileo-cli-experimental deploy --profile=myProfile --appRegion=ap-southeast-1 --llmRegion=us-west-2 --build --saveExec --skipConfirmations

  $ galileo-cli-experimental deploy --dryRun

  $ galileo-cli-experimental deploy --replay --skipConfirmations
```

### Cognito create/delete user

```shell
pnpm run galileo-cli-experimental cognito create-user --help

USAGE
  $ galileo-cli-experimental cognito create-user [--profile <value>] [--region <value>] [--username <value>] [--email <value>] [--group <value>] [--skipConfirmations]

FLAGS
  --email=<value>      The email address for the new user
  --group=<value>      The user group to associate the new user with (optional)
  --profile=<value>    The profile set up for you AWS CLI (associated with your AWS account
  --region=<value>     The region you want to add your user (user pool)
  --skipConfirmations  Non-interactive mode. (You need to supply all other flags).
  --username=<value>   The username for the new user

EXAMPLES
  $ galileo-cli-experimental cognito create-user --profile=myProfile --region=ap-southeast-1

  $ galileo-cli-experimental cognito create-user --email=myUser@example.com --username=myUser

  $ galileo-cli-experimental cognito create-user --skipConfirmations --profile=myProfile --region=ap-southeast-1 --email=admin@example.com --username=admin --group=Administrators
```

```shell
> pnpm run galileo-cli-experimental cognito delete-user --help

USAGE
  $ galileo-cli-experimental cognito delete-user [--profile <value>] [--region <value>] [--username <value>] [--skipConfirmations]

FLAGS
  --profile=<value>    The profile set up for you AWS CLI (associated with your AWS account
  --region=<value>     The region you want to add your user (user pool)
  --skipConfirmations  Non-interactive mode. (You need to supply all other flags).
  --username=<value>   The username for the new user

EXAMPLES
  $ galileo-cli-experimental cognito delete-user

  $ galileo-cli-experimental cognito delete-user --skipConfirmations --profile myProfile --region ap-southeast-1 --username myUserName
```

```shell
> pnpm run galileo-cli-experimental cognito bulk-create-users --help

USAGE
  $ galileo-cli-experimental cognito bulk-create-users [--profile <value>] [--region <value>] [--group <value>] [--csvFile <value>]

FLAGS
  --csvFile=<value>  The path to the CSV file containing user information (username, email)
  --group=<value>    The user group to associate the new users with (optional)
  --profile=<value>  The profile set up for you AWS CLI (associated with your AWS account
  --region=<value>   The region you want to add your user (user pool)

EXAMPLES
  $ galileo-cli-experimental cognito bulk-create-users --profile=myProfile --region=ap-southeast-1 --csvFile /path/to/users.csv
```
