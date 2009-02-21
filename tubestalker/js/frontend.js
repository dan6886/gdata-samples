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
 * Data API feeds using a PHP backend.
 */

/**
 * Provides namespacing for the YouTube Activity Application (ytActivityApp)
 */
var ytActivityApp = {};

/**
 * The base URI that the frontend communicates with via JSON
 * @type String
 */
ytActivityApp.URI = 'index.php';

/**
 * The URI that a user would visit to log out
 * @type String
 */
ytActivityApp.LOGOUT_URI = 'index.php?action=logout';

/**
 * The div Id to write activity stream results to
 * @type String
 */
ytActivityApp.FEED_RESULTS_DIV = 'activity_stream';

/**
 * The div Id to write log in and log out activity to
 * @type String
 */
ytActivityApp.USER_LOGIN_DIV = 'loginlogout';

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
 * The CSS classname for activity entry divs
 * @type String
 */
ytActivityApp.CSS_ENTRY_METADATA_SPAN_CLASSNAME = 'video_metadata';
ytActivityApp.CSS_ENTRY_MY_USERNAME_LINK_CLASSNAME = 'my_username_link';
ytActivityApp.CSS_ENTRY_THUMB_DIV_CLASSNAME = 'video_thumbnail';
ytActivityApp.CSS_ENTRY_TIMESTAMP_SPAN_CLASSNAME = 'activity_timestamp';
ytActivityApp.CSS_ENTRY_USERNAME_LINK_CLASSNAME = 'username_link';
ytActivityApp.CSS_ENTRY_VIDEO_ID_SPAN_CLASSNAME = 'video_id';
ytActivityApp.CSS_ENTRY_VIDEO_METADATA_NOT_FOUND_CLASSNAME = 'metadata_not_found';
ytActivityApp.CSS_ENTRY_VIDEO_TITLE_SPAN_CLASSNAME = 'video_title';
ytActivityApp.CSS_FEED_LI_CLASSNAME = 'feed_item';
ytActivityApp.CSS_USER_ACTIVITY_NOT_FOUND_CLASSNAME = 'user_activity_not_found';

// metadata
ytActivityApp.METADATA_TITLE_NOT_FOUND = 'title not found';
ytActivityApp.METADATA_UPLOADER_NOT_FOUND = 'uploader not found';
ytActivityApp.METADATA_ID_NOT_FOUND = 'id not found';
ytActivityApp.METADATA_VIEW_COUNT_NOT_FOUND = 'view count not found';
ytActivityApp.METADATA_THUMBNAIL_URL_NOT_FOUND = 'thumbnail url not found';
ytActivityApp.METADATA_RATING_NOT_FOUND = 'rating not found';
ytActivityApp.METADATA_UPDATED_TS_NOT_FOUND = 'no timestamp found';
ytActivityApp.VIDEO_METADATA_NOT_AVAILABLE_MESSAGE =
  'Video metadata not available &mdash; video could have been deleted, just ' +
  'uploaded or a duplicate upload.';
ytActivityApp.YOUTUBE_VIDEO_URL = 'http://www.youtube.com/watch?v=';

ytActivityApp.LOADING_IMAGE_HTML = '<small>Fetching data ... </small><br />' + 
  '<img src="css/ext/loadingAnimation.gif" width="208" height="13"/>';


ytActivityApp.API_NOT_AVAILABLE_MESSAGE =
  'Oops! The Youtube API is currently not available. Please check the ' + 
  '<a class="logout_link" href="http://groups.google.com/group/youtube-api">' + 
  '<strong>YouTube APIs Announcement Forum</strong></a> for updates.<br />';

ytActivityApp.EMBEDDING_DISABLED_MESSAGE = 
  'Note! The owner of this video has disabled embedding. ' + 
  'If you click, you can watch the video on YouTube.com in a new tab';
  

