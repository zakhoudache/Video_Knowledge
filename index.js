const PDFDocument = require('pdfkit');

const path = require('path');
const formsFilePath = path.join(__dirname, 'views/home/forms.json');
const forms = require(formsFilePath);
const { v4: uuidv4 } = require('uuid');
const express = require('express');
const app = express();
const { google } = require('googleapis');
const fs = require('fs');
const ejs = require('ejs');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const ngrok = require('ngrok');
const url_ngrok = "https://fc81-105-235-128-215.ngrok-free.app";
const fetch = require('isomorphic-fetch');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

const server = require('http').createServer(app);
const mongoose = require('mongoose');
// const cors = require('cors');

const io = require('socket.io')(server, {
  cors: {
    origin: "*"
  }
});

const auth = new google.auth.GoogleAuth({
  keyFile: 'propane-forge-373906-828ecc5004db.json',
  scopes: ['https://www.googleapis.com/auth/youtube.force-ssl'],
});

const youtube = google.youtube({
  version: 'v3',
  auth: auth,
});

app.use(bodyParser.urlencoded({ extended: false }));
// Enable CORS middleware
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
app.use(bodyParser.json());
app.use(cors());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static('public'));

// Configure session store
const store = new MongoDBStore({
  uri: 'mongodb+srv://zhoudache:alcahyd2023@cluster0.ughawgz.mongodb.net',
  collection: 'sessions',
});

// Catch errors in session store
store.on('error', (error) => {
  console.error('Session store error:', error);
});

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: store,
}));

mongoose.connect('mongodb+srv://zhoudache:alcahyd2023@cluster0.ughawgz.mongodb.net/users?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('Connected to MongoDB Atlas');
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB Atlas:', error);
  });

  
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/api/getSessionUsername', (req, res) => {
  const username = req.session.user; // Assuming the session stores the username

  if (username) {
    return res.json({ username });
  } else {
    return res.status(401).json({ error: 'Session username not found' });
  }
});
app.get('/main', async (req, res) => {
  try {
    const videoId = req.query.videoId || "TycPQNfZOlc"; // Read videoId from query parameters or use default value
    const { data } = await youtube.videos.list({
      id: videoId,
      part: 'snippet'
    });
    const video = data.items[0];
    const title = video.snippet.title;
    const thumbnailUrl = video.snippet.thumbnails.default.url;
    const selectedEquipment = req.session.selectedEquipment; // Retrieve the selected equipment from the session or any other source

    if (req.session.user) {
      let formToRender;

      // Determine the equipment type
      const equipment = req.session.user.equipment;

      // Choose the form based on the equipment type
      if (equipment === 'SPMT') {
        formToRender = forms.form1;
      } else if (equipment === 'cranes') {
        formToRender = forms.form2;
      } else {
        // Set a default form or handle other cases
        formToRender = {}; // Set an empty form or default form object
      }

      // Send the rendered template as the response
      return res.render('home/index', { videoId, title, thumbnailUrl, selectedEquipment, formToRender });
    } else {
      // Redirect to the root URL if the user is not logged in
      return res.redirect('/');
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error getting video information from YouTube API');
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username }).maxTimeMS(20000); // Increase the timeout to 20 seconds (20000ms)

    if (user && user.password === password) {
      req.session.user = username;
      io.emit('login', username);
      res.redirect('/main'); // Redirect to '/main'
    } else {
      return res.status(401).send('Invalid username or password');
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send('An error occurred');
  }
});

async function getSessionUsername() {
  try {
    const response = await fetch(`${url_ngrok}/api/getSessionUsername`, {
      credentials: 'include' // Include the session cookie in the request
    });
    const data = await response.json();
    const username = data.username;
    console.log('Session username:', username);
    return username;
  } catch (error) {
    console.error('Error retrieving session username:', error);
    return null;
  }
}

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  equipment: {
    type: String,
    required: true
  },
  dynamicFields: {
    type: mongoose.Schema.Types.Mixed
  }
});


// Create a user model
const User = mongoose.model('User', userSchema);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Handle registration form submission
app.post('/register', async (req, res) => {
  try {
    const formObject = req.body;
    const selectedEquipment = formObject.equipment;

    // Extract the dynamic fields from the form
    const dynamicFields = {};
    for (const key in formObject) {
      if (key !== 'username' && key !== 'password' && key !== 'equipment') {
        dynamicFields[key] = formObject[key];
      }
    }

    // Create a new user object with the form data
    const user = new User({
      username: formObject.username,
      password: formObject.password,
      equipment: selectedEquipment,
      dynamicFields: dynamicFields
    });

    // Save the user object to the database
    await user.save();

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred during registration');
  }
});


