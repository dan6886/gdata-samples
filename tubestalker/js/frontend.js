// TODO 
// ADD HEADERS
// copyright

var ytActivityApp = {};

ytActivityApp.URI = 'index.php';
// divs
ytActivityApp.FEED_RESULTS_DIV = 'activity_stream';
ytActivityApp.LOGGING_DIV = 'log';
ytActivityApp.USER_LOGIN_DIV = 'loginlogout';

// css
ytActivityApp.CSS_FEED_LI_CLASSNAME = 'feed_item';
ytActivityApp.CSS_ENTRY_DIV_CLASSNAME = 'activity_entry';
ytActivityApp.CSS_ENTRY_THUMB_DIV_CLASSNAME = 'video_thumbnail';
// for rating and view count
ytActivityApp.CSS_ENTRY_METADATA_SPAN_CLASSNAME = 'video_metadata';
ytActivityApp.CSS_ENTRY_HIDDEN_VIDEO_DIV_CLASSNAME = 'videobox';
ytActivityApp.CSS_ENTRY_TIMESTAMP_SPAN_CLASSNAME = 'activity_timestamp'
ytActivityApp.CSS_ENTRY_USERNAME_LINK_CLASSNAME = 'username_link'
ytActivityApp.CSS_ENTRY_VIDEO_TITLE_SPAN_CLASSNAME = 'video_title'
ytActivityApp.CSS_ENTRY_VIDEO_ID_SPAN_CLASSNAME = 'video_id'
ytActivityApp.CSS_ENTRY_VIDEO_METADATA_NOT_FOUND_CLASSNAME = 'metadata_not_found'

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


ytActivityApp.CURRENT_USERNAME = null;

$(document).ready(function(){
   ytActivityApp.getActivityFeed();
});

ytActivityApp.getActivityFeed = function(username) {
  if (loggedIn == true) {

    $.get(ytActivityApp.URI, { q: "whoami" },
      function(data){
        $('#' + ytActivityApp.USER_LOGIN_DIV).html(data)
      });

    // check whether we are looking for data from a specific user
    if (username) {
      ytActivityApp.CURRENT_USERNAME = username;
      $.getJSON(ytActivityApp.URI, { q: "userfeed", who: username },
        ytActivityApp.processJSON);
    } else {
      // get data for the default user
      $.getJSON(ytActivityApp.URI, { q: "userfeed" },
        ytActivityApp.processJSON);
    }
  } else {
    // not logged in
    var html = $('#' + ytActivityApp.USER_LOGIN_DIV).html()
    $('#' + ytActivityApp.USER_LOGIN_DIV).html('Not logged in: ' + html)
  }
}

ytActivityApp.displayMovie = function(swfUrl) {
  return function() {
    $("#videobox").html('<div id="ytapiplayer"></div>');
    var params = { allowScriptAccess: "always" };
    swfobject.embedSWF(swfUrl, "ytapiplayer", "425", "356", "8", null, null, params);
    $("#play_video").click();
  }
}


ytActivityApp.processJSON = function(data) {
      // TODO add effect perhaps?
      // parse JSON
      console.log("----------processing json");
      console.log(data);
      $('#' + ytActivityApp.FEED_RESULTS_DIV).html('<ul class="feed_output">');
      
      // if no activity found then what???
      if (data.length < 1) {
        // TODO output to a div
        alert('no data found for user ' + ytActivityApp.CURRENT_USERNAME + ', do something else ');
            $.getJSON(ytActivityApp.URI, { q: "userfeed" }, ytActivityApp.processJSON);

      }
      var video_number = 0;
      for (var i = 0; i < data.length; i++) {
        var entry = data[i];
        var HTML_string = [];
        var updated = entry.updated ||
          ytActivityApp.METADATA_UPDATED_TS_NOT_FOUND;
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
        HTML_string.push('<div class="icon ' + activity_type + '">+</div>');
          
        HTML_string.push('<a class="' +
          ytActivityApp.CSS_ENTRY_USERNAME_LINK_CLASSNAME + '" href="#">' +
          entry.author + '</a> ');
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
                //ytActivityApp.CSS_ENTRY_HIDDEN_VIDEO_DIV_CLASSNAME
                if(player_url) {
                  added_video = true;
                }
                    
                HTML_string.push('<a id="play_video_number_' + video_number +
                '" href="#"><img src="' + thumbnail_url + '" width="130" height="97" /></a><br />');
                HTML_string.push('</div>');
              }
              
              HTML_string.push('<a id="t_play_video_number_' + video_number + '" href="#"><span class="' +
                ytActivityApp.CSS_ENTRY_VIDEO_TITLE_SPAN_CLASSNAME + '">' +
                title + '</strong></a> ');
              HTML_string.push('<span class="' +
                ytActivityApp.CSS_ENTRY_VIDEO_ID_SPAN_CLASSNAME +
                '">(video id: ' + id + ')</span><br />');
              HTML_string.push('<span class="' +
                ytActivityApp.CSS_ENTRY_METADATA_SPAN_CLASSNAME + '">');
              HTML_string.push('View count: ' + view_count + '<br />');
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
          $("#play_video_number_" + video_number).click(ytActivityApp.displayMovie(player_url));
          $("#t_play_video_number_" + video_number).click(ytActivityApp.displayMovie(player_url));
          video_number = video_number + 1;
        }

      }

        $('#' + ytActivityApp.FEED_RESULTS_DIV).append('</ul></div>').show("slow")
}

