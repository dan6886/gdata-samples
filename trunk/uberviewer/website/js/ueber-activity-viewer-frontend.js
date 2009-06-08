/* Copyright (c) 2009 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Author: Jochen Hartmann <api.jhartmann@google.com>
 */

/**
 * @fileoverview Frontend to handle events and DOM manipulation for
 * YouTube ueber activity feed application.
 */

/**
 * Provides namespacing for the YouTube Ueber Activity Application (ytUAV)
 */
var ytUAV = {};

/**
 * The current page of results. No. of results per page is configurable in PHP
 * @type Number
 */
ytUAV.currentPage = 1;

/**
 * Whether to log to firebug console (wraps console.log)
 * @type Boolean
 */
ytUAV.enableLogging = false;

/**
 * The HTML DIV to write results to
 * @type String
 */
ytUAV.divIdToWriteTo = 'feed_output';

/**
 * The URL for the default thumb to display if no user profile metadata is found.
 * @type String
 */
ytUAV.pathDefaultUserThumb = 'img/default_user_thumb.png';

/**
 * The HTML to write into the status element that shows while fetching results.
 * @type String
 */
ytUAV.loadingStatusHTML = ['<small>Fetching new data ... </small><br />', 
  '<img src="css/ext/loadingAnimation.gif" width="208" height="13"/><br /><br />'].join('');

/**
 * Link to YouTube watch page
 * @type String
 */
ytUAV.youTubeWatchPageLinkHref = 'http://youtube.com/watch?v=';

/**
 * Retrieve events from backend
 * @return void
 */
ytUAV.getActivities = function(uri) {
  // Clear previous page of results
  $('#status').show().html(ytUAV.loadingStatusHTML);
  if (uri == null) {
    uri = ['get_activity.php?action=json&page=', ytUAV.currentPage].join('');
  }
  $.getJSON(uri, ytUAV.processJSON);
}

/**
 * Process the JSON feed and create an HTML table with activity data.
 * @param {Object} data The JSON feed to process
 * @return void
 */