ytActivityApp.CURRENT_USERNAME = null;
ytActivityApp.USER_ACTIVITY_FEED = 0;
ytActivityApp.FRIEND_ACTIVITY_FEED = 1;
ytActivityApp.FEED_REQUESTED = ytActivityApp.USER_ACTIVITY_FEED;
ytActivityApp.FORM_RADIO_SELECTION_ID = 'feed_type_select';


$(document).ready(function(){
    $('#status').html(ytActivityApp.LOADING_IMAGE_HTML);


  if (loggedIn) {
    $('#options').slideDown("slow");
    if (ytActivityApp.FEED_REQUESTED == ytActivityApp.USER_ACTIVITY_FEED) {
      ytActivityApp.getActivityFeed();
    } else {
      ytActivityApp.getFriendActivityFeed();
    }
  }
});

ytActivityApp.switchFeedURI = function() {
  var form = document.getElementById(ytActivityApp.FORM_RADIO_SELECTION_ID);
  var button_value = null;
  for(i = 0; i < form.length; i++) {
    input = form[i];
    if (input.checked) {
      button_value = input.value;
    }
  }
  if (button_value == 'activity') {
    ytActivityApp.FEED_REQUESTED = ytActivityApp.USER_ACTIVITY_FEED;
    ytActivityApp.getActivityFeed();
  } else {
    ytActivityApp.FEED_REQUESTED = ytActivityApp.FRIEND_ACTIVITY_FEED;
    ytActivityApp.getFriendActivityFeed();
  }
}
// reset to activity
ytActivityApp.resetFormSelection = function() {
  var form = document.getElementById(ytActivityApp.FORM_RADIO_SELECTION_ID);
  form[0].checked = true; form[1].checked = false;
  
}

ytActivityApp.getActivityFeedForManyUsers = function(usernames) {
  // sanitize input...
  // YT: Your username can only contain letters A-Z or numbers 0-9 
  // split on comma or white space or both
  // extract all whitespace first
  if ((usernames == null) || (usernames == '')) {
    $('#status').show().html('Oops! Looks like no usernames were entered ...')
      .css('color', 'red');
    return;
  } 

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
    // strip whitespace
    var username = $.trim(usernameArray[i]);
    var illegalCharacters = /[^a-zA-Z0-9]/;
    if (illegalCharacters.test(username)) {
      $('#status').show().html('Ouch! <strong>' + username +
        '</strong> is not a valid YT username! Please try again.')
        .css('color', 'red');
        return;
    } else {
      validUsernames.push(username);
    }
  }
  ytActivityApp.getActivityFeed(validUsernames.join(','), null);
}

ytActivityApp.getActivityFeed = function(username, friendfeed) {
  if (loggedIn == true) {
    // TODO optimize this
    $('#status').show();
    ytActivityApp.resetFormSelection();
    $.get(ytActivityApp.URI, { q: "whoami" },
      function(data){
        var my_username = data.substring(1, data.length-1);
        ytActivityApp.CURRENT_USERNAME = my_username;
        $('#' + ytActivityApp.USER_LOGIN_DIV).html('Logged in as: ' +
          my_username + ' &mdash; <a class="logout_link" href="' +
          ytActivityApp.LOGOUT_URI + '" >log out</a>')
      });
    // userfeed or friendfeed
    if (friendfeed) {
        $.getJSON(ytActivityApp.URI, { q: "friendfeed" },
          ytActivityApp.processJSON);
    } else {  
      // check whether we are looking for data from a specific user
      if (username) {
        $.getJSON(ytActivityApp.URI, { q: "userfeed", who: username },
          ytActivityApp.processJSON);
      } else {
        // get data for the default user
        $.getJSON(ytActivityApp.URI, { q: "userfeed" },
          ytActivityApp.processJSON);
      }
    }
  }
}

ytActivityApp.getFriendActivityFeed = function() {
  if (loggedIn == true) {
    // TODO optimize this
    $('#status').show();
    $.getJSON(ytActivityApp.URI, { q: "friendfeed" },ytActivityApp.processJSON);
  }
}

