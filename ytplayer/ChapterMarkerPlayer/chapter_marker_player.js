/*
 Copyright 2012 Google Inc. All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

// BEGIN_INCLUDE(namespace)
window.ChapterMarkerPlayer = {
  // Inserts a new YouTube iframe player and chapter markers as a child of an
  // existing HTML element on a page.
  insert: function(params) {
// END_INCLUDE(namespace)
// BEGIN_INCLUDE(validation1)
    if (!('videoId' in params)) {
      throw 'The "videoId" parameter must be set to the YouTube video id to be embedded.';
    }

    if (!('chapters' in params)) {
      throw 'The "chapters" parameter must be set to the mapping of times to chapter titles.';
    }
// END_INCLUDE(validation1)
// BEGIN_INCLUDE(time_sort)
    var times = [];
    for (var time in params.chapters) {
      if (params.chapters.hasOwnProperty(time)) {
        times.push(time);
      }
    }
    // The times are treated as strings, but we want them sorted numerically.
    // This custom sort function will take care of that.
    times.sort(function(a, b) {
      return a - b;
    });
// END_INCLUDE(time_sort)
    // Default to a 400px wide player and chapter marker section.
    var width = params.width || 400;

    if ('YT' in window && 'Player' in window.YT) {
      // If the iframe player API is already available, proceed to loading the player using the API.
      insertPlayerAndAddChapterMarkers(params);
    } else {
      // Load the API, and add a callback to the queue to load the player once the API is available.
      if (!('onYouTubePlayerAPIReady' in window)) {
// BEGIN_INCLUDE(invoke_callbacks)
        window.onYouTubePlayerAPIReady = function() {
          for (var i = 0; i < window.ChapterMarkerPlayer.onYouTubePlayerAPIReadyCallbacks.length; i++) {
            window.ChapterMarkerPlayer.onYouTubePlayerAPIReadyCallbacks[i]();
          }
        };
// END_INCLUDE(invoke_callbacks)
// BEGIN_INCLUDE(load_api)
        // Dynamic <script> tag insertion will effectively load the iframe Player API on demand.
        // We only want to do this once, so it's protected by the
        // !('onYouTubePlayerAPIReady' in window) check.
        var scriptTag = document.createElement('script');
        scriptTag.src = '//www.youtube.com/player_api';
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(scriptTag, firstScriptTag);
// END_INCLUDE(load_api)
      }
// BEGIN_INCLUDE(queue_callbacks)
      // Gracefully handle the situation where multiple ChapterMarkerPlayer.insert() calls are made
      // before the YT.Player API is loaded by queueing up the functions which insert the player
      // and chapter markers on the page. They'll be executed when onYouTubePlayerAPIReady() is
      // invoked by the YT.Player API.
      window.ChapterMarkerPlayer.onYouTubePlayerAPIReadyCallbacks.push(function() {
        insertPlayerAndAddChapterMarkers(params);
      });
// END_INCLUDE(queue_callbacks)
    }

// BEGIN_INCLUDE(load_player)
    // Calls the YT.Player constructor with the appropriate options to add the iframe player
    // instance to a parent element.
    // This is a private method that isn't exposed via the ChapterMarkerPlayer namespace.
    var initializePlayer = function(containerElement, params) {
      var playerContainer = document.createElement('div');
      containerElement.appendChild(playerContainer);

      // Attempt to use any custom player options that were passed in via params.playerOptions.
      // Fall back to reasonable defaults as needed.
      var playerOptions = params.playerOptions || {};
      return new YT.Player(playerContainer, {
        // Maintain a 16:9 aspect ratio for the player based on the width passed in via params.
        // Override can be done via params.playerOptions if needed
        height: playerOptions.height || width * 9 / 16 + 30,
        width: playerOptions.width || width,
        playerVars: playerOptions.playerVars || { autohide: 1 },
        videoId: params.videoId,
        events: {
          onReady: playerOptions.onReady,
          onStateChange: playerOptions.onStateChange,
          onPlaybackQualityChange: playerOptions.onPlaybackQualityChange,
          onError: playerOptions.onError
        }
      });
    }
// END_INCLUDE(load_player)

// BEGIN_INCLUDE(add_chapter_markers)
    // Adds a sorted list of chapters below the player. Each chapter has a onclick handler that
    // calls the iframe player API to seek to a specific timestamp in the video.
    // This is a private method that isn't exposed via the ChapterMarkerPlayer namespace.
    var addChapterMarkers = function(containerElement, player) {
      var listContainerElement = document.createElement('ol');
      listContainerElement.setAttribute('class', 'chapter-list');
      listContainerElement.setAttribute('style', 'width: ' + width + 'px');
      containerElement.appendChild(listContainerElement);

      for (var i = 0; i < times.length; i++) {
        var time = times[i];
        var chapterTitle = params.chapters[time];

        var liElement = document.createElement('li');
        liElement.setAttribute('data-time', time);
        liElement.textContent = formatTimestamp(time) + ': ' + chapterTitle;
        liElement.onclick = function() {
          // 'this' will refer to the element that was clicked.
          player.seekTo(this.getAttribute('data-time'));
        };
        listContainerElement.appendChild(liElement);
      }
    }
// END_INCLUDE(add_chapter_markers)

    // Convenience method to call both initializePlayer and addChapterMarkers.
    // This is a private method that isn't exposed via the ChapterMarkerPlayer namespace.
    var insertPlayerAndAddChapterMarkers = function(params) {
// BEGIN_INCLUDE(validation2)
      var containerElement = document.getElementById(params.container);
      if (!containerElement) {
        throw 'The "container" parameter must be set to the id of a existing HTML element.';
      }
// END_INCLUDE(validation2)

      var player = initializePlayer(containerElement, params);
      addChapterMarkers(containerElement, player);
    };

// BEGIN_INCLUDE(format_timestamp)
    var formatTimestamp = function(timestamp) {
      var hours = Math.floor(timestamp / 3600);
      var minutes = Math.floor((timestamp - (hours * 3600)) / 60);
      var seconds = timestamp % 60;

      var formattedTimestamp = (seconds < 10 ? '0' : '') + seconds + 's';
      if (minutes > 0) {
        formattedTimestamp = (minutes < 10 ? '0' : '') + minutes + 'm' + formattedTimestamp;
      }
      if (hours > 0) {
        formattedTimestamp = hours + 'h' + formattedTimestamp;
      }

      return formattedTimestamp;
    };
// END_INCLUDE(format_timestamp)
  },
// BEGIN_INCLUDE(callback_array)
  // This is used to keep track of the callback functions that need to be invoked when the iframe
  // API has been loaded. It avoids a race condition that would lead to issues if multiple
  // ChapterMarkerPlayer.insert() calls are made before the API is available.
  onYouTubePlayerAPIReadyCallbacks: []
// END_INCLUDE(callback_array)
}