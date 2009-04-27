// TODO: add license?
// build frontend for admin interface
// redesign so that when we call render VideoMetadata, we just return an array with
// the requested metadata, so that we can wrap into template later... this way 
// i can reuse code for both iframe and admin itnerface
// make jQuery element creation simpler with a helper function !


/**
 * JS to handle iframe redirection and displaying videos coming from
 * AppEngine layer. uses jquery. will need to be rewritten,
 * cleaned up etc. */

/**
 * @fileoverview Frontend module to handle DOM manipulation for YouTube
 * upload in an iFrame. Provides functionality to render video metadata and
 * to present a YouTube video upload form.
 */

/**
 * Provides namespacing for the YouTube syndicated Uploader (ytSyndUploader)
 */
var ytSyndUploader = {};

/** 
 * Set option to log output to console. Requires firebug
 * @type {Boolean}
// redesign so that when we call render VideoMetadata, we just return an array with
// the requested metadata, so that we can wrap into template later... this way 
// i can reuse code for both iframe and admin itnerface */
ytSyndUploader.LOG_TO_CONSOLE = false;

/**
 * The URI for single video GET requests from the YouTube Data API.
 * @type String
 */
ytSyndUploader.URI_YOUTUBE_SINGLE_VIDEO_GET = 'http://gdata.youtube.com/feeds/api/videos/';

/**
 * Standard URI parameters appended to YouTube API metadata requests.
 * @type String
 */
ytSyndUploader.V_2_ALT_JSON = '?v=2&alt=json-in-script&callback=?';

/**
 * Constant to represent that we are displaying video SWFs.
 * @type Number
 */
ytSyndUploader.DISPLAY_SWF = 0;

/**
 * Constant to represent that we are displaying video thumbnails.
 * @type Number
 */
ytSyndUploader.DISPLAY_THUMB = 1;

/**
 * Standard width for the thumbnails to be displayed (width of SWF).
 * @type Number
 */
ytSyndUploader.THUMBNAIL_WIDTH = 425;

/**
 * Standard height for the thumbnails to be displayed.
 * @type Number
 */
ytSyndUploader.THUMBNAIL_HEIGHT = 318;

/**
 * The output format for video metadata (SWFs or thumbnails).
 * @type Number
 */
ytSyndUploader.DISPLAY_VIDEOS_AS = ytSyndUploader.DISPLAY_SWF;


/**
 * Keep track of video ids for displayed videos.
 * @type Array
 */
ytSyndUploader.DISPLAY_VIDEOS_DISPLAYED = [];


/**
 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 CSS CLASSES
 */

/**
 * CSS class to be added to all elements produced by this module.
 * @type String
 */
ytSyndUploader.GLOBAL_CSS_CLASS = 'syndicated_uploader';

/**
 * CSS id for the div element that holds all of the elements inside the iframe.   
 * @type String
 */
ytSyndUploader.CONTAINER_DIV_ID = 'syndicated_uploader_video_display'; 


/**
 * CSS id attribute for the video title input element in the upload form.
 * @type String
 */
ytSyndUploader.VIDEO_UPLOAD_TITLE_INPUT_ID = 'videoTitle';

/**
 * CSS class for the submit input element in the upload form.
 * @type String
 */
ytSyndUploader.VIDEO_UPLOAD_SUBMIT_INPUT_ID = 'videoSubmit';

/**
 * CSS id for the div that will contain the video metadata form.
 * @type String
 */
ytSyndUploader.VIDEO_UPLOAD_DIV_ID = 'syndicated_uploader_video_upload';

/**
 * CSS class for div that holds video metadata.
 * @type String
 */
ytSyndUploader.VIDEO_DISPLAY_VIDEO_DIV = 'syndicated_uploader_video_div';

/**
 * CSS id attribute for the form that handles video upload.
 * @type String
 */
ytSyndUploader.VIDEO_UPLOAD_FORM_ID =
  'syndicated_uploader_video_upload_form';

/**
 * CSS class for the span identifying the video's uploader.
 * @type String
 */
ytSyndUploader.VIDEO_METADATA_UPLOADER_SPAN = 'video_metadata_uploader';

/**
 * CSS class for the img tag identifying the video thumbnail.
 * @type String
 */
ytSyndUploader.VIDEO_METADATA_THUMBNAIL_IMG = 'video_metadata_thumbnail';

/**
 * CSS class for the span that holds the video title.
 * @type String
 */
ytSyndUploader.VIDEO_METADATA_TITLE_SPAN = 'video_metadata_title';

