var videoId = 'iEMHLtWDUjo';
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/player_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
// Define the video ID and player variables

var player;

// When the YouTube API is ready, create the player
function onYouTubeIframeAPIReady() {
player = new YT.Player('player', {
height: '360',
width: '640',
videoId: videoId,
        origin:"*",
events: {
  'onReady': onPlayerReady
}
});
}

// When the player is ready, add the click event listener to the button
function onPlayerReady(event) {
var button = document.getElementById('button');
button.addEventListener('click', function() {
var currentTime = player.getCurrentTime();
var formattedTime = formatTime(currentTime);
alert('Current timestamp: ' + formattedTime);
});
}

// Function to format the timestamp into the format of hh:mm:ss
function formatTime(time) {
var hours = Math.floor(time / 3600);
var minutes = Math.floor((time - (hours * 3600)) / 60);
var seconds = Math.floor(time - (hours * 3600) - (minutes * 60));

hours = hours < 10 ? "0" + hours : hours;
minutes = minutes < 10 ? "0" + minutes : minutes;
seconds = seconds < 10 ? "0" + seconds : seconds;

return hours + ":" + minutes + ":" + seconds;
}



function createButtons() {
const numSpeakers = document.getElementById('numSpeakers').value;
let buttonsHtml = '';
for (let i = 1; i <= numSpeakers; i++) {
  buttonsHtml += `
    <div>
      <label for="speakers${i}">Speaker ${i} Name:</label>
      <input type="text" id="speakers${i}" name="speakers${i}">
      <button onclick="getTimestamp(${i}, document.getElementById('speakers${i}').value)">Timestamp</button>
      <button onclick="getQuestionTimestamp(${i}, document.getElementById('speakers${i}').value)">Question</button>
    </div>
    <hr>
  `;
}
document.getElementById('buttons').innerHTML = buttonsHtml;
document.getElementById('numSpeakers').disabled = true;

// Add event listeners to update the current time for each timestamp button
// const video = document.getElementById('video-player');
// const timestampButtons = document.querySelectorAll('.timestamp-button');
// timestampButtons.forEach(button => {
//   button.addEventListener('click', () => {
//     var currentTime = player.getCurrentTime();
//     var formattedTime = formatTime(currentTime);
//     // const currentTime = video.currentTime.toFixed(0); // Get the current time in seconds
//     // const timestamp = currentTime;
//     const videoId = button.getAttribute('data-video-id'); // Get the video ID from the data attribute of the button
//     const speakerNumber = button.getAttribute('data-speaker');
//     const speakerName = button.getAttribute('data-speaker-name');
//     const filename = `${videoId}-${speakerName}`;
//     const timestampFolder = 'speakerT.S';

//     // Convert the timestamp to a human-readable format
//     // const convertedTimestamp = new Date(timestamp * 1000).toISOString();
//     // formatTime(timestamp);
//     // Create a new file to store the timestamp data if it does not exist
//     createTimestampsFile(filename, timestampFolder);

//     // Read existing timestamp data from the file
//     const data = fs.readFileSync(`./timestamps/${timestampFolder}/${filename}.json`, 'utf-8');
//     const timestamps = JSON.parse(data);

//     // Add the new timestamp to the data array
//     timestamps.push(formattedTime);

//     // Write the updated timestamp data to the file
//     fs.writeFileSync(`./timestamps/${timestampFolder}/${filename}.json`, JSON.stringify(timestamps));

//     // Log a message to indicate success
//     console.log(`New timestamp ${formattedTime} added for ${speakerName} in video ${videoId}.`);

//     // Clear the timestamp data attribute of the button
//     button.setAttribute('data-timestamp', '');

// });
// });
}

function disableButton(btnId) {
document.getElementById(btnId).disabled = true;
document.getElementById(btnId).style.background = 'grey';
}


function getQuestionTimestamp(speakerNumber, speakerName) {
var currentTime = player.getCurrentTime();
var formattedTime = formatTime(currentTime);

console.log(`Speaker ${speakerNumber} question timestamp: ${formattedTime}`);

fetch(`/api/question-timestamps/${videoId}/${speakerName}`, {

method: 'POST',
headers: {
'Content-Type': 'application/json'
},
body: JSON.stringify({ formattedTime })

}

)


.then(response => response.json())
.then(data => console.log(data.formattedTime))
.catch(error => console.error(error)); 
console.log(response) ;
                          
}




function getTimestamp(speakerNumber, speakerName) {
var currentTime = player.getCurrentTime();
var formattedTime = formatTime(currentTime);    
// const timestamp = Date.now();
console.log(`Speaker ${speakerNumber} timestamp: ${formattedTime}`);
// Send the timestamp to the server to be saved
fetch(`/api/timestamps/${videoId}/${speakerName}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ formattedTime })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error(error));
}
