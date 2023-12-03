# User management via the CLI

The CLI enables you to quickly setup testbeds for a select number of users. With the user management feature, you can:

* Create a user
* Create multiple users from a `.csv` file
* Delete a user

## Create users

The CLI will directly create users in the userpool of your choice. You just need to provide the `username` and the `email address` of the new user. Their temporary password will be sent via email.

```sh
pnpm run galileo-cli cognito create-user
```

### Bulk create users

If you want to create multiple users, you can create a `.csv` file as follows:

```csv
username,email,group
user1,user1@company.com,Administrators
user2,user2@company.com,Administrators
```

Then run

```sh
pnpm run galileo-cli cognito bulk-create-users
```

## Delete users

The CLI allows admins to delete users from the userpool. You just need to provide the `username`.

```sh
pnpm run galileo-cli cognito delete-user
```