ytUAV.processJSON = function(data) {
  if (data) {
    $('#status').hide();
    $(['#', ytUAV.divIdToWriteTo].join('')).html('');
    $('<div/>').attr('id', 'pagination').appendTo(['#', ytUAV.divIdToWriteTo].join(''));

    var numItems = data.length;
    if (numItems < 1) {
      // possibly at end or paged too far
      ytUAV.buildPagination('#pagination', 'top_pagination', true);
      $(['#', ytUAV.divIdToWriteTo].join('')).append(['<br/>No more results ... ',
        '<br/>Do something on <strong><a href="http://youtube.com" target="_blank">YouTube</a></strong> !'].join(''));
        return;
    }

    ytUAV.buildPagination('#pagination', 'top_pagination', false);
    
    ytUAV.log('Found ' + numItems + ' items in feed.');
    $('<table/>').attr('id', 'activity_feed_table').appendTo(
      ['#', ytUAV.divIdToWriteTo].join(''));
    for (var i = 0; i < numItems; i++) {
      $('<tr/>').attr('id', ['title_tr_', i].join('')).addClass('activity_feed_table_title_row')
        .appendTo(
          ['#', 'activity_feed_table'].join(''));

      var activity = data[i];
      ytUAV.log(activity);
      
      $('<td/>').attr('colspan', '2').html(
        ['<div id="event_title_', i, '" class="event_title_',
          activity.event.event, ' event_title">', activity.event.title,
          '</span> on ', '<span class="event_ts">', activity.updated,
          '</span></div>'].join('')).appendTo(
            ['tr.activity_feed_table_title_row#title_tr_', i].join(''));
      
      $('<tr/>').attr(
        'id', ['data_tr_', i].join(''))
       .appendTo(
          ['#', 'activity_feed_table'].join('')).addClass(
           'activity_feed_table_data_row');

      // now we care about the type (video or user event)
      var videoEvent = false;
      var video = /VIDEO/;
      if (video.test(activity.event.event)) {
        videoEvent = true;
      }

      $('<td/>').attr('id', ['data_td_left_', i].join('')).appendTo(
        ['tr.activity_feed_table_data_row#data_tr_', i].join(''));
      $('<td/>').attr('id', ['data_td_right_', i].join('')).appendTo(
        ['tr.activity_feed_table_data_row#data_tr_', i].join(''));

      $('<div/>').attr(
        'id', ['activity_entry_div_left', i].join(''))
        .appendTo(
          ['#data_td_left_', i].join('')).addClass(
          'activity_entry_div_left activity_entry_div');
      $('<div/>').attr(
        'id', ['activity_entry_div_right', i].join('')).appendTo(
          ['#data_td_right_', i].join('')).addClass(
          'activity_entry_div_right activity_entry_div');
      var videoDataDivLeft = ['#activity_entry_div_left', i].join('');
      var videoDataDivRight = ['#activity_entry_div_right', i].join('');

      if (videoEvent) {
        if (activity.event.metadata && activity.event.metadata.thumb_url) {
          var thumbnail_tag = null;
          if (activity.event.metadata && activity.event.metadata.swf_url) {
            // IE not honoring jQuery created $('<img/>') tags for some reason
            // todo make an <img/> first with attr width and height
            // then set source on it
            thumbnail_tag = ['<a id="play_video_number_', i,
              '" href="#" title="Click to watch embedded">',
              '<img class="video_thumbnail ueber-viewer-image swf" width="120"',
              ' height="90" src="', activity.event.metadata.thumb_url,
              '" /></a>'];
          } else {
            thumbnail_tag = ['<a id="play_video_number_', i,
              '" href="#" title="Click to watch embedded">',
              '<img class="video_thumbnail ueber-viewer-image" width="120"',
              ' height="90" src="', activity.event.metadata.thumb_url,
              '" /></a>'];
          }
          $(videoDataDivLeft).append(thumbnail_tag.join(''));
        }

        if (activity.event.metadata) {
          var duration = activity.event.metadata.duration || null;
          var swf_url = activity.event.metadata.swf_url || null;
          var video_category = activity.event.metadata.video_category || null;
          var video_description = activity.event.metadata.video_description || null;
          var video_geo_location = activity.event.metadata.geo_location || null;
          var video_rating_total = activity.event.metadata.video_rating || null;
          var video_recorded = activity.event.metadata.video_recorded || null;
          var video_tags = activity.event.metadata.video_tags || null;
          var video_title = activity.event.metadata.video_title || null;
          var video_watch_page_url = activity.event.metadata.watch_page_url || null;
          var view_count = activity.event.metadata.view_count || null;
          
          if (swf_url) {
            swf_url = [swf_url, '&autoplay=1'].join('');
          }

          if (duration) {
            var minutes = duration/60;
            var splitDot = /(^.*)\./;
            var minutes_split = splitDot.exec(minutes);
            if (minutes_split !== null) {
              minutes = minutes_split[1];
            }
            $('<br/>').appendTo(
              videoDataDivLeft).addClass('metadata video_metadata');
            $('<span/>').attr('id', 'video_duration').text(
                ['Duration ', minutes, ':', duration - minutes*60].join(''))
                .appendTo(videoDataDivLeft).addClass('metadata video_metadata');
          }
          if (view_count) {
            $('<br/>').addClass('metadata video_metadata')
              .appendTo(videoDataDivLeft);
            $('<span/>').attr('id', 'video_view_count').text(['Viewed ', view_count,
              ' times so far.'].join('')).appendTo(videoDataDivLeft).addClass('metadata video_metadata');
          }

          if (video_title) {
            if (swf_url) {
              $('<span/>').attr('id', 'video_title').html(['<a id="t_play_video_number_', i,
                  '" href="#" title="Click to watch embedded">',
                  video_title, '</a>'].join('')).appendTo(videoDataDivRight).addClass('metadata video_metadata');
              $("#play_video_number_" + i).click(ytUAV.displayMovie(swf_url, video_title));
              $("#t_play_video_number_" + i).click(ytUAV.displayMovie(swf_url, video_title));
            } else {
              $('<span/>').attr('id', 'video_title').text(video_title).appendTo(videoDataDivRight)
              .addClass('metadata video_metadata');
            }
          }

          if (activity.event.rating) {
            $('<br/>').appendTo(videoDataDivRight).addClass('metadata video_metadata');
            $('<span/>').attr('id', 'rating').text(['Rating submitted: ', activity.event.rating].join(''))
              .appendTo(videoDataDivRight).addClass('metadata video_metadata user_submitted');
          }
          if (video_recorded) {
            $('<br/>').addClass('metadata video_metadata').appendTo(videoDataDivRight);
            $('<span/>').attr('id','video_recorded').text(video_recorded).appendTo(videoDataDivRight)
              .addClass('metadata video_metadata');
          }
          if (video_description) {
            $('<br/>').addClass('metadata video_metadata').appendTo(videoDataDivRight);
            $('<span/>').attr('id', 'video_description').text(
                ytUAV.truncate(video_description, 80, true, true)).appendTo(
                  videoDataDivRight).addClass('metadata video_metadata');
          }
          if (video_tags) {
            $('<br/>').addClass('metadata video_metadata').appendTo(videoDataDivRight);
            $('<span/>').attr('id','video_tags').text(video_tags).appendTo(videoDataDivRight)
              .addClass('metadata video_metadata');
          }
          if (video_category) {
            $('<br/>').addClass('metadata video_metadata').appendTo(videoDataDivRight);
            $('<span/>').attr('id', 'video_category').text(video_category)
            .appendTo(videoDataDivRight).addClass('metadata video_metadata');
          }
          if (video_geo_location) {
            $('<br/>').addClass('metadata video_metadata').appendTo(videoDataDivRight);
            $('<span/>').attr('id', 'video_geo_location').text(video_geo_location).appendTo(videoDataDivRight)
              .addClass('metadata video_metadata');
          }
          if (video_rating_total) {
            $('<br/>').addClass('metadata video_metadata').appendTo(videoDataDivRight);
            $('<span/>').attr('id','video_rating_total').text(video_rating_total).appendTo(videoDataDivRight)
              .addClass('metadata video_metadata');
          }
          if (video_watch_page_url) {
            $('<br/>').addClass('metadata video_metadata').appendTo(videoDataDivRight);
            $('<span/>').attr('id', 'video_watch_page_url').html(
              ['Watch page: <a href="', video_watch_page_url, '" target="_blank">',
                video_watch_page_url, '</a>'].join('')).appendTo(videoDataDivRight)
                .addClass('metadata video_metadata');
          }
        } else {
          ytUAV.log(['No metadata found for video ', activity.event.videoid].join(''));
          // Create link to YouTube watch page
          var watchPageLink = ['<small> No metadata available in the API yet. <a href="',
            ytUAV.youTubeWatchPageLinkHref, activity.event.videoid, '" target="_blank">',
            'Watch this video on YouTube</a></small>'].join('');
          $(['div#event_title_', i].join('')).addClass('no_metadata_found').append(watchPageLink);
        }
      } else {
        // User based event (Friend added, User subscription)
        var thumb_url = activity.event.metadata.thumbnail_url || ytUAV.pathDefaultUserThumb;
        $('<img/>').attr({ width: '120', height: '90', src: thumb_url}).appendTo(videoDataDivLeft)
          .addClass('video_thumbnail ueber-viewer-image');
        $('<span/>').attr('id', 'username').html(
          ['<a href="http://www.youtube.com/user/', activity.event.username,
           '" target="_blank">', activity.event.username, '</a>'].join(''))
          .appendTo(videoDataDivRight).addClass('metadata user_metadata');

        if (activity.event.metadata) {
          var age = activity.event.metadata.age || null;
          var about_me = activity.event.metadata.about_me || null;
          var books = activity.event.metadata.books || null;
          var channel_views = activity.event.metadata.channel_views || null;
          var company = activity.event.metadata.company || null;
          var first_name = activity.event.metadata.first_name || null;
          var gender = activity.event.metadata.gender || null;
          var hobbies = activity.event.metadata.hobbies || null;
          var hometown = activity.event.metadata.hometown || null;
          var last_login = activity.event.metadata.last_login || null;
          var last_name = activity.event.metadata.last_name || null;
          var last_profile_update = activity.event.metadata.last_profile_update || null;
          var location = activity.event.metadata.location || null;
          var member_since = activity.event.metadata.member_since || null;
          var movies = activity.event.metadata.movies || null;
          var music = activity.event.metadata.music || null;
          var num_contacts = activity.event.metadata.num_contacts || null;
          var num_favorites = activity.event.metadata.num_favorites || null;
          var num_subscriptions = activity.event.metadata.num_subscriptions || null;
          var num_uploads = activity.event.metadata.num_uploads || null;
          var occupation = activity.event.metadata.occupation || null;
          var relationship = activity.event.metadata.relationship || null;
          var school = activity.event.metadata.school || null;
          var subscribers = activity.event.metadata.subscribers || null;
          var videos_watched = activity.event.metadata.videos_watched || null;
          var website_url = activity.event.metadata.website_url || null;

          if (member_since) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivLeft);
            $('<span/>').attr('id', 'member_since').text(
              ['Member since: ', ytUAV.truncate(member_since, 10, false, false)].join('')).
              appendTo(videoDataDivLeft).addClass('metadata user_metadata');
          }
          if (videos_watched) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivLeft);
            $('<span/>').attr('id', 'videos_watched').text(
              ['Videos watched: ', videos_watched].join('')).appendTo(videoDataDivLeft)
                .addClass('metadata user_metadata');
          }
          if (last_login) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivLeft);
            $('<span/>').attr('id', 'last_login').text(
              ['Last login: ', ytUAV.truncate(last_login, 10, false, false)].join('')).
              appendTo(videoDataDivLeft).addClass('metadata user_metadata');
          }
          if (first_name || last_name) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').attr('id', 'first_name_last_name').text(
              ['Name: ', first_name, ' ', last_name].join('')).appendTo(videoDataDivRight)
              .addClass('metadata user_metadata');
          }
          if (about_me) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').attr('id', 'about_me').text(
              about_me).appendTo(videoDataDivRight).addClass('metadata user_metadata');
          }
          if (age) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').text(['Age: ', age].join('')).appendTo(videoDataDivRight)
              .addClass('metadata user_metadata age');
          }
          if (gender) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            //todo refactor. shouldnt be adding ids that are non-unique!
            $('<span/>').text(['Gender: ', gender].join('')).appendTo(videoDataDivRight)
              .addClass('metadata user_metadata gender');
          }
          if (books) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').text(['Favorite books: ', books].join('')).appendTo(videoDataDivRight)
              .addClass('metadata user_metadata books');
          }
          if (company) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').text(['Companies worked at: ', company].join('')).appendTo(videoDataDivRight)
              .addClass('metadata user_metadata companies');
          }
          if (relationship) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').text(['Relationship: ', relationship].join('')).appendTo(videoDataDivRight)
              .addClass('metadata user_metadata relationship');
          }
          if (website_url) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').html(
              ['<a href="', website_url, '" target="_blank">', website_url, '</a>'].join(''))
              .appendTo(videoDataDivRight).addClass('metadata user_metadata website_url');
          }
          if (hometown) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').text(
              ['Hometown: ', hometown].join('')).appendTo(videoDataDivRight).addClass('metadata user_metadata hometown');
          }
          if (location) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').text(
              ['Location: ', location].join('')).appendTo(videoDataDivRight).addClass('metadata user_metadata location');
          }
          if (hobbies) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').text(
              ['Hobbies: ', hobbies].join('')).appendTo(videoDataDivRight)
                .addClass('metadata user_metadata hobbies');
          }
          if (movies) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').text(
              ['Favorite movies: ', movies].join('')).appendTo(videoDataDivRight)
                .addClass('metadata user_metadata movies');
          }
          if (music) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').text(
              ['Favorite music: ', music].join('')).appendTo(videoDataDivRight)
                .addClass('metadata user_metadata music');
          }
          if (occupation) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').text(
              ['Occupation: ', occupation].join('')).appendTo(videoDataDivRight)
                .addClass('metadata user_metadata occupation');
          }
          if (school) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').text(
              ['Schools: ', school].join('')).appendTo(videoDataDivRight)
                .addClass('metadata user_metadata school');
          }
          if (channel_views) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').text(
              ['Channel views: ', channel_views].join('')).appendTo(videoDataDivRight)
                .addClass('metadata user_metadata channel_views');
          }
          if (num_contacts) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').text(
              ['Number of contacts: ', num_contacts].join('')).appendTo(videoDataDivRight)
                .addClass('metadata user_metadata num_contacts');
          }
          if (num_favorites) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').text(
              ['Number of favorite videos: ', num_favorites].join('')).appendTo(videoDataDivRight)
                .addClass('metadata user_metadata num_favorites');
          }
          if (num_subscriptions) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').text(
              ['Number of subscriptions: ', num_subscriptions].join('')).appendTo(videoDataDivRight)
                .addClass('metadata user_metadata num_subscriptions');
          }
          if (subscribers) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').text(
              ['Number of subscribers: ', subscribers].join('')).appendTo(videoDataDivRight)
                .addClass('metadata user_metadata subscribers');
          }
          if (num_uploads) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').text(
              ['Number of uploads: ', num_uploads].join('')).appendTo(videoDataDivRight)
                .addClass('metadata user_metadata num_uploads');
          }
          if (last_profile_update) {
            $('<br/>').addClass('metadata user_metadata').appendTo(videoDataDivRight);
            $('<span/>').text(
              ['Last profile update: ', ytUAV.truncate(last_profile_update, 10, false, false)].join(''))
              .appendTo(videoDataDivRight).addClass('metadata user_metadata last_profile_update');
          }
        } else {
          ytUAV.log(['No metadata found for user ', activity.event.username].join(''));
          $(['div#event_title_', i].join('')).addClass('no_metadata_found');
        }
      }
    }
    ytUAV.buildPagination(['#', ytUAV.divIdToWriteTo].join(''), 'bottom_pagination', false);
  }
}