ytActivityApp.displayMovie = function(swfUrl, videoName) {
   return function() {
     $("#videobox").html('<div id="ytapiplayer"></div>');
     var params = { allowScriptAccess: "always" };
     swfobject.embedSWF(swfUrl, "ytapiplayer", "425", "356", "8", null, null, params);
     $("#play_video").attr('title', videoName);
     $("#play_video").click();
     $("#TB_window").bind('unload', ytActivityApp.clearVideoBox);
   }
 }
 
ytActivityApp.clearVideoBox = function() {
  $("#videobox").html('');
}


ytActivityApp.processJSON = function(data) {
      // TODO add effect perhaps?
      // parse JSON
      console.log("------...----processing json");
      console.log(data);
      
      if (data == 'SERVER_ERROR') {
        $('#' + ytActivityApp.FEED_RESULTS_DIV).html(
          '<span class="' + ytActivityApp.CSS_API_NOT_AVAILABLE_CLASSNAME +
          '">' + ytActivityApp.API_NOT_AVAILABLE_MESSAGE + '</span><br />');
        $('#status').hide();
        return;
      }
      
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
      var no_videos_found_for_user = false;

      var video_number = 0;
      for (var i = 0; i < data.length; i++) {
        var entry = data[i];
        var HTML_string = [];
        if(entry.updated) {
          var updated = new Date();
          updated.setISO8601(entry.updated);
        }
        else {
          var updated = ytActivityApp.METADATA_UPDATED_TS_NOT_FOUND;
        }
        var activity_type = entry.activity_type;
        var english_string = null;
        var is_video_activity = false;
        var added_video = false;
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
          ytActivityApp.CSS_ENTRY_TIMESTAMP_SPAN_CLASSNAME + '">' +
          updated + '</span><br />');
        HTML_string.push('<div class="icon ' + activity_type + '"> &ndash; </div>');
        
        if (ytActivityApp.FEED_REQUESTED != ytActivityApp.FRIEND_ACTIVITY_FEED) {
          HTML_string.push('<span class="' +
            ytActivityApp.CSS_ENTRY_MY_USERNAME_LINK_CLASSNAME + '">' +
            entry.author + '</span> ');
        } else {
          // in friend activity feed so make author of event clickable
          HTML_string.push('<a class="' +
                    ytActivityApp.CSS_ENTRY_USERNAME_LINK_CLASSNAME +
                    '" href="#" onclick="ytActivityApp.getActivityFeed(\'' +
                    entry.author + '\')">' + entry.author + '</a> ');
        }

        HTML_string.push(english_string)
        // activity type
        if (is_video_activity) {
          if ((entry.video_info) && (entry.video_info != 'NOT_AVAILABLE')) {
              
              var uploader = entry.video_info.uploader || ytActivityApp.METADATA_UPLOADER_NOT_FOUND;
              var title = entry.video_info.title || ytActivityApp.METADATA_TITLE_NOT_FOUND;
              var id = entry.video_info.id || ytActivityApp.METADATA_ID_NOT_FOUND;
              var view_count = entry.video_info.view_count || ytActivityApp.METADATA_VIEW_COUNT_NOT_FOUND;
              var thumbnail_url = entry.video_info.thumbnail || ytActivityApp.METADATA_THUMBNAIL_URL_NOT_FOUND;
              var player_url = entry.video_info.player;
              var rating = entry.video_info.rating ||  ytActivityApp.METADATA_RATING_NOT_FOUND;
              
              // build html string
              if (activity_type != 'video_uploaded') {
                if (uploader != ytActivityApp.METADATA_UPLOADER_NOT_FOUND) {
                  HTML_string.push(
                    ' uploaded by <a class="' +
                    ytActivityApp.CSS_ENTRY_USERNAME_LINK_CLASSNAME +
                    '" href="#" onclick="ytActivityApp.getActivityFeed(\'' +
                    uploader + '\')">' + uploader + '</a><br />');
                } else {
                  HTML_string.push(' uploaded by ' + uploader + '<br />');
                }
              } else {
                HTML_string.push('<br />');
              }
              if (thumbnail_url != ytActivityApp.METADATA_THUMBNAIL_URL_NOT_FOUND) {
                HTML_string.push('<div id="' + ytActivityApp.CSS_ENTRY_THUMB_DIV_CLASSNAME + '">');

                if(player_url) {
                  player_url = player_url + '&autoplay=1';
                  added_video = true;
                }

                //
                if(added_video) {    
                  HTML_string.push('<a id="play_video_number_' + video_number +'" href="#">');
                } else {
                  // no embed
                  HTML_string.push('<a class="play_on_youtube" target="_blank" ' +
                  'href="' + ytActivityApp.YOUTUBE_VIDEO_URL + id +
                  '" title="' + ytActivityApp.EMBEDDING_DISABLED_MESSAGE +
                  '">');
                }
                  HTML_string.push('<img src="' + thumbnail_url +
                  '" width="130" height="97" />');
                  HTML_string.push('</a>');
                HTML_string.push('<br/></div>');
              }
              
              if(added_video) {
                HTML_string.push('<a id="t_play_video_number_' + video_number + '" href="#">');
              } else {
                // play on yt
                HTML_string.push('<a class="play_on_youtube" target="_blank" ' +
                  'href="' + ytActivityApp.YOUTUBE_VIDEO_URL + id + 
                  '" title="' + ytActivityApp.EMBEDDING_DISABLED_MESSAGE +
                  '">');
              }

                HTML_string.push('<span class="' +
                ytActivityApp.CSS_ENTRY_VIDEO_TITLE_SPAN_CLASSNAME + '">' +
                title + '</span>');
                HTML_string.push('</a>');

            
            
              HTML_string.push('<span class="' +
                ytActivityApp.CSS_ENTRY_VIDEO_ID_SPAN_CLASSNAME +
                '">(video id: ' + id + ')</span><br />');
              HTML_string.push('<span class="' +
                ytActivityApp.CSS_ENTRY_METADATA_SPAN_CLASSNAME + '">');
              if (view_count != ytActivityApp.METADATA_VIEW_COUNT_NOT_FOUND) {
                HTML_string.push('View count: ' + view_count + '<br />');
              }
              if (rating != ytActivityApp.METADATA_RATING_NOT_FOUND) {
                HTML_string.push('Average rating: ' + entry.video_info.rating.average +
                  ' (rated by ' + entry.video_info.rating.numRaters + ' users)');
              }
              HTML_string.push('</span>');
            } else {
            // no metadata found
            HTML_string.push('<br /><span class="' +
              ytActivityApp.CSS_ENTRY_VIDEO_METADATA_NOT_FOUND_CLASSNAME +
              '">' + ytActivityApp.VIDEO_METADATA_NOT_AVAILABLE_MESSAGE +
              '</span>');
          }
        } else {
            // user activity
            if (activity_type == 'friend_added') {
              HTML_string.push(' <a href="#" class="' +
                ytActivityApp.CSS_ENTRY_USERNAME_LINK_CLASSNAME +
                '" onclick="ytActivityApp.getActivityFeed(\'' +
                entry.username + '\')">' + entry.username +
                '</a> as a friend');
            } else {
              HTML_string.push(
                '<a href="#" class="' +
                ytActivityApp.CSS_ENTRY_USERNAME_LINK_CLASSNAME +
                '" onclick="ytActivityApp.getActivityFeed(\'' +
                entry.username + '\')">' + entry.username + '\'s</a> videos');
            }
        }
        HTML_string.push('</div><br clear="all"></li>');
        $('#' + ytActivityApp.FEED_RESULTS_DIV).append(HTML_string.join('')).show("slow");
        if(added_video) {
          $("#play_video_number_" + video_number).click(ytActivityApp.displayMovie(player_url, title));
          $("#t_play_video_number_" + video_number).click(ytActivityApp.displayMovie(player_url, title));
          video_number = video_number + 1;
        }

      }

      $('#' + ytActivityApp.FEED_RESULTS_DIV).append('</ul></div>').show("slow")
      $('#status').hide();


}