/**
 * CSS class for the anchor tag that links to the video uploader's watchpage.
 * @type String
 */
ytSyndUploader.VIDEO_METADATA_UPLOADER_A_CLASS = 'video_metadata_uploader_a';

/**
 * CSS id for the form that wraps the admin interface.
 * @type String
 */
ytSyndUploader.ADMIN_FORM_ID = 'admin_form';

/**
 * CSS name for the form that wraps the admin interface.
 * @type String
 */
ytSyndUploader.ADMIN_FORM_ID = 'admin_form';

//todo add comments
ytSyndUploader.ADMIN_TABLE_ID = 'admin_video_table';
ytSyndUploader.ADMIN_TABLE_TR = 'admin_video_tr';
ytSyndUploader.ADMIN_TABLE_TD = 'admin_video_td';
ytSyndUploader.CACHED_CLASS = 'cached_data'; // identify anything that is possibly cached
ytSyndUploader.ADMIN_RADIO_DIV = 'admin_radio_selection';
ytSyndUploader.ADMIN_RADIO_GROUP_NAME = 'videoid-'; // affects post name
ytSyndUploader.ADMIN_FORM_SUBMIT_NAME = 'admin_form_submit';
ytSyndUploader.ADMIN_FORM_SUBMIT_VALUE = 'submit';

/**
 * CSS class for the thumbnail images in the admin form.
 * @type String
 */
ytSyndUploader.ADMIN_VIDEO_METADATA_THUMBNAIL_IMG = 'admin_video_thumbnail';

/**
 * CSS class for the thumbnail images in the admin form.
 * @type String
 */
ytSyndUploader.ADMIN_VIDEO_METADATA_TITLE_SPAN = 'admin_video_title';


/**
 * CSS class for the thumbnail images in the admin form.
 * @type String
 */
ytSyndUploader.ADMIN_VIDEO_METADATA_UPLOADER_SPAN = 'admin_video_uploader';

/**
 * CSS class for alternating style in video display.
 * @type String
 */
ytSyndUploader.CSS_EVEN = 'admin_video_even';

/**
 * CSS class for alternating style in video display.
 * @type String
 */
ytSyndUploader.CSS_ODD = 'admin_video_odd';

/**
 * Render video metadata (title, swf, and uploader) for a video id.
 *
 * @param {String} videoId The YouTube video id.
 * @param {Boolean} done Whether we are at the last video. If true,
 *        we also insert an upload form if user is logged in.
 * @return void
 */
