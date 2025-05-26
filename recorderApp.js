//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream; 						//stream from getUserMedia()
var rec; 							//Recorder.js object
var input; 							//MediaStreamAudioSourceNode we'll be recording

// shim for AudioContext when it's not avb. 
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext //audio context to help us record

var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");
var pauseButton = document.getElementById("pauseButton");

//add events to those 2 buttons
// recordButton.addEventListener("click", startRecording);
// stopButton.addEventListener("click", stopRecording);
// pauseButton.addEventListener("click", pauseRecording);

recordButton.addEventListener("click", changeRecordingState);

var submitButton = document.getElementById("submitAssignment");

submitButton.addEventListener("click", submitRecording);

function submitRecording() {


}

function changeRecordingState() {
	if (typeof rec == 'undefined') {
		startRecording()

	}
	else if (rec.recording) {
		stopRecording()
	}
	else {
		clearRecording()
	}
}

function unClearRecording() {
	var resultsDiv = document.getElementById("results");
	resultsDiv.style.display = "block";

	var tempImg = document.getElementById("startDiv");
	tempImg.style.display = "none";

	submitButton.style.display = "block"

	recordButton.innerText = "Clear Recording"

	plotImage = document.getElementById("pitchesPlot")
	plotImage.src = "https://domis.blue:644/pitchesPlotFull" + userId + ".png?t=" + new Date().getTime();
	
	plotImage = document.getElementById("pitchesPlot2")
	plotImage.src = "https://domis.blue:644/plotPartial" + userId + ".png?t=" + new Date().getTime();
	
	plotImage = document.getElementById("pitchesPlot3")
	plotImage.src = "https://domis.blue:644/plotFull" + userId + ".png?t=" + new Date().getTime();

	prevButton.style.display="none"
	rec = new Recorder(input,{numChannels:1})
}

function clearRecording() {
	rec = undefined
	recordButton.innerText = "Start Recording"
	var tempImg = document.getElementById("startDiv");
	tempImg.style.display = "block";

	var resultsDiv = document.getElementById("results");
	resultsDiv.style.display = "none";

	submitButton.style.display = "none";

	loadingImage = document.getElementById("startImage")
	loadingImage.src = loadingImage.code;


	
	
}
function startRecording() {
	console.log("recordButton clicked");
	recordButton.innerText = "Stop Recording"

	/*
		Simple constraints object, for more advanced audio features see
		https://addpipe.com/blog/audio-constraints-getusermedia/
	*/
    
    var constraints = { audio: true, video:false }

 	/*
    	Disable the record button until we get a success or fail from getUserMedia() 
	*/

	// recordButton.disabled = true;
	// stopButton.disabled = false;
	// pauseButton.disabled = false

	/*
    	We're using the standard promise based getUserMedia() 
    	https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
	*/

	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
		console.log("getUserMedia() success, stream created, initializing Recorder.js ...");

		/*
			create an audio context after getUserMedia is called
			sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
			the sampleRate defaults to the one set in your OS for your playback device

		*/
		audioContext = new AudioContext();

		//update the format 
		// document.getElementById("formats").innerHTML="Format: 1 channel pcm @ "+audioContext.sampleRate/1000+"kHz"

		/*  assign to gumStream for later use  */
		gumStream = stream;
		
		/* use the stream */
		input = audioContext.createMediaStreamSource(stream);

		/* 
			Create the Recorder object and configure to record mono sound (1 channel)
			Recording 2 channels  will double the file size
		*/
		rec = new Recorder(input,{numChannels:1})


		//start the recording process
		rec.record()

		console.log("Recording started");

	}).catch(function(err) {
	  	//enable the record button if getUserMedia() fails
    	recordButton.disabled = false;
    	stopButton.disabled = true;
    	pauseButton.disabled = true
	});
}

function pauseRecording(){
	console.log("pauseButton clicked rec.recording=",rec.recording );
	if (rec.recording){
		//pause
		rec.stop();
		pauseButton.innerHTML="Resume";
	}else{
		//resume
		rec.record()
		pauseButton.innerHTML="Pause";

	}
}

function stopRecording() {
	console.log("stopButton clicked");

	recordButton.innerText = "Please Wait..."

	// //disable the stop button, enable the record too allow for new recordings
	// stopButton.disabled = true;
	// recordButton.disabled = false;
	// pauseButton.disabled = true;

	// //reset button just in case the recording is stopped while paused
	// pauseButton.innerHTML="Pause";
	
	//tell the recorder to stop the recording
	rec.stop();

	//stop microphone access
	gumStream.getAudioTracks()[0].stop();

	//create the wav blob and pass it on to createDownloadLink
	rec.exportWAV(uploadToSocket);
	// rec.exportWAV(createDownloadLink);
}

function readWAVasBase64(file) {
	return new Promise((resolve, reject) => {
	  const reader = new FileReader();
  
	  reader.onload = (e) => {
		resolve(e.target.result.split(',')[1]); // Extract the Base64 part
	  };
  
	  reader.onerror = reject;
  
	  reader.readAsDataURL(file); 
	});
  }

function uploadToSocket(blob) {

    var reader = new FileReader();

	loadingImage = document.getElementById("startImage")
	loadingImage.src = "https://domis.blue:644/loading.png";

    reader.readAsDataURL(blob); 
    reader.onloadend = function() {
        var base64data = reader.result;
        socket.emit("Recording Submit", {
			'stringVal': base64data.substring(22),
			'senderId': userId
		});
    }
}

function createDownloadLink(blob) {
	
	var url = URL.createObjectURL(blob);
	var au = document.createElement('audio');
	var li = document.createElement('li');
	var link = document.createElement('a');

	//name of .wav file to use during upload and download (without extendion)
	var filename = new Date().toISOString();

	//add controls to the <audio> element
	au.controls = true;
	au.src = url;

	//save to disk link
	link.href = url;
	link.download = filename+".wav"; //download forces the browser to donwload the file using the  filename
	link.innerHTML = "Save to disk";

	//add the new audio element to li
	li.appendChild(au);
	
	//add the filename to the li
	li.appendChild(document.createTextNode(filename+".wav "))

	//add the save to disk link to li
	li.appendChild(link);
	
	//upload link
	var upload = document.createElement('a');
	upload.href="#";
	upload.innerHTML = "Upload";
	upload.addEventListener("click", function(event){
		  var xhr=new XMLHttpRequest();
		  xhr.onload=function(e) {
		      if(this.readyState === 4) {
		          console.log("Server returned: ",e.target.responseText);
		      }
		  };
		  var fd=new FormData();
		  fd.append("audio_data",blob, filename);
		  xhr.open("POST","upload.php",true);
		  xhr.send(fd);
	})
	li.appendChild(document.createTextNode (" "))//add a space in between
	li.appendChild(upload)//add the upload link to li

	//add the li element to the ol
	recordingsList.appendChild(li);
}

