<?php
/* Copyright (c) 2007 Google Inc.
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
 * Author: Jeff Fisher <api.jfisher@google.com>
 */

require_once 'config.inc.php';

/**
 * Note that the Gdata components of the Zend Framework must be installed
 * on the machine that is running this code. Please refer to our documentation:
 *
 * http://code.google.com/apis/gdata/articles/php_client_lib.html 
 */
require_once 'Zend/Loader.php';
Zend_Loader::loadClass('Zend_Gdata_YouTube');
Zend_Loader::loadClass('Zend_Gdata_AuthSub');

session_start();

// Returns a Zend_Gdata_YouTube service object with keys and such
function getYtService() {
  $applicationId = "YTAViewer";
  $clientId = $GLOBALS['ytaviewer_config']['client_id'];
  $devKey = $GLOBALS['ytaviewer_config']['dev_key'];
  $httpClient = Zend_Gdata_AuthSub::getHttpClient($_SESSION['sessionToken']);
  $yt = new Zend_Gdata_YouTube($httpClient, $applicationId, $clientId, $devKey);
  $yt->setMajorProtocolVersion(2);
  return $yt;
}

// Returns a Memcache object to interact with the memcached servers
function getMemcache() {
  $memcache = new Memcache;
  $server = $GLOBALS['ytaviewer_config']['memcache_server'];
  $port = $GLOBALS['ytaviewer_config']['memcache_port'];
  $memcache->connect($server, $port) or die ("Could not connect to memcached");
  return $memcache;
}

// Fetches information about a video based upon its YouTube ID and stores
// this data in memcache (if endabled).
function fetchVideoMetadata($videoId) {

  if($GLOBALS['ytaviewer_config']['enable_memcache']) {
    $memcache = getMemcache();
    $video = $memcache->get("video-$videoId");
  }
  else {
    $video = false;
  }

  if($video) {
    return $video;
  }

  try {
    $yt = getYtService();
    $videoEntry = $yt->getVideoEntry($videoId);

    $video = Array();
    $video['id'] = $videoEntry->getVideoId();
    $video['title'] = $videoEntry->getVideoTitle();
    $video['view_count'] = $videoEntry->getVideoViewCount();
    $video['rating'] = $videoEntry->getVideoRatingInfo();
    $thumbnails = $videoEntry->getVideoThumbnails();
    $video['thumbnail'] = $thumbnails[0]['url'];
    $video['player'] = $videoEntry->getFlashPlayerUrl();
    $video['uploader'] = $videoEntry->author[0]->name->text;

  } catch(Zend_Gdata_App_HttpException $e){
    $httpStatus = $e->getResponse()->getStatus();

    if($httpStatus >= 500) {
      $video = 'SERVER_ERROR';
    } else {
      $video = 'NOT_AVAILABLE';
    }
  }
  // If memcache is enable, store the video data for the set expiry time
  if($GLOBALS['ytaviewer_config']['enable_memcache']) {
    $expiration_time = $GLOBALS['ytaviewer_config']['metadata_expiry_time'];
    $memcache->set("video-$videoId", $video, MEMCACHE_COMPRESSED, $expiration_time);
  }
  return $video;
}

// Takes an activity feed and crunches it down into a lightweight JSON 
// representation that is stored in memcache based upon the value of $feedId
function renderActivityFeed($feed, $feedId) {
  
  if($GLOBALS['ytaviewer_config']['enable_memcache']) {
    $memcache = getMemcache();
    $compactFeed = $memcache->get($feedId);
  } else {
    $compactFeed = false;
  }

  if(!$compactFeed) {
    $compactFeed = Array();

    foreach($feed as $entry) {
      $cEntry = Array();
      $cEntry['author'] = $entry->getAuthorName();
      $cEntry['activity_type'] = $entry->getActivityType();
      $cEntry['updated'] = $entry->getUpdated()->text;

      switch($cEntry['activity_type']) {
        case 'video_rated':
          $cEntry['rating'] = $entry->getRatingValue();
        case 'video_shared':
        case 'video_favorited':
        case 'video_commented':
        case 'video_uploaded':
          $cEntry['video_info'] = fetchVideoMetadata($entry->getVideoId()->text);
          break;
        case 'friend_added':
        case 'user_subscription_added':
          $cEntry['username'] = $entry->getUsername()->text;
          break;
      }
      $compactFeed[] = $cEntry;
    }
    $compactFeed = json_encode($compactFeed);

    if($GLOBALS['ytaviewer_config']['enable_memcache']) {
      $expiration_time = $GLOBALS['ytaviewer_config']['feed_expiry_time'];
      $memcache->set($feedId, $compactFeed, MEMCACHE_COMPRESSED, $expiration_time);
    }
  }
  return $compactFeed;
}