ytSyndUploader.renderVideoMetadata = function(videoId, done) {
  ytSyndUploader.log('Obtaining video metadata for video id: ' + videoId);
  
  var uri = ytSyndUploader.URI_YOUTUBE_SINGLE_VIDEO_GET + videoId +
    ytSyndUploader.V_2_ALT_JSON;
  ytSyndUploader.log('Fetching uri: ' + uri);

  // using jQuery to make an AJAX request
  $.getJSON(uri, function(data) {
    if (data) {
      $('<div/>').attr(
        'class', ytSyndUploader.VIDEO_DISPLAY_VIDEO_DIV).addClass(
        videoId).appendTo('#' + ytSyndUploader.CONTAINER_DIV_ID);
      var entry = data.entry;
      // Fetch the swf for the embeddable player, regardless of
      // display options to catch non-embeddable videos.
      var swfUrl = null;
        for(var i in entry.media$group.media$content) {
          if(entry.media$group.media$content[i].yt$format == '5') {
            swfUrl = entry.media$group.media$content[i].url;
          }
        }
      console.log(entry);
      ytSyndUploader.log('SWF url for ' + videoId + ': ' + swfUrl);
      if(!swfUrl) {
          // If there is no swf url then either the video is still
          // being processed or the user has disabled embedding.
          // Either way, skip it.
          ytSyndUploader.log('No SWF found for video id ' + uri, 'error');
          return;
      }
      if (ytSyndUploader.DISPLAY_VIDEOS_AS ==
          ytSyndUploader.DISPLAY_SWF) {
        ytSyndUploader.log('Rendering SWF at ' + swfUrl);
        // Create unique ids for each videos player
        var ytplayer_div = 'ytplayer_' + videoId;
        $('<div/>').attr('id', ytplayer_div).appendTo(
            '.' + ytSyndUploader.VIDEO_DISPLAY_VIDEO_DIV + '.' + 
            videoId).addClass(ytSyndUploader.GLOBAL_CSS_CLASS);
        swfobject.embedSWF(swfUrl + '&enablejsapi=1&playerapiid=player_id_' + 
          videoId, ytplayer_div, '425', '356', '8');
      } else if (ytSyndUploader.DISPLAY_VIDEOS_AS ==
          ytSyndUploader.DISPLAY_THUMB) {
          // Find largest thumbnail
          for (var i in entry.media$group.media$thumbnail) {
            if (entry.media$group.media$thumbnail[i].width == '480') {
              var thumbnail = entry.media$group.media$thumbnail[i];
              ytSyndUploader.log('Rendering thumbnail at ' + thumbnail.url); 
              $('<img/>').attr(
                { src: thumbnail.url,
                  width: ytSyndUploader.THUMBNAIL_WIDTH,
                  height: ytSyndUploader.THUMBNAIL_HEIGHT
                }).appendTo(
                '.' + ytSyndUploader.VIDEO_DISPLAY_VIDEO_DIV + '.' +
                videoId).addClass(ytSyndUploader.GLOBAL_CSS_CLASS).addClass(
                  ytSyndUploader.VIDEO_METADATA_THUMBNAIL_IMG);
            }
          }
      }
      // Render video title
      $('<span/>').text(entry.title.$t).appendTo(
        '.' + ytSyndUploader.VIDEO_DISPLAY_VIDEO_DIV + '.' +
        videoId).attr(
          'class', ytSyndUploader.VIDEO_METADATA_TITLE_SPAN).addClass(
          ytSyndUploader.GLOBAL_CSS_CLASS);
      // Render video uploader
      $('<span/>').attr(
        'class', ytSyndUploader.VIDEO_METADATA_UPLOADER_SPAN).text(
        'uploaded by ').appendTo('.' +
        ytSyndUploader.VIDEO_DISPLAY_VIDEO_DIV + '.' + videoId).addClass(
        ytSyndUploader.GLOBAL_CSS_CLASS);
      
      var uploader = entry.author[0].name.$t;
      $('<a/>').attr('target', '_blank').attr('href',
          'http://www.youtube.com/user/' + 
          uploader).text(uploader).appendTo(
            '.' + ytSyndUploader.VIDEO_DISPLAY_VIDEO_DIV + '.' +
            videoId).addClass(
            ytSyndUploader.GLOBAL_CSS_CLASS).addClass(
            ytSyndUploader.VIDEO_METADATA_UPLOADER_A_CLASS);
      $('<br />').attr('clear', 'both').appendTo(
          '.' + ytSyndUploader.VIDEO_DISPLAY_VIDEO_DIV + '.' +
          videoId).addClass(
          ytSyndUploader.GLOBAL_CSS_CLASS);
      if (done) {
        ytSyndUploader.createVideoUploadForm();
        ytSyndUploader.log('Finished rendering the last video');
        ytSyndUploader.log('Videos rendered are ' + 
          ytSyndUploader.DISPLAY_VIDEOS_DISPLAYED);
      }
    } else {
      // TODO handle
      alert('getJSON for videoId ' + videoId + ' failed');
    }
  });
}

/**
 * Render metadata for a comma separated list of video IDs,
 * presumably received from the AppEngine servlet.
 *
 * @param {String} listOfVideoIds A comma separated list of video IDs
 * @return void
 */
ytSyndUploader.renderMultipleVideos = function(listOfVideoIds) {
  var delimiter = ','; 
  var videoIdArray = listOfVideoIds.split(delimiter);
  var numVideosToRender = videoIdArray.length;
  ytSyndUploader.log('Fetching metadata for ' + numVideosToRender +
    ' videos: ' + listOfVideoIds);
  for (var i = 0; i < numVideosToRender; i++) {
    var done = false;
    if (i == numVideosToRender-1) {
      done = true;
    }
    ytSyndUploader.renderVideoMetadata(videoIdArray[i], done);
  }
}

/**
 * Render the video upload form
 *
 * @return void
 */
