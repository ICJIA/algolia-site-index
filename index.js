let siteName = "cjcc";

require("dotenv").config();
let _ = require("lodash");
let jsonfile = require("jsonfile");
let wtj = require("website-to-json");
let trim = require("trim");
let fs = require("fs");
let algoliaIndex = [];
let parser = require("xml2json");
let algoliasearch = require("algoliasearch");
let crypto = require("crypto");
let logger = require("./utils/logger").createLogger();
let previouslyIndexed;

// For local testing:
// let path = require("path");
// let xmlPath = path.join(__dirname, "sitemap.xml");
// let res = fs.readFileSync(xmlPath);

// Get current json of Algolia objects
let config, sitemap, appIndex, urlBase, bodyContentId, titleReplacement;
try {
  config = jsonfile.readFileSync("./config.json");
  logger.info(`config.json fetched`);
  appIndex = config[siteName].index;
  sitemap = config[siteName].sitemap;
  urlBase = config[siteName].urlBase;
  titleReplacement = config[siteName].titleReplacement || "";
  bodyContentId = config[siteName].bodyContentId || "#content";
} catch (e) {
  logger.error("Config.json error.");
  process.exit(1);
}

// console.log("bodyContentId: ", bodyContentId);

// Get Sitemap from URL
let request = require("sync-request");
let res = request("GET", sitemap);
let xml = res.getBody().toString("utf8");
let myJson = parser.toJson(xml);
let urls = JSON.parse(myJson)["urlset"].url;

// Get current json of Algolia objects
let algoliaOldContent;
try {
  algoliaOldContent = jsonfile.readFileSync(`./sites/${appIndex}.json`);
  logger.info(`${appIndex}.json fetched`);
  previouslyIndexed = true;
} catch (e) {
  logger.error(`${appIndex}.json does not exist`);
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
  console.log("Url: ", url);
  return wtj.extractUrl(url, {
    // create the page object for Algolia
    fields: ["data"],
    parse: function($) {
      return {
        keywords: $("meta[name='keywords' i]").attr("content"),
        title: $("title")
          .text()
          .replace(titleReplacement, ""),
        body: $("#page-content").text(),
        description: $("meta[name='description' i]").attr("content"),
        url: url.replace(/.*\/\/[^\/]*/, ""),
        fullUrl: url,
        objectID: objectID
      };
    }
  });
}

arrayOfUrls.map(async function(url) {
  await get(url).then(function(res) {
    num--;
    algoliaIndex.push(res.data);
    //console.log(res.data);
    if (num === 0) {
      // Finished generating
      logger.info(`Finished querying URLs`);
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

  let index = client.initIndex(`${appIndex}`);
  index.addObjects(objects, function(err, content) {
    console.log("Error: ", err);
    //detect deletions only if previously indexed
    if (previouslyIndexed) {
      let oldArr = algoliaOldContent["objectIDs"];
      let newArr = objects.map(idx => {
        return idx.objectID;
      });
      let objectsToDelete = _.differenceWith(oldArr, newArr, _.isEqual);
      //   //save current pages
      jsonfile.writeFileSync(`./sites/${appIndex}.json`, newArr);
      logger.info(`${appIndex}.json written`);
      if (objectsToDelete.length) {
        console.log("Delete: ", objectsToDelete);
        index.deleteObjects(objectsToDelete, function(err, res) {
          if (err) throw err;
          logger.info(`Successfully deleted: ${objectsToDelete}`);
        });
      } else {
        logger.info("No deletions detected");
      }
    }
    logger.info("Indexing complete.");
  });
}
