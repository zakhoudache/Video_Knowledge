const path = require('path')
const { v4: uuidv4 } = require('uuid');

const express = require('express');
const app = express();
const { google } = require('googleapis');
const fs = require('fs');
const ejs = require('ejs');
const cors = require('cors');
const bodyParser = require('body-parser');
const questionTimestamps = {};
const multer = require('multer'); //npm install multer
const upload = multer({ dest: 'uploads/' });
const ngrok = require('ngrok');

const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "https://5000-zakhoudache-videoknowle-a19yckybohp.ws-eu97.gitpod.io/"
    // origin: "*"

  }

});


const auth = new google.auth.GoogleAuth({
  keyFile: 'propane-forge-373906-828ecc5004db.json', // Replace with the path to your keyfile
  scopes: ['https://www.googleapis.com/auth/youtube.force-ssl'],
});

const youtube = google.youtube({
  version: 'v3',
  auth: auth,
});

const Trello = require('node-trello');

const apiKey = '3da0322f390be3d7e919f662025de4ef';
const apiToken = '17f2b418824687c3313817620b19cdbed33d4d9f64e75759dd40b093dab032fd';

const trello = new Trello(apiKey, apiToken);
app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.use(cors());

  // const CONTROLLER_NAME = 'zack';
  // let controllerSocket = null;

// Serve the static files for the client-side JavaScript code
app.use(express.static(__dirname + '/public'));

// Handle client connection events
io.on('connection', function(socket) {

  console.log('A user connected');
  // Receive chat messages
  socket.on('chat message', (data) => {
    console.log('Message received: ' + data.message);

    // Broadcast the message to all clients except the sender
    socket.broadcast.emit('chat message', data);
  });
  // Emit the current player state to the client when they first connect
  socket.emit('playerStateChange', { state: getPlayerState() });

  // Listen for player state change events from the client and broadcast the state to all clients
  socket.on('playerStateChange', function(data) {
    setPlayerState(data.state);
    io.emit('playerStateChange', { state: getPlayerState() });
  });

  socket.on('message', (data) => {
    if (data.type === 'file') {
      // Broadcast the file contents to all connected clients except the sender
      socket.broadcast.emit('message', {
        type: 'file',
        content: data.content
      });
    } else if (data.type === 'file2') {
      // Broadcast the file2 contents to all connected clients except the sender
      socket.broadcast.emit('message', {
        type: 'file2',
        content: data.content
      });
    }
  });
  // Disconnect the client when they leave the page
  socket.on('disconnect', function() {
    console.log('Client disconnected');
  });

});



// Functions to get and set the player state
var playerState = 'unknown';
function getPlayerState() {
  return playerState;
}
function setPlayerState(state) {
  playerState = state;
}
// // Listen for new socket.io connections
// io.on('connection', (socket) => {
//   console.log(`User ${socket.id} connected`);

//   // Set the user's name as a query parameter
//   const name = socket.handshake.query.name;

//   // If the user's name matches the controller name, assign the socket to the controllerSocket variable
//   if (name === CONTROLLER_NAME) {
//     controllerSocket = socket;
//     console.log(`Controller ${CONTROLLER_NAME} connected`);
//   }

//   // Listen for play and pause events from the client and broadcast them to all connected sockets
//   socket.on('play', () => {
//     console.log(`Received play event from ${socket.id}`);
//     io.emit('playerStateChange', { isPlaying: true });
//   });

//   socket.on('pause', () => {
//     console.log(`Received pause event from ${socket.id}`);
//     io.emit('playerStateChange', { isPlaying: false });
//   });

//   // Listen for disconnect events and update the controllerSocket variable if necessary
//   socket.on('disconnect', () => {
//     console.log(`User ${socket.id} disconnected`);
//     if (socket === controllerSocket) {
//       controllerSocket = null;
//       console.log(`Controller ${CONTROLLER_NAME} disconnected`);
//     }
//   });
// });

// Serve static files from the public directory
app.use(express.static('public'));
app.use(express.static('public'));


