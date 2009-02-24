/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 * Author: Jochen Hartmann <api.jhartmann@google.com>
 */

/**
 * @fileoverview Frontend to handle events and DOM manipulation for
 * YouTube activity feed application. Provides functions for fetching YouTube
 * Data API feeds using a PHP backend. JQuery is used for most of the DOM
 * manipulation and for some of it's helper functions. Thickbox, a JQuery
 * plugin is used to display embeddable videos.
 */

/**
 * Provides namespacing for the YouTube Activity Application (ytActivityApp)
 */
var ytActivityApp = {};

/**
 * The message to display if the API is not available.
 * @type String
 */
ytActivityApp.API_NOT_AVAILABLE_MESSAGE =
  'Oops! The Youtube API is currently not available. Please check the ' + 
  '<a class="logout_link" href="http://groups.google.com/group/youtube-api">' + 
  '<strong>YouTube APIs Announcement Forum</strong></a> for updates.<br />';

/**
 * The CSS classname for API not available messages
 * @type String
 */
ytActivityApp.CSS_API_NOT_AVAILABLE_CLASSNAME = 'api_not_available';

/**
 * The CSS classname for activity entry divs
 * @type String
 */
ytActivityApp.CSS_ENTRY_DIV_CLASSNAME = 'activity_entry';

/**
 * The CSS classname for video metadata
 * @type String
 */
ytActivityApp.CSS_ENTRY_METADATA_SPAN_CLASSNAME = 'video_metadata';

/**
 * The CSS classname for span that displays the authenticated users name
 * @type String
 */
ytActivityApp.CSS_ENTRY_MY_USERNAME_LINK_CLASSNAME = 'my_username_link';

/**
 * The CSS classname for the div that displays the video thumbnail
 * @type String
 */
ytActivityApp.CSS_ENTRY_THUMB_DIV_CLASSNAME = 'video_thumbnail';

/**
 * The CSS classname for the timestamp span
 * @type String
 */
ytActivityApp.CSS_ENTRY_TIMESTAMP_SPAN_CLASSNAME = 'activity_timestamp';

/**
 * The CSS classname for span that displays the username for which activity
 * is being retrieved
 * @type String
 */
ytActivityApp.CSS_ENTRY_USERNAME_LINK_CLASSNAME = 'username_link';

/**
 * The CSS id for span that displays the video id
 * @type String
 */
ytActivityApp.CSS_ENTRY_VIDEO_ID_SPAN_CLASSNAME = 'video_id';

/**
 * The CSS classname for span that displays the video metadata (view count, ...)
 * @type String
 */
ytActivityApp.CSS_ENTRY_VIDEO_METADATA_NOT_FOUND_CLASSNAME = 'metadata_not_found';

/**
 * The CSS classname for span that displays the video title
 * @type String
 */
ytActivityApp.CSS_ENTRY_VIDEO_TITLE_SPAN_CLASSNAME = 'video_title';

/**
 * The CSS classname for the list item that represents an activity entry
 * @type String
 */
ytActivityApp.CSS_FEED_LI_CLASSNAME = 'feed_item';

/**
 * The CSS classname for the div item that is displayed if no activity is found
 * @type String
 */
ytActivityApp.CSS_USER_ACTIVITY_NOT_FOUND_CLASSNAME = 'user_activity_not_found';

/**
 * The username(s) for which we are fetching activity for
 * @type String
 */
ytActivityApp.CURRENT_USERNAME = null;

/**
 * The username(s) for the currently authenticated user
 * @type String
 */
ytActivityApp.MY_USERNAME = null;

/**
 * The message to display if embedding is disabled for a video
 * @type String
 */
ytActivityApp.EMBEDDING_DISABLED_MESSAGE = 
  'Note! The owner of this video has disabled embedding. ' + 
  'If you click, you can watch the video on YouTube.com in a new tab';
  
/**
 * The CSS id of the div to write feed results into
 * @type String
 */
ytActivityApp.FEED_RESULTS_DIV = 'activity_stream';

/**
 * A constant to identify the user activity feed
 * @type Number
 */
ytActivityApp.USER_ACTIVITY_FEED = 0;

/**
 * A constant to identify the friend activity feed
 * @type Number
 */
ytActivityApp.FRIEND_ACTIVITY_FEED = 1;

/**
 * A constant to identify the feed that is currently being fetched
 * @type Number
 */