ytSyndUploader.createVideoUploadForm = function() {
  $('<div/>').attr('id', ytSyndUploader.VIDEO_UPLOAD_DIV_ID).appendTo(
    '#' + ytSyndUploader.CONTAINER_DIV_ID).addClass(
    ytSyndUploader.GLOBAL_CSS_CLASS);
  var  videoUploadForm = ['<br/><form id="',
    ytSyndUploader.VIDEO_UPLOAD_FORM_ID + '" ',
    'onsubmit="ytSyndUploader.prepareSyndicatedUpload(',
    'this.' + ytSyndUploader.VIDEO_UPLOAD_TITLE_INPUT_ID + '.value) ',
    'return false;" class="' + ytSyndUploader.GLOBAL_CSS_CLASS + '" >',
    'Enter video title:<br /><input type="text" maxlength="60" size="50" id="' +
    ytSyndUploader.VIDEO_UPLOAD_TITLE_INPUT_ID + '" name="' +
    ytSyndUploader.VIDEO_UPLOAD_TITLE_INPUT_ID + '" ',
    'type="text" /><br />',
    '<input id="' +
    ytSyndUploader.VIDEO_UPLOAD_SUBMIT_INPUT_ID +
    '" type="submit" value="Upload">',
    '</form>'].join('');

    $('#' + ytSyndUploader.VIDEO_UPLOAD_DIV_ID).append(videoUploadForm);
    ytSyndUploader.truncateVideoTitle('#' + 
      ytSyndUploader.VIDEO_UPLOAD_FORM_ID);
}

/**
 * Truncate title dynamically to 60 chars. Display total of remaining chars
 * and alert if user is going over 60.
 *
 * @param {String} The id of the input element in question.
 * @return void
 */
ytSyndUploader.truncateVideoTitle = function(idOfInputElement) {
  var SYND_UPLOADER_DEFAULT_MSG = ' chars remain';
  var SYND_UPLOADER_MAX_CHARS = 60;
  var SYND_UPLOADER_CHAR_COUNTER_SPAN_ID = 'truncateInput';
  $('<span/>').attr('id', SYND_UPLOADER_CHAR_COUNTER_SPAN_ID).html(
    SYND_UPLOADER_MAX_CHARS + SYND_UPLOADER_DEFAULT_MSG).appendTo(
      idOfInputElement);
  $(idOfInputElement).bind('keypress', function(e) {
    var data = $('#' + ytSyndUploader.VIDEO_UPLOAD_TITLE_INPUT_ID).attr(
      'value');
    var len = SYND_UPLOADER_MAX_CHARS - data.length; 
    $('#' + SYND_UPLOADER_CHAR_COUNTER_SPAN_ID).html(
      len + SYND_UPLOADER_DEFAULT_MSG);
    if (len < 20) {
      $('#' + SYND_UPLOADER_CHAR_COUNTER_SPAN_ID).css('color', 'red');
    } else {
      $('#' + SYND_UPLOADER_CHAR_COUNTER_SPAN_ID).css('color', 'black');
    }
  });
}


/**
 *  
 * @param {Object} data Data in the form of:
 * {
      'article_id_123737': [
        { 'id': 'iHBe-9Rh728',
          'uploader': 'foobar1',
          'created': 'created-Timestamp',
          'status': 'REJECT'
        }], [{ ... } ]}
 * @return void
 */
ytSyndUploader.renderVideoAdminForm = function(data) {

  $('<form/>').attr({
      id: ytSyndUploader.ADMIN_FORM_ID,
      action: '/moderate', // where to POST to?
      method: 'POST',
      name: ytSyndUploader.ADMIN_FORM_NAME}).appendTo(
        '#syndicated_uploader_admin_interface');
  $('<table/>').attr('id', ytSyndUploader.ADMIN_TABLE_ID).addClass(
    ytSyndUploader.GLOBAL_CSS_CLASS).appendTo(
    '#' + ytSyndUploader.ADMIN_FORM_ID);
  $('<input/>').attr({
    type: 'submit',
    name: ytSyndUploader.ADMIN_FORM_SUBMIT_NAME,
    value: ytSyndUploader.ADMIN_FORM_SUBMIT_VALUE}).addClass(
    ytSyndUploader.GLOBAL_CSS_CLASS).appendTo(
    '#' + ytSyndUploader.ADMIN_FORM_ID);
  var article_name = null;
  for (a in data) {
    if (article_name == null) {
      // todo actually do something intelligent here :)
      $('<p/>').text(a).appendTo(ytSyndUploader.ADMIN_FORM_ID);
    }
    // render video
    var videos = data[a];
    var numVideosToRender = videos.length;
    var done = false; // todo: doesnt do anything for now, maybe useful later
                      // if we want to do anything when done rendering
    for (var i = 0; i < numVideosToRender; i++) {
      if (i == numVideosToRender-1) {
        done = true;
      }
      ytSyndUploader.renderVideoMetadataForAdmin(
        videos[i], i % 2, done);  
    }
  }
}