const testSchema = new mongoose.Schema({
  field1: String,
  field2: String,
});


// Create a new model for the test collection
const Test = mongoose.model('Test', testSchema, 'testCollection');

// Example usage: Create a new document in the test collection
app.post('/createTest', async (req, res) => {
  const { field1, field2 } = req.body;

  try {
    const newTest = new Test({ field1, field2 });
    await newTest.save();

    return res.status(201).send('Test document created successfully');
  } catch (error) {
    console.error(error);
    return res.status(500).send('An error occurred');
  }
});

const chatMessages = [];

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('login', (username) => {
    console.log(`User ${username} connected`);
    console.log('A user connected:', socket.id);
    socket.username = username;
  
    // Emit the chat messages to the client after login
    socket.emit('chat messages', chatMessages.map((message) => message.message));
  });
  
  socket.on('chat message', (message) => {
    console.log('Message received:', message);
    const messageObject = {
      username: socket.username,
      message: message,
    };
    chatMessages.push(messageObject);
    io.emit('chat message', { text: message });
  });
  
  socket.emit('playerStateChange', { state: getPlayerState() });
  
  socket.on('playerStateChange', (data) => {
    setPlayerState(data.state);
    io.emit('playerStateChange', { state: getPlayerState() });
  });
  
  socket.on('message', (data) => {
    if (data.type === 'file') {
      socket.broadcast.emit('message', {
        type: 'file',
        content: data.content,
      });
    } else if (data.type === 'file2') {
      socket.broadcast.emit('message', {
        type: 'file2',
        content: data.content,
      });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

let playerState = 'unknown';

function getPlayerState() {
  return playerState;
}

function setPlayerState(state) {
  playerState = state;
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/views/home/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '/views/home/register.html'));
});



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



// Server-side code (e.g., using Express.js) to handle the POST request and save the data
app.post('/api/:username', async (req, res) => {
  try {
    const formData = req.body;

    // Save the form data to a JSON file or perform any desired data storage operation

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred during data saving');
  }
});


// app.post('/api/:location/:videoId/', (req, res) => {
 
app.post('/api/:location/:videoId/:username', async (req, res) => {
  const sessionId = req.session.user;

  const username = await getSessionUsername(sessionId);
  const userN = req.params.username;
  // const username = req.body.username; // Replace with the actual method to retrieve the username

  const videoId = req.params.videoId;
  const location = req.params.location;
  const timestamp = req.body.timestamp;
  const reference = req.body.reference;
  const payload = req.body.payload;
  const destination = req.body.destination;
  const timedate = req.body.timedate;

  const timestampFile = `${username}-${videoId}-${location}`;

  console.log("Selected Location: ", location);
  console.log("Reference: ", reference);
  console.log("Payload: ", payload);
  console.log("Destination: ", destination);
  console.log("Timestamp: ", timestamp);
  console.log("Username: ", userN);
  console.log("Timedate: ", timedate);

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
  timestamps.push({ timestamp, username, reference, payload, destination,timedate });

  // Write the data array to the file
  try {
    fs.writeFileSync(filename, JSON.stringify(timestamps));
  } catch (err) {
    console.error(`Error writing timestamp data to file ${filename}: ${err.message}`);
  }

  // Create a new PDF document
  const doc = new PDFDocument();

  // Set document properties and metadata
  doc.info.Title = 'Timestamp Data';
  doc.info.Author = 'Your Name';

  // Set document layout options
  doc.page.margins = { top: 50, bottom: 50, left: 50, right: 50 };
  doc.font('Helvetica');

  // Add content to the PDF document
  doc
    .fontSize(18)
    .text('Timestamp Data', { align: 'center', underline: true, marginBottom: 20 });

  doc
    .fontSize(14)
    .text(`Username: ${username}`, { marginBottom: 10 })
    .text(`Selected Location: ${location}`, { marginBottom: 10 })
    .text(`Reference: ${reference}`, { marginBottom: 10 })
    .text(`Payload: ${payload}`, { marginBottom: 10 })
    .text(`Destination: ${destination}`, { marginBottom: 10 })
    .text(`Timestamp: ${timestamp}`, { marginBottom: 10 })
    .text(`Timedate: ${timedate}`, { marginBottom: 10 });
  // End the PDF document
  doc.end();

  const pdfFilename = `./uploads/${timestampFile}.pdf`;

  // Stream the PDF document to a file
  doc.pipe(fs.createWriteStream(pdfFilename))
    .on('finish', () => {
      console.log(`Generated PDF file: ${pdfFilename}`);

      // Create a Trello card using the obtained data
      createTrelloCard({ timestamp, username, reference, payload, destination, timedate })
        .then((card) => {
          console.log('Created Trello card:', card);
          // Return the updated timestamp data, the Trello card ID, and the PDF filename to the client
          res.json({ timestamps, cardId: card.id, pdfFilename });
        })
        .catch((error) => {
          console.error('Error creating Trello card:', error);
          res.status(500).send('Error creating Trello card');
        });
    });
});
// });

