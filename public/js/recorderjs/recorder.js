/*License (MIT)

Copyright © 2013 Matt Diamond

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated 
documentation files (the "Software"), to deal in the Software without restriction, including without limitation 
the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and 
to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of 
the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO 
THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
DEALINGS IN THE SOFTWARE.
*/

(function(window){

  var WORKER_PATH = '../js/recorderjs/recorderWorker.js';

  var Recorder = function(source, cfg){
    var config = cfg || {};
    var bufferLen = config.bufferLen || 4096;
    this.context = source.context;
    if(!this.context.createScriptProcessor){
       this.node = this.context.createJavaScriptNode(bufferLen, 2, 2);
    } else {
       this.node = this.context.createScriptProcessor(bufferLen, 2, 2);
    }
   
    var worker = new Worker(config.workerPath || WORKER_PATH);
    worker.postMessage({
      command: 'init',
      config: {
        sampleRate: this.context.sampleRate
      }
    });
    var recording = false,
      currCallback;

    this.node.onaudioprocess = function(e){
      if (!recording) return;
      worker.postMessage({
        command: 'record',
        buffer: [
          e.inputBuffer.getChannelData(0),
          e.inputBuffer.getChannelData(1)
        ]
      });
    }

    this.configure = function(cfg){
      for (var prop in cfg){
        if (cfg.hasOwnProperty(prop)){
          config[prop] = cfg[prop];
        }
      }
    }

    this.record = function(){
      recording = true;
    }

    this.stop = function(){
      recording = false;
    }

    this.clear = function(){
      worker.postMessage({ command: 'clear' });
    }

    this.getBuffers = function(cb) {
      currCallback = cb || config.callback;
      worker.postMessage({ command: 'getBuffers' })
    }

    this.exportWAV = function(cb, type){
      console.log('calling exportWAV')
      currCallback = cb || config.callback;
      type = type || config.type || 'audio/wav';
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({
        command: 'exportWAV',
        type: type
      });
    }
  
    this.exportMP3 = function(cb, type) {
      console.log('calling exportMP3')
      currCallback = cb || config.callback;
      type = type || config.type || 'audio/mpeg';
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({
        command: 'exportMP3',
        type: type
      });
    }

    this.exportMonoWAV = function(cb, type){
      currCallback = cb || config.callback;
      type = type || config.type || 'audio/wav';
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({
        command: 'exportMonoWAV',
        type: type
      });
    }

    worker.onmessage = function(e){
      var blob = e.data;
      currCallback(blob);
    }

    source.connect(this.node);
    this.node.connect(this.context.destination);   // if the script node is not connected to an output the "onaudioprocess" event is not triggered in chrome.
  };

            function makeXMLHttpRequest(url, data, callback) {
                var request = new XMLHttpRequest();
                request.onreadystatechange = function() {
                    if (request.readyState == 4 && request.status == 200) {
                        if(request.responseText === 'success') {
                            callback('upload-ended');
                            return;
                        }

                        document.querySelector('.header').parentNode.style = 'text-align: left; color: red; padding: 5px 10px;';
                        document.querySelector('.header').parentNode.innerHTML = request.responseText;
                    }
                };

                request.upload.onloadstart = function() {
                    callback('Upload started...');
                };

                request.upload.onprogress = function(event) {
                    callback('Upload Progress ' + Math.round(event.loaded / event.total * 100) + "%");
                };

                request.upload.onload = function() {
                    callback('progress-about-to-end');
                };

                request.upload.onload = function() {
                    callback('Getting File URL..');
                };

                request.upload.onerror = function(error) {
                    callback('Failed to upload to server');
                };

                request.upload.onabort = function(error) {
                    callback('Upload aborted.');
                };

                token = document.querySelector('meta[name="csrf-token"]').content;

                request.open('POST', url);
                request.setRequestHeader('X-CSRF-TOKEN', token);
                request.send(data);
            }

  Recorder.setupDownload = function(blob, filename){
    var url = (window.URL || window.webkitURL).createObjectURL(blob);
    var link = document.getElementById("save");
    link.href = url;
    link.download = filename || 'output.wav';
  }

  Recorder.setupPhpPost  = function(blob, filename, callback){
    var d = new Date();
    var filename = (d.getTime()).toString() + ".wav";
    console.log('Setting up Php Post');
    filename = "RecordRTC-" + user_id + "-" + filename;
    var formData = new FormData();
    formData.append('audio' + '-filename', filename);
    formData.append('audio' + '-blob', blob);
    makeXMLHttpRequest('/recordings', formData, function(progress) {
        if (progress !== 'upload-ended') {
            callback(progress)
            return;
        }

        callback('ended');

    });
    // var request = new XMLHttpRequest();

    // request.open('POST', '/save.php');
    // request.send(formData);
    console.log('PHP post submitted');
    var savebutton = document.getElementById("save");
    savebutton.style.opacity="0.25";
    // var url = (window.URL || window.webkitURL).createObjectURL(blob);
    // var link = document.getElementById("save");
    // link.href = url;
    // link.download = filename || 'output.wav';
  }

  window.Recorder = Recorder;

})(window);
