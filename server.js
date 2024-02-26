const express = require("express");
const path = require("path");

const app = express();

app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', ['*']);
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.append('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.use("/srcs", express.static(path.resolve(__dirname, "front", "srcs"), 
  { extensions: ["js"] }
));

app.get("/*", (req, res) => {
  res.sendFile(path.resolve("front/srcs", "index.html"));
});


app.listen(8080, () => console.log("Server running"));