// // Handle the POST request to create a Trello card
// app.post('/api/create-card', (req, res) => {
//   const { selectedLocation, reference, payload, timedate, destination } = req.body;

//  // Replace 'YOUR_TRELLO_API_KEY', 'YOUR_TRELLO_TOKEN', and 'YOUR_TRELLO_LIST_ID' with actual values
//     const apiKey = '4fc89b8181ea1f30a5fc92f8daca14ec';
//     const token = 'ATTA4f229d807eed93ba4726326314d741720c8fd786b8a847748f61f3093ee43b26B45018B8';
//     const boardId = '6463c7588f026b3ba5bf9008';

//     const cardData = {
//       name: 'New Card',
//       desc: JSON.stringify(data),
//       idBoard: boardId,
//       pos: 'top',
//       key: apiKey,
//       token: token
//     };

// });

function createTrelloCard(data) {
  return new Promise((resolve, reject) => {
    // Replace 'YOUR_TRELLO_API_KEY', 'YOUR_TRELLO_TOKEN', and 'YOUR_TRELLO_LIST_ID' with actual values
    const apiKey = '4fc89b8181ea1f30a5fc92f8daca14ec';
    const token = 'ATTA4f229d807eed93ba4726326314d741720c8fd786b8a847748f61f3093ee43b26B45018B8';
    const boardId = '6463c7588f026b3ba5bf9008';

    const cardData = {
      name: 'New Card',
      desc: JSON.stringify(data),
      idBoard: boardId,
      pos: 'top',
      key: apiKey,
      token: token
    };

    // Send a POST request to the Trello API to create a card
    fetch(`https://api.trello.com/1/cards?key=${apiKey}&token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cardData)
      
    })
    
      .then((response) => response.json())
      
      .then((card) => resolve(card))
      .catch((error) => reject(error));
  });

}




// Function to create a list in Trello if it doesn't exist
async function createListIfNotExist(listName, boardId, apiKey, token) {
  // Check if the list already exists
  const response = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${token}`);
  const lists = await response.json();

  const existingList = lists.find(list => list.name === listName);
  if (existingList) {
    return existingList;
  }

  // Create a new list
  const createListResponse = await fetch(`https://api.trello.com/1/lists?key=${apiKey}&token=${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: listName,
      idBoard: boardId
    })
  });
console.log('Created Trello list:', listName);
  return createListResponse.json();

}



// Handle the POST request to create a Trello card
app.post('/api/create-card', async (req, res) => {
  const { selectedLocation, reference, payload, timedate } = req.body;

  // Retrieve the username from the session (you may need to implement this logic)
  const sessionId = req.session.user;
  const username = await getSessionUsername(sessionId);

  try {
    // Emit the form data to the server (you may need to implement this logic)
    // Replace this line with your implementation

    // Send a POST request to create a Trello list if it doesn't exist
    const createdList = await createListIfNotExist(selectedLocation, boardId, apiKey, token);

    // Create a Trello card within the list
    const createCardResponse = await fetch(`https://api.trello.com/1/cards?key=${apiKey}&token=${token}`, {

      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: reference,
        desc: `Payload: ${payload}\nTimedate: ${timedate}`,
        idList: createdList.id
      })
    });

    const createdCard = await createCardResponse.json();
    res.json(createdCard);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating Trello card');
  }
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
