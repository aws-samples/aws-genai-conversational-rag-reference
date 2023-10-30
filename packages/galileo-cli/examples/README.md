# Galileo CLI document uploader

The document uploader is an example tool to enable document uploads into a deployed
Galielo system.

This feature is available under the `galileo-cli document` topic (see `galileo-cli document --help`).

## Content preparation

Before using the uploader, you need to prepare your content for upload.

The following steps are required:

* if you want to upload files, they must be in **plain text** format (`.txt`)
* you need to provide a `metadata.json` which meets the included [schema requirements](../src/lib/document/metadata.schema.json)

Check out the examples provided, additionally here is an example with comments:

```jsonc
// file: metadata.json
{
  // the root directory that contains all your files
  // if there are no files used, this can be empty string ""
  "rootDir": "./",

  // metadata object containing key-value pairs, that will be applied to every document that is uploaded
  "metadata": {
    "domain": "my-domain", // domain must be set
    "appliesTo": "every-file-uploaded" // additional key-value pairs are optional
  },

  // documents to upload
  "documents": {
    // option 1: the key is a file path _relative to_ the `rootDir`
    "relative/path/my-filename.txt": {
      // key-value pairs that will be applied only to this document
      "metadata": {
        "key1": "value1"
      }
    },
    // option 2: the key is a unique identifier (no file used)
    "MyCSV-Line1": {
      // if no local file used, `pageContent` must be provided
      "pageContent": "content",

      // key-value pairs that will be applied only to this document
      "metadata": {
        "key1": "value1"
      }
    },
  }
}
```

## Example external modules to produce metadata required for Galileo CLI uploader

This feature will be added later.