// Figures out the current user's YouTube username and stores it in the 
// session
function fetchUsername() {
  if(isset($_SESSION['ytUsername'])) {
    $username =  $_SESSION['ytUsername'];
  } else {
    try {
      $yt = getYtService();
      $userProfileEntry = $yt->getUserProfile('default');
      $username = $userProfileEntry->getUsername()->text;
      $_SESSION['ytUsername'] = $username;
    } catch(Zend_Gdata_App_HttpException $e){
      $username = 'UNKNOWN';
    }
  }
  return $username;
}

// Generates an AuthSub URL to authorize this application
function getAuthSubUrl() {
  $next = "http://{$_SERVER['SERVER_NAME']}{$_SERVER['PHP_SELF']}";
  $scope = 'http://gdata.youtube.com';
  $secure = false;
  $session = true;
  return Zend_Gdata_AuthSub::getAuthSubTokenUri($next, $scope, $secure, $session);
}

// Handles exchanging for an AuthSub session token
function exchangeToken($token) {
  $_SESSION['sessionToken'] = Zend_Gdata_AuthSub::getAuthSubSessionToken($token);
  redirect($_SERVER['PHP_SELF']);
}

// Clears all state when the user wants to log out
function doLogout() {
  unset($_SESSION['sessionToken']);
  unset($_SESSION['ytUsername']);
  redirect($_SERVER['PHP_SELF']);
}

// Redirects the user by using the Location header
function redirect($url) {
  header("Location: $url");
  exit;
}

// Simple callback to tell if a user is logged in
function isUserLoggedIn() {
  return isset($_SESSION['sessionToken']);
}

// Function that kills the script if the user is not logged in
function requireLogin() {
  if(! isUserLoggedIn()) {
    echo "Sorry, you have to be logged in to do this.";
    exit;
  }
}

