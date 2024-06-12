# User guide

!!! info "Work in progress"

    This page is work in progress. More content coming soon.

## Setting up Galileo

## User signup

If you've been following along, when we deployed the the galileo application initially, we created an **admin** user.

The following steps will guide you through creating another user. The next command is _optional_ and can be skipped if you only want to use an Admin user. Your temporary password to log into the system will be in your email.

### Creating a new user (Optional)

To use the Galileo application, we need to create a new application user.

Application users can either be created manually in the application userpool or using the Galileo Cli. We'll go through creating a user in the Cli.

Open a terminal in the Galileo directory then type the following:

```bash
pnpm run galileo-cli cognito create-user
```

You will then be asked a number of questions to create a new user for the application, please fill them in truthfully.

![Cli Create User](/static/images/cli-create-user.png)

### Email verification

You should receive an email containing your temporary password. Please wait up to 2 minutes if you haven't received it yet and check your junk/spam folder. It should look like this:

![Temporary password email](/static/images/temporary-password-email.png)

### Password reset

Go back to the login page and enter the username you chose during the the questioare and the temporary password. You will now be asked to set up a new password and MFA. Complete the steps until you can access the application

![Password Reset](/static/images/password-reset.png)
![MFA Setup](/static/images/mfa-setup.png)

You should now be brought to the main Galileo page.

![Galileo chat](/static/images/galileo-chat.png)