// Set up EJS as the view engine
app.set('view engine', 'ejs');

app.get('/socket.io/socket.io.js', (req, res) => {
  res.sendFile(__dirname + '/node_modules/socket.io-client/dist/socket.io.js');
});
// serve socket.io client library
// app.get('/socket.io/socket.io.js', (req, res) => {
//   res.sendFile(__dirname + '/node_modules/socket.io-client/dist/socket.io.js');
// });

app.get('/', async (req, res) => {
  try {
    const videoId = "TycPQNfZOlc";
    const { data } = await youtube.videos.list({
      id: videoId,
      part: 'snippet'
    });
    const video = data.items[0];
    const title = video.snippet.title;
    const thumbnailUrl = video.snippet.thumbnails.default.url;
    // res.render('index', { videoId, title, thumbnailUrl });
    res.render('home/index', { videoId, title, thumbnailUrl });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error getting video information from YouTube API');
  }
  // res.render('home/index', { videoId, title, thumbnailUrl });
});
// app.use(express.static(__dirname + 'views/home', { "MIME type": "text/html" }));

// app.use(function(req, res, next) {
//   res.header("Access-Control-Allow-Origin", "https://f851-105-235-130-215.ngrok-free.app");
//   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//   next();
// });


// app.use(function (req, res, next) {
//   res.header("Access-Control-Allow-Origin", "https://5000-zakhoudache-videoknowle-a19yckybohp.ws-eu97.gitpod.io/");
//   // res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//   res.header('Content-Security-Policy: none')
//   res.header("ngrok-skip-browser-warning", "");
//   next();
// });

// Enable CORS for all routes
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://5000-zakhoudache-videoknowle-a19yckybohp.ws-eu97.gitpod.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
next();
});


// app.use(express.static(__dirname + 'views/home', { "MIME type": "text/html" }));
// views\index.html

// Set up a route to serve the home page

// app.get('/', (req, res) => {
//   res.render('saved-text.txt');
// });




// Set up a route to serve the video ID page
app.get('/video/:videoId', async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const { data } = await youtube.videos.list({
      id: videoId,
      part: 'snippet'
    });
    const video = data.items[0];
    const title = video.snippet.title;
    const thumbnailUrl = video.snippet.thumbnails.default.url;
    // res.render('index', { videoId, title, thumbnailUrl });
    res.render('home/index', { videoId, title, thumbnailUrl });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error getting video information from YouTube API');
  }
});