// Renders the page with JavaScript variables set for the AJAX UI
function renderPage() {
  
  if(isUserLoggedIn()) {
    $loggedIn = 'true';
    $actionUrl = "{$_SERVER['PHP_SELF']}?action=logout";
    $username =  $_SESSION['ytUsername'];
  } else {
    $loggedIn = 'false';
    $actionUrl = htmlentities(getAuthSubUrl());
  }

  // Print out the HTML of the page
  echo <<<END_OF_HTML
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" 
    "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
<head>
  <script type="text/javascript">
  var loggedIn = $loggedIn;
  var actionUrl = '$actionUrl';
  var authenticatedUsername = '$username';
  </script>
  <!-- Javascript includes -->
  <script type="text/javascript" src="js/ext/swfobject.js"></script>
  <script type="text/javascript" src="js/ext/jquery-1.3.1.min.js"></script>
  <script type="text/javascript" src="js/ext/thickbox-compressed.js"></script>
  <script type="text/javascript" src="js/ext/date_magic.js"></script>
  <script type="text/javascript" src="js/frontend.js"></script>
  <!-- CSS includes -->
  <link rel="stylesheet" href="css/style.css" type="text/css" media="screen" />
  <link rel="stylesheet" href="css/ext/thickbox.css" type="text/css" media="screen" />
  <title>Activity Viewer for YouTube</title>
</head>
<body>
<div id="all"><br />
  <div id="top">
    <div class="title">Activity Viewer for YouTube</div>
    <div id="loginlogout"><a class="login_link" href="$actionUrl">Log in</a></div>
    <!-- the feed selection and username search options -->
    <div id="options">
      <div id="friend_user_select_div">Select feed type: <form id="feed_type_select" onClick="ytActivityApp.switchFeedURI();">
        <input id="activity_feed" type="radio" name="feed_select" value="activity" checked /> Your activity
        <input id="friend_feed" type="radio" name="feed_select" value="friend" /> Friend activity
        <input id="username_feed" type="radio" name="feed_select" value="usernames" /> Activity for user(s):
        </form>
          <div id="user_input_fake_form">
          <input id="users_string_input" type="text" name="users_string"
          onfocus="ytActivityApp.clearUserNameForm();" 
          onkeypress="if (event.keyCode == 13) ytActivityApp.cleanFormInputAndRequestActivityFeed(document.getElementById('users_string_input').value);"/>
          <button name="submit" value="foo" onClick="ytActivityApp.cleanFormInputAndRequestActivityFeed(document.getElementById('users_string_input').value);">Search</button><br />
            <span class="dark_text">(enter up to 20 names, separated by commas)</span>
          </div>
      </div>
    </div>
    <!-- div to display various status messages -->
    <div id="status">
      <div id="user_status"></div>
    </div>
  </div>
  <br class="clear_both" />
  <!-- div to render feed output into -->
  <div id="activity_stream"></div>
  <br class="clear_both" />
</div>
<a id="play_video" href="#TB_inline?height=366&amp;width=425&amp;inlineId=videobox" class="thickbox"></a>
<!-- hidden div to render the embedded player -->
<div id="videobox"></div>
</body>
</html>
END_OF_HTML;
}

// Return a user activity feed in JSON encoding to the AJAX frontend
function returnUserFeed($username = null) {
  requireLogin();
  if(!$username) {
    $username = fetchUsername();
  }
  
  try {
    $yt = getYtService();
    $activityFeed = $yt->getActivityForUser($username);
    echo renderActivityFeed($activityFeed, "useractivity-$username");
  } catch(Zend_Gdata_App_HttpException $e){
    $httpStatus = $e->getResponse()->getStatus();

    if($httpStatus > 500) {
      echo json_encode('SERVER_ERROR');
    } else {
      echo json_encode('NOT_AVAILABLE');
    }
  }
}

// Return a friend activity feed in JSON encoding to the AJAX frontend
function returnFriendFeed() {
  requireLogin();
  $username = fetchUsername();
  
  try {
    $yt = getYtService();
    $friendActivityFeed = $yt->getFriendActivityForCurrentUser();
    echo renderActivityFeed($friendActivityFeed, "friendactivity-$username");
  } catch(Zend_Gdata_App_HttpException $e){
    $httpStatus = $e->getResponse()->getStatus();

    if($httpStatus > 500) {
      echo json_encode('SERVER_ERROR');
    } else {
      echo json_encode('NOT_AVAILABLE');
    }
  }
}

// Return the current user's YouTube username to the frontend in JSON encoding
function returnUsername() {
  requireLogin();
  $username = fetchUsername();
  echo json_encode($username);
}

// Handle the current request and parse any query parameters.
function handleRequest() {
  if(isset($_GET['token'])) {
    exchangeToken($_GET['token']);
  } else if(isset($_GET['action'])) {
    if($_GET['action'] == 'logout') {
      doLogout();
    }
  } else if(isset($_GET['q'])) {

    switch($_GET['q']) {
      case 'userfeed':
        returnUserFeed($_GET['who']);
        break;
      case 'friendfeed':
        returnFriendFeed();
        break;
      case 'whoami':
        returnUsername();
        break;
      default:
        echo "Invalid request.";
    }
  } else {
    renderPage();
  }
}
// call the "main" method for the application.
handleRequest();

?>
