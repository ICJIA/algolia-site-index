var wtj = require("website-to-json");
wtj
  .extractData("https://cjcc.netlify.com", {
    fields: ["data"],
    parse: function($) {
      return {
        keywords: $("meta[name='keywords' i]").attr("content"),
        title: $("title").text(),
        body: $("#page-content").text(),
        url: url.replace(/.*\/\/[^\/]*/, "")
      };
    }
  })
  .then(function(res) {
    console.log(JSON.stringify(res, null, 2));
  });