// Set up a route to get the video information from the YouTube API
app.get('/video-info/:videoId', async (req, res) => {
  const videoId = req.params.videoId;
  try {
    const { data } = await youtube.videos.list({
      id: videoId,
      part: 'snippet,player'
    });
    if (data.items && data.items.length > 0) {
      const video = data.items[0];
      res.send(`Title: ${video.snippet.title}<br>Player: ${video.player.embedHtml}`);
    } else {
      console.log(data.items);
      res.status(404).send('Video not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error getting video information from YouTube API');
  }
});

//Endpoint to store event selected from the client side in JSON file
app.post('/api/event-timestamps/:videoId/:speakerName', (req, res) => {
  const videoId = req.params.videoId;
  const speakerName = req.params.speakerName;
  const { timestamp, event } = req.body;
  console.log(req.body)
  if (!timestamp || !event) {
    res.status(400).json({ error: 'Timestamp or event is missing or invalid' });
    return;
  }
});

//Endpoint to store locattion selected from the client side in JSON file
app.post('/api/location/:location', (req, res) => {
  const videoId = req.params.videoId;
  const speakerName = req.params.speakerName;
  const { timestamp, location } = req.body;
  console.log(req.body)
  if (!timestamp || !location) {
    res.status(400).json({ error: 'Timestamp or location is missing or invalid' });
    return;
  }
});

//client side to store locattion selected javascript c


// Endpoint to store timestamp of question in JSON file
app.post('/api/question-timestamps/:videoId/:speakerName', (req, res) => {
  const videoId = req.params.videoId;
  const speakerName = req.params.speakerName;
  const { timestamp, question } = req.body;
  console.log(req.body)
  if (!timestamp || !question) {
    res.status(400).json({ error: 'Timestamp or question is missing or invalid' });
    return;
  }

  // Create timestamps file if it doesn't exist
  createTimestampsFile(`${videoId}-${speakerName}`, 'questionT.S');

  // Read JSON file
  const filename = `${videoId}-${speakerName}`;

  let data = fs.readFileSync(`./timestamps/questionT.S/${filename}.json`, 'utf8');
  let timestamps = JSON.parse(data);

  // Add new timestamp and question to speaker's array
  timestamps.push({ question, timestamp });

  // Write updated data to JSON file
  fs.writeFileSync(`./timestamps/questionT.S/${videoId}-${speakerName}.json`, JSON.stringify(timestamps));
  res.json({ timestamps });
});


app.post('/api/answer-timestamps/:videoId/:speakerName', (req, res) => {
  const videoId = req.params.videoId;
  const speakerName = req.params.speakerName;
  const { timestamp, answer } = req.body;
  console.log(req.body)
  if (!timestamp || !answer) {
    res.status(400).json({ error: 'Timestamp or question is missing or invalid' });
    return;
  }

  // Create timestamps file if it doesn't exist
  createTimestampsFile(`${videoId}-${speakerName}`, 'answerT.S');

  // Read JSON file
  const filename = `${videoId}-${speakerName}`;

  let data = fs.readFileSync(`./timestamps/answerT.S/${filename}.json`, 'utf8');
  let timestamps = JSON.parse(data);

  // Add new timestamp and question to speaker's array
  timestamps.push({ answer, timestamp });

  // Write updated data to JSON file
  fs.writeFileSync(`./timestamps/answerT.S/${videoId}-${speakerName}.json`, JSON.stringify(timestamps));
  res.json({ timestamps });
});


function formatTime(time) {
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time - hours * 3600) / 60);
  const seconds = Math.floor(time - hours * 3600 - minutes * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}


// Set up a route to get the timestamp of the current speaker
// Set up a route to save the timestamp of the current speaker
app.post('/api/timestamps/:videoId/:speaker', express.json(), (req, res) => {
  const videoId = "fAOD65t1rbI" // req.params.videoId;
  const speaker = req.params.speaker;
  const timestamp = req.body.timestamp;
  const timestampFile = `${videoId}-${speaker}`;
  console.log(timestamp);
  // Convert the timestamp to a human-readable format
  // const convertedTimestamp = new Date(timestamp * 1000).toISOString();

  // Format the timestamp as hh:mm:ss
  const formattedTimestamp = timestamp;

  // Create a new file to store the timestamp data if it does not exist
  createTimestampsFile(`${videoId}-${speaker}`, 'speakerT.S');

  // Read existing timestamp data from the file
  const filename = `./timestamps/speakerT.S/${timestampFile}.json`;
  let data = fs.readFileSync(filename, 'utf8');
  let timestamps = JSON.parse(data);

  // Check if timestamps is an array
  if (!Array.isArray(timestamps)) {
    timestamps = [];
  }

  // Add the new timestamp to the data array
  timestamps.push(formattedTimestamp);

  // Write the data array to the file
  try {
    fs.writeFileSync(filename, JSON.stringify(timestamps));
  } catch (err) {
    console.error(`Error writing timestamp data to file ${filename}: ${err.message}`);
  }

  // Return the updated timestamp data to the client
  res.json(timestamps);
});