ytActivityApp.FEED_REQUESTED = ytActivityApp.USER_ACTIVITY_FEED;

/**
 * The id of the form that is used to select either activity or friend feed
 * @type String
 */
ytActivityApp.FORM_RADIO_SELECTION_ID = 'feed_type_select';

/**
 * The HTML to display in the div that is shown while a feed is being fetched
 * @type String
 */
ytActivityApp.LOADING_IMAGE_HTML = '<small>Fetching data ... </small><br />' + 
  '<img src="css/ext/loadingAnimation.gif" width="208" height="13"/>';

/**
 * The URI that a user would visit to log out
 * @type String
 */
ytActivityApp.LOGOUT_URI = 'index.php?action=logout';

/**
 * The string to display if the video title was not found
 * @type String
 */
ytActivityApp.METADATA_TITLE_NOT_FOUND = 'Video title not found';

/**
 * The string to display if the video's uploader was not found
 * @type String
 */
ytActivityApp.METADATA_UPLOADER_NOT_FOUND = 'Video Uploader not found';

/**
 * The string to display if the video's ID was not found
 * @type String
 */
ytActivityApp.METADATA_ID_NOT_FOUND = 'Video ID not found';

/**
 * The string to display if the video's view count was not found
 * @type String
 */
ytActivityApp.METADATA_VIEW_COUNT_NOT_FOUND = 'Video view count not found';

/**
 * The string to display if the video's thumbnail URL was not found
 * @type String
 */
ytActivityApp.METADATA_THUMBNAIL_URL_NOT_FOUND = 'Thumbnail url not found';

/**
 * The string to display if the video's rating values were not found
 * @type String
 */
ytActivityApp.METADATA_RATING_NOT_FOUND = 'Video rating not found';

/**
 * The string to display if the video's timestamp was not found
 * @type String
 */
ytActivityApp.METADATA_UPDATED_TS_NOT_FOUND = 'Video timestamp not found';

/**
 * The base URI that the frontend communicates with via JSON
 * @type String
 */
ytActivityApp.URI = 'index.php';

/**
 * The message to display if the video's metadata is not available in the API
 * @type String
 */
ytActivityApp.VIDEO_METADATA_NOT_AVAILABLE_MESSAGE =
  'Video metadata not available &mdash; video could have been deleted, just ' +
  'uploaded or a duplicate upload.';

/**
 * Part of the URI for a video watchpage on YouTube.com
 * @type String
 */
ytActivityApp.YOUTUBE_VIDEO_URL = 'http://www.youtube.com/watch?v=';

/**
 * The div Id to write log in and log out activity to
 * @type String
 */
ytActivityApp.USER_LOGIN_DIV = 'loginlogout';

/**
 * Standard JQuery function that gets called when the document is ready
 */
$(document).ready(function(){

  // Check the loggedIn variable that gets set in the PHP script
  if (loggedIn) {
    // Show the search and feed selection options
    $('#options').css('display','block');

    // On page reloads use the username saved in PHP's session
    if (authenticatedUsername) {
      ytActivityApp.MY_USERNAME = authenticatedUsername;
      $('#' + ytActivityApp.USER_LOGIN_DIV).html(
        'Logged in as: ' + ytActivityApp.MY_USERNAME +
        ' &mdash; <a class="logout_link" href="' +
        ytActivityApp.LOGOUT_URI + '" >log out</a>');
    } else {
      // On the first load, we need to fetch the username directly
      $.get(ytActivityApp.URI, { q: "whoami" },
        function(data){
          ytActivityApp.MY_USERNAME = data.substring(1, data.length-1);
          $('#' + ytActivityApp.USER_LOGIN_DIV).html(
            'Logged in as: ' + ytActivityApp.MY_USERNAME +
            ' &mdash; <a class="logout_link" href="' +
            ytActivityApp.LOGOUT_URI + '" >log out</a>');
        });
    }

    // Display the div to show that we are loading activity
    $('#status').html(ytActivityApp.LOADING_IMAGE_HTML);

    // Fetch a feed based on what was selected
    if (ytActivityApp.FEED_REQUESTED == ytActivityApp.USER_ACTIVITY_FEED) {
      ytActivityApp.getActivityFeed();
    } else {
      ytActivityApp.getFriendActivityFeed();
    }
  } else {
    // Not logged in
    $('#top').css({'margin-top': '150px', 'width': '100%',
      'font-weight': 'bold', 'font-size': 'x-large'});
    $('#' + ytActivityApp.USER_LOGIN_DIV).css(
      {'font-size': '200%', 'font-weight': 'bold',
      'background-color': '#F2FF7F', 'font-size': 'large',
      'padding': '15px'});
    }
});

