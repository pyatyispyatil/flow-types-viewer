const http = require('http');
const fs = require('fs');
const path = require('path');
const port = process.argv[2] || 3000;

const requestHandler = (request, response) => {
  const [fullUrl, url, file] = request.url.match(/^(.*\/)(.*?)$/) || [];

  try {
    const data = fs.readFileSync(path.resolve(__dirname, file ? file : 'index.html'));

    response.end(data);
  } catch (err) {
    response.writeHead(404);
    response.end();
  }
};

const server = http.createServer(requestHandler);

server.listen(port, () => {
  console.log(`server is listening on ${port}`)
});
