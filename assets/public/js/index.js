$(document).ready(function() {

    filepicker.setKey('ABSoo9CfZQdC5cZB6dJGdz');

    var API_KEY = 'U3MVIBVCJOK2TKRBZ';
    var processedSongs = 0;
    var numSongs = 0;

    var songUrls = [];
    var songDetails = [];
    var entireBuffer = {};

    function concatSongs() {
        var curDuration = songDetails[0]['track']['duration'];
        for (var i = 1; i < songDetails.length; i++) {
            var curTrack = songDetails[i]['track'];

            for (var j = 0; j < songDetails[i]['bars'].length; j++) {
                songDetails[i]['bars'][j]['start'] += curDuration;
            }

            for (var j = 0; j < songDetails[i]['segments'].length; j++) {
                songDetails[i]['segments'][j]['start'] += curDuration;
            }

            for (var j = 0; j < songDetails[i]['beats'].length; j++) {
                songDetails[i]['beats'][j]['start'] += curDuration;
            }

            for (var j = 0; j < songDetails[i]['tatums'].length; j++) {
                songDetails[i]['tatums'][j]['start'] += curDuration;
            }

            songDetails[0]['bars'] = songDetails[0]['bars'].concat(songDetails[i]['bars']);
            songDetails[0]['segments'] = songDetails[0]['segments'].concat(songDetails[i]['segments']);
            songDetails[0]['beats'] = songDetails[0]['beats'].concat(songDetails[i]['beats']);
            songDetails[0]['tatums'] = songDetails[0]['tatums'].concat(songDetails[i]['tatums']);

            curDuration += curTrack['duration'];
        }
        entireBuffer['analysis'] = songDetails[0];
        entireBuffer.audio_summary = {};
        entireBuffer.audio_summary['duration'] = curDuration;
        concatBuffers();
    };

    var numBuffers = 0;
    var curBuffer = null;

    function concatBuffers () {
        if (numBuffers >= songUrls.length) {
            mixSong();
            return;
        }
        var request = new XMLHttpRequest();

        request.open('GET', songUrls[numBuffers], true);
        request.responseType = 'arraybuffer';

        /**
         * Appends two ArrayBuffers into a new one.
         * 
         * @param {ArrayBuffer} data The ArrayBuffer that was loaded.
         */
        function play(data) {
          //decode the loaded data
          context.decodeAudioData(data, function(buf) {
            numBuffers++;
            // Concatenate the two buffers into one.
            if (curBuffer == null) {
                curBuffer = buf;
                concatBuffers();
            }
            else {    
                curBuffer = appendBuffer(curBuffer, buf);
                concatBuffers();
            }

          });

        };

        // When the song is loaded asynchronously try to play it.
        request.onload = function() {
          play(request.response);
        }

        request.send();
    }

    $('#upload').on('click', function() {
        filepicker.pickAndStore({},{}, function(data) {
            console.log(JSON.stringify(data));

            var url = data[0]['url'];
            
            if (url) {
                songUrls.push(url);
                numSongs++;
            }
        });
    });

    $('#process').on('click', function () {
        songDetails = [];
        for (var i = 0; i < songUrls.length; i++) {
            processSong(songUrls[i]);
        }
        // while (processedSongs < numSongs) {

        // }
        //concatSongs();
    });

    var context = new webkitAudioContext();

  /**
   * Appends two ArrayBuffers into a new one.
   * 
   * @param {ArrayBuffer} buffer1 The first buffer.
   * @param {ArrayBuffer} buffer2 The second buffer.
   */
  function appendBuffer(buffer1, buffer2) {
    var numberOfChannels = Math.min( buffer1.numberOfChannels, buffer2.numberOfChannels );
    var tmp = context.createBuffer( numberOfChannels, (buffer1.length + buffer2.length), buffer1.sampleRate );
    for (var i=0; i<numberOfChannels; i++) {
      var channel = tmp.getChannelData(i);
      channel.set( buffer1.getChannelData(i), 0);
      channel.set( buffer2.getChannelData(i), buffer1.length);
    }
    return tmp;
  }

  /**
   * Loads a song
   * 
   * @param {String} url The url of the song.
   */
  function loadSongWebAudioAPI(url) {
    var request = new XMLHttpRequest();

    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    /**
     * Appends two ArrayBuffers into a new one.
     * 
     * @param {ArrayBuffer} data The ArrayBuffer that was loaded.
     */
    function play(data) {
      //decode the loaded data
      context.decodeAudioData(data, function(buf) {
        var audioSource = context.createBufferSource();
        audioSource.connect(context.destination);

        // Concatenate the two buffers into one.
        audioSource.buffer = appendBuffer(buf, buf);
        audioSource.noteOn(0);
        audioSource.playbackRate.value = 1;
      });

    };

    // When the song is loaded asynchronously try to play it.
    request.onload = function() {
      play(request.response);
    }

    request.send();
  }


  // loadSongWebAudioAPI('https://www.filepicker.io/api/file/hM44TTmTQMeLMGelTA5w');


  function mixSong() {
      var remixer = createJRemixer(context, $);
      entireBuffer['buffer'] = curBuffer;
      remixer.remixTrack(entireBuffer, function(state, t, percent) {
            track = t;
            if (state == 1) {
                info("Calculating pathways through the song ...");
                setTimeout( function() { readyToPlay(t); }, 10);
            } else if (state == 0) {
                if (percent >= 99) {
                    info("Calculating pathways through the song ...");
                } else {
                    info( percent  + "% of track loaded ");
                }
            } else {
                info('Trouble  ' + t.status);
                setDisplayMode(false);
            }
        });
  };

  function processSong (url) {
        $.post('/postSong', {url: url}, function (data) {
            songDetails.push(data);
            processedSongs++;
            if (processedSongs == numSongs) {
                concatSongs();
            }
        });
    };
});