/**
 * Switch the feed to be retrieved based on the radio button selected.
 */
ytActivityApp.switchFeedURI = function() {
  var form = document.getElementById(ytActivityApp.FORM_RADIO_SELECTION_ID);
  var selected_button = 0;
  for(i = 0; i < form.length; i++) {
    input = form[i];
    if (input.checked) {
      selected_button = i;
    }
  }
  // Check whether we are looking for user activity or friend activity
  // Set the FEED_REQUESTED variable to make decisions later when the HTML
  // is rendered.
  if (selected_button == 0) {
    ytActivityApp.FEED_REQUESTED = ytActivityApp.USER_ACTIVITY_FEED;
    ytActivityApp.getActivityFeed();
  } else if (selected_button == 1) {
    ytActivityApp.FEED_REQUESTED = ytActivityApp.FRIEND_ACTIVITY_FEED;
    ytActivityApp.getFriendActivityFeed();
  } else if (selected_button == 2) {
    // Add a message to the form
    $('#users_string_input').attr({ value: 'Enter usernames...'});
  }
}

ytActivityApp.clearUserNameForm = function() {
  $('#users_string_input').css('border-bottom', 'none').css('color', 'black');
  $('#users_string_input').attr({ value: ''});

}

/**
 * Reset the feed selection form back to fetch the activity feed (default)
 */
ytActivityApp.resetFormSelection = function() {
  ytActivityApp.FEED_REQUESTED = ytActivityApp.USER_ACTIVITY_FEED;
}

/**
 * Clean input from the user search form and dispatch a call to fetch the
 * activity feed for multiple users.
 * @param {String} usernames The raw data submitted by the form.
 */
ytActivityApp.cleanFormInputAndRequestActivityFeed = function(usernames) {
  // Return if nothing was submitted
  if ((usernames == null) || (usernames == '')) {
    $('#status').show().html('Oops! Looks like no usernames were entered ...')
      .css('color', 'red');
    return;
  }
  // Split usernames by comma and count
  var usernameArray = usernames.split(',');
  var numUsernames = usernameArray.length;
  var validUsernames = [];
  if (numUsernames > 20) {
    $('#status').show().html('Hey! You submitted more than 20 usernames, ' + 
      'please try again. A maximum of 20 usernames is supported.')
      .css('color', 'red');
    return;
  }
  for (i = 0; i < numUsernames; i++) {
    // Use jQuery's helpful trim() function to remove whitespace
    var username = $.trim(usernameArray[i]);
    // Check against illegal (non-alphanumeric) characters.
    var illegalCharacters = /[^a-zA-Z0-9]/;
    if (illegalCharacters.test(username)) {
      $('#status').show().html('Ouch! <strong>' + username +
        '</strong> is not a valid YT username! Please try again.')
        .css('color', 'red');
        return;
    } else {
      // Collect valid usernames
      validUsernames.push(username);
    }
  }
  var validUsernamesString = validUsernames.join(',');
  ytActivityApp.CURRENT_USERNAME = validUsernamesString;
  ytActivityApp.getActivityFeed(validUsernamesString);
}

/**
 * Fetch a YouTube API activity feed for one or multiple users
 * @param {String} username The username(s) to fetch activity for
 */
ytActivityApp.getActivityFeed = function(username) {
  if (loggedIn == true) {
    $('#status').show();
    ytActivityApp.resetFormSelection();
    var form = document.getElementById(ytActivityApp.FORM_RADIO_SELECTION_ID);
    
    // Fetch activity for a specific user
    if (username) {
      ytActivityApp.CURRENT_USERNAME = username;
      form[0].checked = false;
      form[1].checked = false;
      form[2].checked = true;
      $('#users_string_input').attr({ value: username});
      $.getJSON(ytActivityApp.URI, { q: "userfeed", who: username },
        ytActivityApp.processJSON);
    } else {
      // Fetch activity for the currently authenticated user
      ytActivityApp.CURRENT_USERNAME = ytActivityApp.MY_USERNAME;
      form[0].checked = true;
      form[1].checked = false;
      form[2].checked = false;
      $('#users_string_input').attr({ value: ''});
      $.getJSON(ytActivityApp.URI, { q: "userfeed" },
        ytActivityApp.processJSON);
    }
  }
}