/**
 * Create a simple pagination menu.
 * @param {String} elementName The DOM element to write this menu into
 * @param {String} clickHandlerName The name of the click handler
 * @return void
 */
ytUAV.buildPagination = function(elementName, clickHandlerName, atEnd) {
  $('<span/>').text(['  Page ', ytUAV.currentPage, ' | '].join(''))
    .appendTo(elementName).wrap('<small/>');
  // If we are already paged then create link to previous result set
  if (ytUAV.currentPage !== 1) {
    $('<a/>').attr('id', ['previous_results_', clickHandlerName].join(''))
      .html('&laquo; previous page of results  ').appendTo(elementName).addClass('results_link');
    $('<span/>').html('&nbsp;| ').appendTo(elementName).wrap('<small/>');
    $(['#previous_results_', clickHandlerName].join('')).click(
      function() {
        ytUAV.getActivities(
          ['get_activity.php?action=json&page=', ytUAV.currentPage - 1].join(''));
        ytUAV.currentPage = ytUAV.currentPage - 1;
    });
  }
  if (atEnd == false) {
    // Add link to next set of results
    $('<a/>').attr('id', ['next_results_', clickHandlerName].join(''))
      .html('next page of results &raquo;').appendTo(elementName).addClass('results_link');
    $(['#next_results_', clickHandlerName].join('')).click(
      function() {
        ytUAV.getActivities(
          ['get_activity.php?action=json&page=', ytUAV.currentPage + 1].join(''));
        ytUAV.currentPage = ytUAV.currentPage + 1;
    });
  }
}