app.post('/api/:location/:videoId/', (req, res) => {
  const videoId = req.params.videoId;
  const location = req.params.location;
  const timestamp = req.body.timestamp;
  const event = req.body.selectedEvent;
  const area = req.body.selectedArea;
  const hardware = req.body.selectedHardware;

  const timestampFile = `${videoId}-${location}`;

  console.log("Selected Location: ", location);
  console.log("Selected Event: ", event);
  console.log("Selected Area: ", area);
  console.log("Selected Hardware: ", hardware);
  console.log("Timestamp: ", timestamp);

  // Create a new file to store the timestamp data if it does not exist
  createTimestampsFile(`${videoId}-${location}`, 'eventT.S');

  // Read existing timestamp data from the file or create an empty array
  const filename = `./timestamps/eventT.S/${timestampFile}.json`;
  let timestamps = [];
  if (fs.existsSync(filename)) {
    const data = fs.readFileSync(filename, 'utf8');
    timestamps = JSON.parse(data);
  }

  // Add the new timestamp to the data array
  timestamps.push({ event, area, hardware, timestamp });

 // Write the data array to the file
  try {
    fs.writeFileSync(filename, JSON.stringify(timestamps));

    // Create a Trello card
    const cardData = {
      name: `Timestamp: ${timestamp}`,
      desc: `Event: ${event}\nArea: ${area}\nHardware: ${hardware}`,
      pos: 'top', // Change the position as needed
      idList: 'csi-tracking-tool' // Replace with the ID of your Trello list
    };

    trello.post('/1/cards', cardData, (err, card) => {
      if (err) {
        console.error('Error creating Trello card:', err);
        // Handle the error and send an appropriate response to the client
        res.status(500).json({ error: 'Error creating Trello card' });
        return;
      }

      console.log('Trello card created:', card);
      // Return the updated timestamp data to the client
      res.json(timestamps);
    });
  } catch (err) {
    console.error(`Error writing timestamp data to file ${filename}: ${err.message}`);
    res.status(500).json({ error: 'Error writing timestamp data' });
    return;
  }

  // Return the updated timestamp data to the client
  res.json(timestamps);
});



app.post('/api/create/:videoId/:speaker', (req, res) => {
  const videoId = req.params.videoId;
  const speaker = req.params.speaker;
  const timestampFile = `timestamps-${videoId}-${speaker}.json`;

  // Check if the file already exists
  if (fs.existsSync(timestampFile)) {
    res.status(409).send('File already exists');
  } else {
    try {
      // Create the file with an empty array
      fs.writeFileSync(timestampFile, '[]');
      res.send('File created successfully');
    } catch (err) {
      res.status(500).send(`Error creating file: ${err.message}`);
    }
  }
});


// handle form submission
app.post('/save-text', (req, res) => {
  const text = req.body['textarea#my-textarea'];
  console.log(text);
  saveText(text);
  res.send('Text saved successfully!');
});


///handle file upload
app.post('/upload', (req, res) => {
  const text = req.body['my-textarea'];
  const file = req.files ? req.files['textfile'] : null;
  const filePath = `./uploads/saved-text.txt`;

  if (!file) {
    return res.status(400).send('No file selected');
  }

  file.mv(filePath, (err) => {
    if (err) {
      return res.status(500).send(err);
    }
    saveText(text);
    res.send('File and text saved successfully!');
  });
});



// Set up a route to serve the video ID page
app.get('/video/RGV/:videoId', async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const { data } = await youtube.videos.list({
      id: videoId,
      part: 'snippet'
    });
    const video = data.items[0];
    const title = video.snippet.title;
    const thumbnailUrl = video.snippet.thumbnails.default.url;
    // res.render('index', { videoId, title, thumbnailUrl });
    res.render('home/index', { videoId, title, thumbnailUrl });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error getting video information from YouTube API');
  }
});


function createTimestampsFile(timestampFile, folder) {
  const timestampFolder = `./timestamps/${folder}`;

  if (!fs.existsSync(timestampFolder)) {
    fs.mkdirSync(timestampFolder, { recursive: true });
  }

  const filename = `${timestampFolder}/${timestampFile}.json`;

  if (!fs.existsSync(filename)) {
    fs.writeFileSync(filename, '[]');
  }
}


// Start the server
server.listen(5000, () => {
  console.log('Server listening on port 5000');
  io.on("cnx ", function (socket) {

    console.log("user cnctd" + socket.id)
  })
});