/**
 * Fetch a YouTube API friend activity feed for the currently authenticated
 * user
 */
ytActivityApp.getFriendActivityFeed = function() {
  if (loggedIn == true) {
    $('#status').show();
    $('#users_string_input').attr({ value: ''});
    $.getJSON(ytActivityApp.URI, { q: "friendfeed" },ytActivityApp.processJSON);
  }
}

/**
 * Using the lightbox plugin, display a SWF for an embedded video.
 * @param {String} swfUrl The URL for the video swf that is to be displayed
 * @param {String} videoTitle The title of the video that is to be displayed
 */
ytActivityApp.displayMovie = function(swfUrl, videoTitle) {
  return function() {
    // Write the div that the swf will be rendered to into our hidden div
    $("#videobox").html('<div id="ytapiplayer"></div>');
    // Set parameters
    var params = { allowScriptAccess: "always" };
    // Use swfObject to render a standard YouTube player
    swfobject.embedSWF(swfUrl, "ytapiplayer", "425", "356", "8", null, null,
      params);
    // Prepare a link that will be clicked to play the video
    $("#play_video").attr('title', videoTitle);
    // Auto play the video
    $("#play_video").click();
    // Destroy the player on close
    $("#TB_window").bind('unload', ytActivityApp.clearVideoBox);
   }
}

/**
 * Remove the swf html from the hidden video box div element.
 */
ytActivityApp.clearVideoBox = function() {
  $("#videobox").html('');
}

/**
 * Process the JSON that contains the data from either the activity or the
 * friend activity feed. This function is responsible to render the bulk of
 * the HTML for this application.
 * @param {String} data The JSON encoded data
 */