/**
 * Truncate a string.
 * @param {String} text String to be truncated.
 * @param {Number} size (optional) Number of characters to chop to, default is 80
 * @param {Boolean} preserveWords (optional) Split on word boundary, default is false
 * @param {Boolean} addDots (optional) Add ellipsis, set to false to omit
 * @return {String} The resulting string
 */
ytUAV.truncate = function(text, size, preserveWords, addDots) {
  if (size == null) {
    size = 80;
  }
  var output = [];
  if (preserveWords) {
    var atLimit = false;
    var i = 0;
    var j = 0;
    while (true) {
      if (atLimit) {
        // Keep going for 20 chars maximally, break on whitespace
        for (var j = 0; j < 20; j++) {
          // todo cap on strlen: handle case where text < 20
          if (text[i+j] == ' ') {
            if (addDots !== false) {
              output.push(' ...');
            }
            return output.join('');
          }
        }                
        if (addDots !== false) {
          output.push(' ...');
        }
        return output.join('');
      } else {
        output[i] = text[i];
      }
      if (i == size) {
        atLimit = true;
      }    
      i++;
    }
  } else {
    for (var i=0; i < size; i++) {
      output[i] = text[i];
    }
  }
  if (addDots !== false) {
    output.push(' ...');
  }
  return output.join('');
}

