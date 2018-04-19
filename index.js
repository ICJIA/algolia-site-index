require("dotenv").config();
let _ = require("lodash");
let jsonfile = require("jsonfile");
let wtj = require("website-to-json");
let trim = require("trim");
let fs = require("fs");
let parser = require("xml2json");
let algoliaIndex = [];
let algoliasearch = require("algoliasearch");
let crypto = require("crypto");

// For local testing:
// let path = require("path");
// let xmlPath = path.join(__dirname, "sitemap.xml");
// let res = fs.readFileSync(xmlPath);

// Get Sitemap from URL
let request = require("sync-request");
let res = request("GET", process.env.SITEMAP_URL);
let xml = res.getBody().toString("utf8");
let myJson = parser.toJson(xml);
let urls = JSON.parse(myJson)["urlset"].url;

// Get current json of Algolia objects
let algoliaOldContent;
try {
  algoliaOldContent = jsonfile.readFileSync("./algolia.search.json");
  console.log("Old content objects fetched.");
} catch (e) {
  console.log("File does not exist");
}

let arrayOfUrls = urls.map(url => {
  return url.loc;
});

let num = arrayOfUrls.length;

function get(url) {
  // create Algolia objectID based on hash of page url
  let objectID = crypto
    .createHash("md5")
    .update(url)
    .digest("hex");
  return wtj.extractUrl(url, {
    // create the page object for Algolia
    fields: ["data"],
    parse: function($) {
      return {
        title: $("meta[name='title' i]").attr("content") || "title undefined",
        description: $("meta[name='description' i]").attr("content"),
        keywords: $("meta[name='keywords' i]").attr("content") || "undefined",
        url: url,
        body: $("#page-content")
          .text()
          .substring(0, 2500),
        objectID: objectID
      };
    }
  });
}

arrayOfUrls.map(async function(url) {
  await get(url).then(function(res) {
    num--;
    algoliaIndex.push(res.data);
    if (num === 0) {
      // Finished generating
      setSearchObjects(algoliaIndex);
    }
  });
});

function setSearchObjects(objects) {
  // Send pages to Algolia
  let client = algoliasearch(
    process.env.ALGOLIA_APP_ID,
    process.env.ALGOLIA_ADMIN_API_KEY
  );

  let index = client.initIndex(process.env.ALGOLIA_INDEX);
  index.addObjects(objects, function(err, algoliaNewContent) {
    // save current pages
    jsonfile.writeFileSync("./algolia.search.json", algoliaNewContent);

    // detect deletions
    let oldArr = algoliaOldContent["objectIDs"];
    let newArr = algoliaNewContent["objectIDs"];
    let objectsToDelete = _.differenceWith(oldArr, newArr, _.isEqual);

    if (objectsToDelete.length) {
      console.log("Delete: ", objectsToDelete);
      index.deleteObjects(objectsToDelete, function(err, res) {
        if (err) throw err;
        console.log("Successfully deleted: ", res);
      });
    }
  });
}
