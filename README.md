# Algolia Site Indexer

Creates an Algolia index of pages for a website.

The Algolia `objectID` is a hash of the page URL.

This app saves the Algolia response object (which contains the updated ObjectID)

## Requirements

`sitemap.xml` in live site.

## Configuration

* Rename `.env-sample` to `.env` and embed your Algolia keys.
* Edit `config.json` to reflect the sites you want to index.

## Run

```bash
$ node .
```

## TODO:

* CLI mode.
