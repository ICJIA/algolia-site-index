# Algolia Site Indexer

Creates an Algolia index for a website based on a `sitemap.xml` file.

Note: Algolia's required `objectID` is an MD5 hash of each page's URL.

After fetching the metadata for each page, the app then checks for page deletions since the last update.

If deletion(s) are detected, the app removes the deleted objects from the Algolia index.

## Requirements

A `sitemap.xml` file.

## Configuration

* Rename `.env-sample` to `.env` and embed your Algolia keys.
* Edit `config.json` to reflect the sites you want to index.

## Run

```bash
$ node .
```

## TODO:

* Improve CLI for multiple sites
