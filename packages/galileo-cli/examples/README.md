# Galileo CLI document uploader

The document uploader is an example tool to enable document uploads into a deployed
Galielo system.

This feature is available under the `galileo-cli document` topic (see `galileo-cli document --help`).

## Content preparation

Before using the uploader, you need to prepare your content for upload.

The following steps are required:

* if you want to upload files, they must be in **plain text** format (`.txt`)
* you need to provide a `metadata.json` which meets the included [schema requirements](../src/lib/document/metadata.schema.json)

### Metadata

Check out the examples provided, additionally here is an example with comments:

```jsonc
// file: metadata.json
{
  // the root directory that contains all your files
  // if there are no files used, this can be empty string ""
  // if it's not an absolute path, the relative path will be relative to CWD
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

#### Metadata with non–US-ASCII characters

We are utilizing S3's [User-defined object metadata](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingMetadata.html#UserMetadata).
In certain cases, metadata needs to be added that has non–US-ASCII characters (e.g.: metadata defined in other languages).

For this case, we define a _special metadata key_ called `json-base64`, that must have a value of a **base64-encoded string of a JSON-objet containing string-string key-value pairs**.

Example:

```jsonc
// metadata to add:
{
  "chìa khóa": "giá trị", // "key": "value" in Vietnamese
}

// document metadata:
{
  // ...
  "documents": {
    "myDocumentKey": {
      "metadata": {
        "json-base64": "eyJjaMOsYSBraMOzYSI6Imdpw6EgdHLhu4sifQ==" // Buffer.from(mySpecialCharsMetadata).toString("base64")
      }
    }
  }
}
```

During the indexing process, the base64-encoded string will be decoded and the values merged with the other provided metadata.

> Note: Out of the box, the CLI's `document uploader` will not handle this key in any special way. It is up to the developer to implement the encoding (typically in an external module that is loaded by the CLI).

## Example external modules to produce metadata required for Galileo CLI uploader

While using the `document upload` command, you will get a prompt:

`Enter the path to the metadata file or the the module that loads metadate (js/ts) (CWD: xxx):`

The uploader supports two types of inputs, which are described in the following sections.

### 1. Metadata file

You just need to pass in a path to a `metadata.json` and its content will be loaded and validated against the schema (see `Content preparation` section above)

### 2. Metadata loader module

In this case, you can implement your own way of automation. Your script will return either

* the path to a generated `metadata.json` file, or
* a `DocumentMetadata` object

#### Requirements

In your script, you need to import `DocumentMetadata` and `IMetadataProvider` from the CLI's package, and define a class named `MetadataProvider` that implements `IMetadataProvider`:

```ts
import { DocumentMetadata, IMetadataProvider } from "../../src"; // or, later: ... from "@aws-galileo/cli"

export class MetadataProvider implements IMetadataProvider {
  async getMetadata(): Promise<string | DocumentMetadata> {

    // option 1:
    const metadataFile: string = ...
    // ... here comes your implementation
    return metadataFile

    // OR
    // option 2:
    const documentMetadata: DocumentMetadata = {
      // fill out the object
      ...
    };
    return documentMetadata;
  }
}
```

For working examples, you can check [metadata-provider-object.ts](./csv-loader/metadata-provider-object.ts) and [metadata-provider-string.ts](./csv-loader/metadata-provider-string.ts).

The CLI will use the returned `metadata.json` path to load and validate the metadata, or, just take the returned `DocumentMetadata` and upload all documents defined in it.

> Note: make sure that if you're returning a `DocumentMetadata` from your script AND using file references in the `documents` object, `rootDir` is properly defined with an _**absolute path**_.
