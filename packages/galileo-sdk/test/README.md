# Galileo SDK Testing

## Unit Tests

The unit tests are all run automatically during test, and build commands.

Unit tests end with `.test.ts` or `.spec.ts`, and can be either located in this test folder
or in the src folder to colocate.

## Integ Tests

Integration tests are not run automatically, and must be triggered locally with respective env setup against the integration points.

Integration tests should end with `.integ.ts`, so they do not get treated as unit tests.

See the `.vscode/launch.json` launcher for bedrock for example of testing integration tests.