/*
  expect
          { 'id': 'd_8_k1am-RM',
          'uploader': 'foobar3',
          'created': 'created2-Timestamp',
          'status': 'UNREVIEWED'
        },
    
*/

ytSyndUploader.renderVideoMetadataForAdmin = function(video_data, even, done) {
  // build metadata wrapped inside form for select/moderation
  // css style based on even / odd
  // build a table.... 
  console.log('rendervideometa data for ' + video_data.id);
  //todo: validate video_data prior to starting all this...
  
  $('<tr>').attr('id', 'tr_' + video_data.id).addClass(
    ytSyndUploader.ADMIN_TABLE_TR).addClass(
      even ? ytSyndUploader.CSS_ODD : ytSyndUploader.CSS_EVEN).addClass(
      ytSyndUploader.GLOBAL_CSS_CLASS).appendTo(
    '#' + ytSyndUploader.ADMIN_TABLE_ID)
  
  var uri = ytSyndUploader.URI_YOUTUBE_SINGLE_VIDEO_GET + video_data.id +
    ytSyndUploader.V_2_ALT_JSON;
  ytSyndUploader.log('Fetching uri: ' + uri);

  // using jQuery to make an AJAX request
  $.getJSON(uri, function(data) {
    if (data) {
      $('<td/>').attr('id', 'td_' + video_data.id + '_0').addClass(
        ytSyndUploader.ADMIN_TABLE_TD).appendTo(
        '#tr_' + video_data.id).addClass(
          ytSyndUploader.GLOBAL_CSS_CLASS);

      $('<div/>').attr('id', 'video_moderation_div_' + 
        video_data.id).addClass(ytSyndUploader.ADMIN_RADIO_DIV + ' ' +
        ytSyndUploader.GLOBAL_CSS_CLASS).appendTo(
          'td#td_' + video_data.id + '_0');

      $('<input/>').attr({
        type: 'radio',
        name: ytSyndUploader.ADMIN_RADIO_GROUP_NAME + video_data.id,
        id: ytSyndUploader.ADMIN_RADIO_GROUP_NAME + video_data.id + '_approve',
        value: 'APPROVE'}).appendTo(
          'div#video_moderation_div_' + video_data.id).after('Approve<br/>');
      // todo couldnt get the ternary to dynamically set checked inside
      // dom node creation... find a better way to handle this 

      if (video_data.status == 'APPROVE') {
        $('#' + ytSyndUploader.ADMIN_RADIO_GROUP_NAME + video_data.id +
          '_approve').attr(
          'checked', 'checked');
      }
      $('<input/>').attr({
        type: 'radio',
        name: ytSyndUploader.ADMIN_RADIO_GROUP_NAME + video_data.id,
        id: ytSyndUploader.ADMIN_RADIO_GROUP_NAME + video_data.id + 
        '_unreviewed', value: 'UNREVIEWED'}).appendTo(
          'div#video_moderation_div_' + video_data.id).after('Ignore<br/>');
      if (video_data.status == 'UNREVIEWED') {
        $('#' + ytSyndUploader.ADMIN_RADIO_GROUP_NAME + video_data.id +
          '_unreviewed').attr('checked', 'checked');
      }
      $('<input/>').attr({
        type: 'radio',
        name: ytSyndUploader.ADMIN_RADIO_GROUP_NAME + video_data.id,
        id: ytSyndUploader.ADMIN_RADIO_GROUP_NAME + video_data.id + '_rejected',
        value: 'REJECT'}).appendTo(
          'div#video_moderation_div_' + video_data.id).after('Reject<br/>');
      if (video_data.status == 'REJECT') {
        $('#' + ytSyndUploader.ADMIN_RADIO_GROUP_NAME + video_data.id + 
          '_rejected').attr('checked', 'checked');
      }     
 
      $('<td/>').attr('id', 'td_' + video_data.id + '_1').addClass(
        ytSyndUploader.ADMIN_TABLE_TD).appendTo(
        '#tr_' + video_data.id).addClass(
          ytSyndUploader.GLOBAL_CSS_CLASS);


      var entry = data.entry;
      var swfUrl = null;
      for(var i in entry.media$group.media$content) {
        if(entry.media$group.media$content[i].yt$format == '5') {
          swfUrl = entry.media$group.media$content[i].url;
        }
      }
      if(!swfUrl) {
        // TODO figure out some way to handle this...
        ytSyndUploader.log('No SWF found for video id ' + uri, 'error');
      } 

      for (var i in entry.media$group.media$thumbnail) {
        if (entry.media$group.media$thumbnail[i].width < 480) {
          var thumbnail = entry.media$group.media$thumbnail[i];
          $('<img/>').attr(
            { src: thumbnail.url,
              width: thumbnail.width,
              height: thumbnail.height
            }).appendTo(
              '#td_' + video_data.id + '_1').addClass(
              ytSyndUploader.GLOBAL_CSS_CLASS + ' ' +
              ytSyndUploader.ADMIN_VIDEO_METADATA_THUMBNAIL_IMG);
        }
      }
           
      $('<td/>').attr('id', 'td_' + video_data.id + '_2').appendTo(
        '#tr_' + video_data.id).addClass(
          ytSyndUploader.GLOBAL_CSS_CLASS + ' ' + ytSyndUploader.CACHED_CLASS +
          ' ' + ytSyndUploader.ADMIN_TABLE_TD);

      var videoTitle = entry.title.$t || 'Title not found';
      if (swfUrl) {
        swfUrl += '&autoplay=1';
        $('<span/>').text(videoTitle).appendTo(
        '#td_' + video_data.id + '_2').wrap('<a id="play_video_' + video_data.id +
          '" href="#">').attr('class',
          ytSyndUploader.ADMIN_VIDEO_METADATA_TITLE_SPAN).addClass(
          ytSyndUploader.GLOBAL_CSS_CLASS);
        $('#play_video_' + video_data.id).click(
          ytSyndUploader.displayMovie(swfUrl, videoTitle));
      } else {
        $('<span/>').text(videoTitle).appendTo(
        '#td_' + video_data.id + '_2').attr(
        'class', ytSyndUploader.ADMIN_VIDEO_METADATA_TITLE_SPAN).addClass(
          ytSyndUploader.GLOBAL_CSS_CLASS);
      }


      $('<br />').attr('clear', 'both').appendTo(
          '#td_' + video_data.id + '_2').addClass(
          ytSyndUploader.GLOBAL_CSS_CLASS);

      $('<span/>').attr(
        'class', ytSyndUploader.ADMIN_VIDEO_METADATA_UPLOADER_SPAN).text(
        'uploaded by ').appendTo('#td_' + video_data.id + '_2').addClass(
        ytSyndUploader.GLOBAL_CSS_CLASS);
      
      $('<a/>').attr({target: '_blank',
        href: 'http://www.youtube.com/user/' + video_data.uploader}).addClass(
        ytSyndUploader.GLOBAL_CSS_CLASS + ' ' +
        ytSyndUploader.VIDEO_METADATA_UPLOADER_A_CLASS).text(
        video_data.uploader).appendTo('#td_' + video_data.id + '_2',
        video_data.uploader);

      $('<br />').attr('clear', 'both').appendTo(
          '#td_' + video_data.id + '_2').addClass(
          ytSyndUploader.GLOBAL_CSS_CLASS);

      // todo make unique span class for this...
      $('<span/>').attr(
        'class', ytSyndUploader.ADMIN_VIDEO_METADATA_UPLOADER_SPAN).text(
        'uploaded on ' + video_data.created).appendTo('#td_' +
          video_data.id + '_2').addClass(ytSyndUploader.GLOBAL_CSS_CLASS);

      if (done) {
        ytSyndUploader.log('Done building ADMIN form');
      }
    } // end IF data
});
}


/**
 * Using the lightbox plugin, display a SWF for an embedded video.
 * @param {String} swfUrl The URL for the video swf that is to be displayed
 * @param {String} videoTitle The title of the video that is to be displayed
 */
ytSyndUploader.displayMovie = function(swfUrl, videoTitle) {
  return function() {
    // Write the div that the swf will be rendered to into our hidden div
    $("#video_box").html('<div id="ytapiplayer"></div>');
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
    $("#TB_window").bind('unload', ytSyndUploader.clearVideoBox);
   }
}

/**
 * todo comment
 */
ytSyndUploader.clearVideoBox = function() {
  $('#video_box').html('');
}

/**
 * Simple wrapper around console.log.
 * @param {String} message The message to log
 * @param {String} type The type of message
 * @return void
 */
ytSyndUploader.log = function(message, type) {
  if (ytSyndUploader.LOG_TO_CONSOLE) {
    var d = new Date();
    var time = d.getTime();
    var messageString = (type) ? time + ' - ' + type.toUpperCase() +
      ' | ' + message : time + ' - ' + message;
    console.log(messageString);
  }
}