ytActivityApp.processJSON = function(data) {
  // If the API is unavailable, display a message and return
  if (data == 'SERVER_ERROR') {
    $('#' + ytActivityApp.FEED_RESULTS_DIV).html(
      '<span class="' + ytActivityApp.CSS_API_NOT_AVAILABLE_CLASSNAME +
      '">' + ytActivityApp.API_NOT_AVAILABLE_MESSAGE + '</span><br />');
    $('#status').hide();
    return;
  }

  // If there are no result, display a message and return.
  if (data.length < 1) {
    $('#' + ytActivityApp.FEED_RESULTS_DIV).html(
      '<span class="' +
      ytActivityApp.CSS_USER_ACTIVITY_NOT_FOUND_CLASSNAME +
      '">No activity found for this user.</span><br />' + 
      '<a class="username_link" ' + 
      'onclick="ytActivityApp.getActivityFeed()">' + 
      'Click to reload your own activity.</a>');
    $('#status').hide();
    return;
  }

  $('#' + ytActivityApp.FEED_RESULTS_DIV).html('<ul class="feed_output">');

  // Add a small header with the title of the feed being requested
  if (ytActivityApp.FEED_REQUESTED == ytActivityApp.FRIEND_ACTIVITY_FEED) {
    $('#' + ytActivityApp.FEED_RESULTS_DIV).append(
      '<h4>Your Friend Activity</h4>');
  } else {
    if (ytActivityApp.CURRENT_USERNAME) {
      $('#' + ytActivityApp.FEED_RESULTS_DIV).append(
        '<h4>Activity for ' + ytActivityApp.CURRENT_USERNAME + '</h4>');
    } else {
      $('#' + ytActivityApp.FEED_RESULTS_DIV).append(
        '<h4>Your Activity</h4>');
    }
  }

  // Keep track of each video number for the embedded player
  var video_number = 0;
  for (var i = 0; i < data.length; i++) {
    var entry = data[i];
    // An array that will contain the HTML for this activity entry
    var HTML_string = [];

    // If there is a date, decode it
    if(entry.updated) {
      var updated = new Date();
      updated.setISO8601(entry.updated);
    }
    else {
      var updated = ytActivityApp.METADATA_UPDATED_TS_NOT_FOUND;
    }

    var activity_type = entry.activity_type;
    // A more user-friendly string describing the activity
    var english_string = null;
    // A boolean to check whether the current activity contains a video
    var is_video_activity = false;
    // A boolean to check whether a video player URL was found
    var added_video = false;

    // Switch on the activity type, setting the english string and also
    // checking whether it involves a video.
    switch(activity_type) {
      case 'video_rated':
        english_string = ' has rated a video';
        is_video_activity = true;
        break;
      case 'video_shared':
        english_string = ' has shared a video';
        is_video_activity = true;
        break;
      case 'video_favorited':
        english_string = ' has favorited a video';
        is_video_activity = true;
        break;
      case 'video_commented':
        english_string = ' has commented on a video';
        is_video_activity = true;
        break;
      case 'video_uploaded':
        english_string = ' has uploaded a video';
        is_video_activity = true;              
        break;
      case 'friend_added':
        english_string = ' has added';
        break;
      case 'user_subscription_added':
        english_string = ' has subscribed to ';
        break;
    }

    HTML_string.push('<li class="' +
      ytActivityApp.CSS_FEED_LI_CLASSNAME + '">');
    HTML_string.push('<div class="' +
      ytActivityApp.CSS_ENTRY_DIV_CLASSNAME + '">');
    HTML_string.push('<span class="' +
      ytActivityApp.CSS_ENTRY_TIMESTAMP_SPAN_CLASSNAME + '">' + updated +
      '</span><br />');

    // Add a different CSS class for each activity
    HTML_string.push('<div class="icon ' + activity_type + '"> +</div>');

    // If the feed is an activity feed, then don't make the current user's
    // name clickable
    if (ytActivityApp.FEED_REQUESTED != ytActivityApp.FRIEND_ACTIVITY_FEED) {
      HTML_string.push('<span class="' +
        ytActivityApp.CSS_ENTRY_MY_USERNAME_LINK_CLASSNAME + '">' +
        entry.author + '</span> ');
    } else {
      HTML_string.push('<a class="' +
        ytActivityApp.CSS_ENTRY_USERNAME_LINK_CLASSNAME +
        '" href="#" onclick="ytActivityApp.getActivityFeed(\'' + entry.author +
        '\')">' + entry.author + '</a> ');
    }

    HTML_string.push(english_string)

    // If it is a video activity, process the metadata, if it is available...
    if (is_video_activity) {
      if ((entry.video_info) && (entry.video_info != 'NOT_AVAILABLE')) {

        // Initialize all the video_info properties to defaults if not found
        var uploader = entry.video_info.uploader ||
          ytActivityApp.METADATA_UPLOADER_NOT_FOUND;
        var title = entry.video_info.title ||
          ytActivityApp.METADATA_TITLE_NOT_FOUND;
        var id = entry.video_info.id || ytActivityApp.METADATA_ID_NOT_FOUND;
        var view_count = entry.video_info.view_count ||
          ytActivityApp.METADATA_VIEW_COUNT_NOT_FOUND;
        var thumbnail_url = entry.video_info.thumbnail ||
          ytActivityApp.METADATA_THUMBNAIL_URL_NOT_FOUND;
        var player_url = entry.video_info.player;
        var rating = entry.video_info.rating ||
          ytActivityApp.METADATA_RATING_NOT_FOUND;
        
        // If the activity is not an upload, make the video uploader a link
        // (We don't make it a link if the uploader is the current user...)
        if (activity_type != 'video_uploaded') {
          if (uploader != ytActivityApp.METADATA_UPLOADER_NOT_FOUND) {
            HTML_string.push(' uploaded by <a class="' +
              ytActivityApp.CSS_ENTRY_USERNAME_LINK_CLASSNAME +
              '" href="#" onclick="ytActivityApp.getActivityFeed(\'' +
              uploader + '\')">' + uploader + '</a><br />');
          } else {
            HTML_string.push(' uploaded by ' + uploader + '<br />');
          }
        } else {
          HTML_string.push('<br />');
        }
        
        // If we were able to retrieve a thumbnail, process it.
        if (thumbnail_url != ytActivityApp.METADATA_THUMBNAIL_URL_NOT_FOUND) {
          HTML_string.push('<div id="' +
            ytActivityApp.CSS_ENTRY_THUMB_DIV_CLASSNAME + '">');
          
          // Check if we also have a URL for the SWF player, which also
          // indicates that the video is embeddable.
          if(player_url) {
            player_url = player_url + '&autoplay=1';
            added_video = true;
          }

          // If the video is embeddable, prepare it to be played with thickbox
          if(added_video) {    
            HTML_string.push('<a id="play_video_number_' + video_number +
              '" href="#">');
          } else {
            // Video is not embeddable, so prepare a link to the YouTube.com
            // video watchpage
            HTML_string.push('<a class="play_on_youtube" target="_blank" ' +
              'href="' + ytActivityApp.YOUTUBE_VIDEO_URL + id + '" title="' +
              ytActivityApp.EMBEDDING_DISABLED_MESSAGE + '">');
          }

          HTML_string.push('<img src="' + thumbnail_url +
            '" width="130" height="97" />');
          HTML_string.push('</a>');
          HTML_string.push('<br/></div>');
        }
        
        // If we were able to retrieve a title, process it.
        if (title != ytActivityApp.METADATA_TITLE_NOT_FOUND) {
          // If video is embeddable, prepare thickbox so that the video plays
          // when we click on the title.
          if(added_video) {
            HTML_string.push('<a id="t_play_video_number_' + video_number + '" href="#">');
          } else {
            // Set the title link to open the YouTube.com watchpage in a new tab
            HTML_string.push('<a class="play_on_youtube" target="_blank" ' +
              'href="' + ytActivityApp.YOUTUBE_VIDEO_URL + id + 
              '" title="' + ytActivityApp.EMBEDDING_DISABLED_MESSAGE + '">');
          }
          HTML_string.push('<span class="' +
            ytActivityApp.CSS_ENTRY_VIDEO_TITLE_SPAN_CLASSNAME + '">' +
            title + '</span>');
          HTML_string.push('</a>');
        } else {
          HTML_string.push('<span class="' +
            ytActivityApp.CSS_ENTRY_VIDEO_TITLE_SPAN_CLASSNAME + '">' +
            title + '</span>');
        }

        HTML_string.push('<span class="' +
          ytActivityApp.CSS_ENTRY_VIDEO_ID_SPAN_CLASSNAME +
          '">(video id: ' + id + ')</span><br />');

        // Prepare a span for the video metadata and add it (if available)
        HTML_string.push('<span class="' +
          ytActivityApp.CSS_ENTRY_METADATA_SPAN_CLASSNAME + '">');
        
        if (view_count != ytActivityApp.METADATA_VIEW_COUNT_NOT_FOUND) {
          HTML_string.push('View count: ' + view_count + '<br />');
        }

        if (rating != ytActivityApp.METADATA_RATING_NOT_FOUND) {
          HTML_string.push('Average rating: ' +
            entry.video_info.rating.average + ' (rated by ' +
            entry.video_info.rating.numRaters + ' users)');
        }
        HTML_string.push('</span>');
      } else {
        // No video metadata was found. Note that this could either be a valid
        // problem, such as when the data is not yet available because the 
        // video was just uploaded or deleted. Or this could be an actual error.
        // For simplicity we handle it the same way.
        HTML_string.push('<br /><span class="' +
          ytActivityApp.CSS_ENTRY_VIDEO_METADATA_NOT_FOUND_CLASSNAME + '">' +
          ytActivityApp.VIDEO_METADATA_NOT_AVAILABLE_MESSAGE + '</span>');
      }
    } else {
      // This was not an activity that involved a video
      if (activity_type == 'friend_added') {
        HTML_string.push(' <a href="#" class="' +
          ytActivityApp.CSS_ENTRY_USERNAME_LINK_CLASSNAME +
          '" onclick="ytActivityApp.getActivityFeed(\'' + entry.username +
          '\')">' + entry.username + '</a> as a friend');
      } else {
        HTML_string.push('<a href="#" class="' +
          ytActivityApp.CSS_ENTRY_USERNAME_LINK_CLASSNAME +
          '" onclick="ytActivityApp.getActivityFeed(\'' + entry.username +
          '\')">' + entry.username + '\'s</a> videos');
      }
    }
    HTML_string.push('</div><br clear="all"></li>');

    // Write the activity entry to the DOM
    $('#' + ytActivityApp.FEED_RESULTS_DIV).append(HTML_string.join('')).show("slow");

    // If it was a video activity and the video is embeddable, create handlers
    if(added_video) {
      $("#play_video_number_" + video_number).click(
        ytActivityApp.displayMovie(player_url, title));
      $("#t_play_video_number_" + video_number).click(
        ytActivityApp.displayMovie(player_url, title));
      video_number = video_number + 1;
    }

  }
  // Done processing all the events, render the HTML and hide the
  // 'loading' status div
  $('#' + ytActivityApp.FEED_RESULTS_DIV).append('</ul></div>').show("slow")
  $('#status').hide();
}