/**
 * Write to firebug console if logging enabled
 * @param {String,Object} data The item to log
 */
ytUAV.log = function(data) {
  if (ytUAV.enableLogging == true) {
    console.log(data);
  }
}

/**
 * Using the lightbox plugin, display a SWF for an embedded video.
 * @param {String} swfUrl The URL for the video swf that is to be displayed
 * @param {String} videoTitle The title of the video that is to be displayed
 */
ytUAV.displayMovie = function(swfUrl, videoTitle) {
  return function() {
    // Write the div that the swf will be rendered to into our hidden div
    $("#videobox").html('<div id="ytapiplayer"></div>');
    // Set parameters
    var params = { allowScriptAccess: "always" };
    // Use swfObject to render a standard YouTube player
    swfobject.embedSWF(swfUrl, "ytapiplayer", "425", "356", "8", null, null, params);
    // Prepare a link that will be clicked to play the video
    $("#play_video").attr('title', videoTitle);
    // Auto play the video
    $("#play_video").click();
    // Destroy the player on close
    $("#TB_window").bind('unload', ytUAV.clearVideoBox);
   }
}

/**
 * Remove the swf html from the hidden video box div element.
 */
ytUAV.clearVideoBox = function() {
  $("#videobox").html('');
}

/**
 * Simple helper method to ensure no blank form is submitted.
 */
ytUAV.validateForm = function() {
  var username = document.getElementById('form_username_to_add').value;
  if ((username == null) || (username == '')) {
    alert("Please enter a username to add.");
  }
}
