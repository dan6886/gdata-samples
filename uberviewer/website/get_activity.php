<?php
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
 
require_once 'config.inc.php';
require_once 'Zend/Loader.php';
Zend_Loader::loadClass('Zend_Gdata_YouTube');
Zend_Loader::loadClass('Zend_Gdata_AuthSub');

/*
 * Echo feed from either memcache or DB.
 * @param integer $page The page of results to display
 * @return void
 */
function retrieveFeed($page = 1) {
  $memcache = getMemcache();
  $feed = null;
  if ($memcache !== null) {
    $feed = $memcache->get('the-ueber-feed_page-' . $page);
  }
  if ($feed && strlen($feed) > 10) {
    return $feed;
  } else {
    $dbFeedArray = getFeedFromDB($page);
    $metaDataFeedArray = addMetaData($dbFeedArray);
    unset($dbFeedArray);
    $jsonOutput = json_encode($metaDataFeedArray);

    $memcache = getMemcache();
    if ($memcache !== null) {
      $expirationTime = $GLOBALS['ueber-activity-viewer-php_config']['feed_expiry_time'] ;
      $key = 'the-ueber-feed_page-'. $page;
      $memcache->set($key, $jsonOutput, MEMCACHE_COMPRESSED, $expirationTime);
    }
    return $jsonOutput;
  }
}

/*
 * Returns a Memcache object to interact with the memcache servers
 * @return Resource|null Returns a reference to memcache if enabled/found or null
 */ 
function getMemcache() {
  if($GLOBALS['ueber-activity-viewer-php_config']['enable_memcache']) {
    $memcache = new Memcache;
    $server = $GLOBALS['ueber-activity-viewer-php_config']['memcache_server'];
    $port = $GLOBALS['ueber-activity-viewer-php_config']['memcache_port'];
    if (@$memcache->connect($server, $port) !== FALSE) {
      return $memcache;
    }
  }
  return null;
}

/**
 * Return the entire feed of activities from the DB
 * @param integer $page The page of results to retrieve from the DB
 * @return array|null The feed of activities as array or null if error
 */
function getFeedFromDB($page = 1) {
  $mysqli = new mysqli(
    $GLOBALS['ueber-activity-viewer-php_config']['mysql_hostname'],
    $GLOBALS['ueber-activity-viewer-php_config']['mysql_username'],
    $GLOBALS['ueber-activity-viewer-php_config']['mysql_password'],
    $GLOBALS['ueber-activity-viewer-php_config']['mysql_database'],
    $GLOBALS['ueber-activity-viewer-php_config']['mysql_port'],
    $GLOBALS['ueber-activity-viewer-php_config']['mysql_socket']);
  if (mysqli_connect_errno()) {
    error_log("Connect failed: " .  mysqli_connect_error());
    return null;
  }
  $output = array();
  $numItemsPerPage = $GLOBALS['ueber-activity-viewer-php_config']['num_items_to_page'];

  if (intval($page) == 0) {
    $page = 1;
  }

  if ($page > 1) {
    $statement = $mysqli->prepare(
      "SELECT username, updated, json FROM activity ORDER BY updated DESC LIMIT ? OFFSET ?");
    $offset = $numItemsPerPage*($page);
    $statement->bind_param('ii', $numItemsPerPage, $offset);
  } else {
    $statement = $mysqli->prepare(
      "SELECT username, updated, json FROM activity ORDER BY updated DESC LIMIT ?");
    $statement->bind_param('i', $numItemsPerPage);
  }

  $statement->execute();
  $statement->store_result();
  $returnValue = null;
  if ($statement->num_rows < 1) {
    error_log("No rows returned: " . $statement->num_rows);
  } else {
    $statement->bind_result($username, $updated, $json);
    while ($statement->fetch()) {
      $output[] = array('author' => $username, 'updated' => $updated, 'json' => $json);
    }
    $returnValue = $output;
  }
  $statement->close();
  $mysqli->close();
  return $returnValue;
}

/**
 * Add metadata from the YouTube API or memcache for activity entries.
 * @param array $feedArray An array of activity entries for which we need metadata
 * @return array The new feed which contains metadata.
 */
function addMetaData($feedArray) {
  $output = array();
  foreach($feedArray as $activityStream) {
    $author = $activityStream['author'];
    $updated = $activityStream['updated'];
    $event = json_decode($activityStream['json'], TRUE);

    if (strpos($event['event'], 'VIDEO') !== FALSE) {
      $event['metadata'] = getVideoMetadata($event['videoid']);
    } else {
      $event['metadata'] = getUserProfileMetadata($event['username']);
    }
    $output[] = array('author' => $author, 'updated' => $updated,
      'event' => $event);
  }
  return $output;
}

/**
 * Add metadata from the YouTube API or memcache for a user profile.
 * @param string $username The username for which to fetch metadata
 * @return array|null An associated array of metadata, if found.
 */
function getUserProfileMetadata($username) {
  // look in memcache first
  $memcache = getMemcache();
  if ($memcache) {
    $outputArray = $memcache->get('username-' . $username);
    if ($outputArray) {
      return $outputArray;
    }
  }

  $yt = getYouTubeService();
  $userProfile = null;
  try {
   $userProfile = $yt->getUserProfile($username);
  } catch(Exception $e) {
    error_log("Could not get user profile from YT API: " .
      $e->getMessage());
    return null;
  }
  $profileData                  = array();
  $profileData['about_me']      = $userProfile->getAboutMe()->text;
  $profileData['first_name']    = $userProfile->getFirstName()->text;
  $profileData['last_name']     = $userProfile->getLastName()->text;
  $thumbnail = $userProfile->getThumbnail();
  if ($thumbnail) {
    $profileData['thumbnail_url'] = $thumbnail->getUrl();
  }
  $profileData['age']           = $userProfile->getAge()->text;
  $profileData['books']         = $userProfile->getBooks()->text;
  $profileData['company']       = $userProfile->getCompany()->text;
  $profileData['hobbies']       = $userProfile->getHobbies()->text;
  $profileData['hometown']      = $userProfile->getHometown()->text;
  $profileData['location']      = $userProfile->getLocation()->text;
  $profileData['movies']        = $userProfile->getMovies()->text;
  $relLink                      = $userProfile->getLink('related');
  if ($relLink) {
   $profileData['website_url']       = $relLink->getHref();
  }
  $profileData['gender']              = $userProfile->getGender()->text;
  $profileData['relationship']        = $userProfile->getRelationship()->text;
  $profileData['music']               = $userProfile->getMusic()->text;
  $profileData['occupation']          = $userProfile->getOccupation()->text;
  $profileData['school']              = $userProfile->getSchool()->text;
  $profileData['member_since']        = $userProfile->getPublished()->text;
  $profileData['last_profile_update'] = $userProfile->getUpdated()->text;
  $profileData['num_favorites']       = $userProfile->getFeedLink(
   'http://gdata.youtube.com/schemas/2007#user.favorites')->countHint;
  $profileData['num_contacts']        = $userProfile->getFeedLink(
   'http://gdata.youtube.com/schemas/2007#user.contacts')->countHint;
  $profileData['num_subscriptions']   = $userProfile->getFeedLink(
   'http://gdata.youtube.com/schemas/2007#user.subscriptions')->countHint;
  $profileData['num_uploads']         = $userProfile->getFeedLink(
   'http://gdata.youtube.com/schemas/2007#user.uploads')->countHint;
  $statistics                         = $userProfile->getStatistics();
  $profileData['channel_views']       = $statistics->getViewCount();
  $profileData['videos_watched']      = $statistics->getVideoWatchCount();
  $profileData['subscribers']         = $statistics->getSubscriberCount();
  $profileData['last_login']          = $statistics->getLastWebAccess();

  $outputArray = array();
  // remove items that are null
  foreach($profileData as $key=>$value) {
   if ($value) {
     $outputArray[$key] = $value;
   }
  }
  $memcache = getMemcache();
  if ($memcache) {
    $key = 'username-' . $username;
    $metadata_expiration = $GLOBALS['ueber-activity-viewer-php_config']['metadata_expiry_time'];
    $memcache->set($key, $outputArray, MEMCACHE_COMPRESSED, $metadata_expiration);
  }
  return $outputArray;
}

/**
 * Get video metadata from the YouTube API or memcache
 * @param string $videoId The ID of the video for which to get metadata
 * @return array An associated array of metadata
 */
function getVideoMetadata($videoId) {
  // look in memcache first
  $memcache = getMemcache();
  if ($memcache) {
    $outputArray = $memcache->get('video-' . $videoId);
    if ($outputArray) {
      return $outputArray;
    }
  }

  $yt = getYouTubeService();
  $videoEntry = null;
  try {
    $videoEntry = $yt->getVideoEntry(null,
      'http://gdata.youtube.com/feeds/api/videos/' .
      $videoId);
  } catch (Exception $e) {
    error_log("Could not get video from YT API: " .
      $e->getMessage());
    return null;
  }
  $videoData                      = array();
  $videoData['video_title']       = $videoEntry->getVideoTitle();
  $videoData['watch_page_url']    = $videoEntry->getVideoWatchPageUrl();
  $videoData['swf_url']           = $videoEntry->getFlashPlayerUrl();
  $videoData['duration']          = $videoEntry->getVideoDuration();
  $videoData['view_count']        = $videoEntry->getVideoViewCount();
  $videoData['video_recorded']    = $videoEntry->getVideoRecorded();
  $videoData['video_description'] = $videoEntry->getVideoDescription();
  $tags = $videoEntry->getVideoTags();
  if ($tags) {
    if (count($tags) > 5) {
      $tags                  = array_slice($tags, 0, 5);
    }
    $videoData['video_tags'] = 'Tags: ' . implode(' ', $tags);
  }
  $geoLoc = $videoEntry->getVideoGeoLocation();
  if ($geoLoc) {
    $videoData['geo_location'] = 'Geo location: ' . implode(', ', $geoLoc);
  }
  $rating = $videoEntry->getVideoRatingInfo();
  if ($rating) {
    $ratingString = 'Ratings so far: ';
    foreach($rating as $key=>$value) {
      $ratingString .= strtoupper(substr($key, 0, 1)) . substr($key, 1) . " : " . $value . " | "; 
    }
      $videoData['video_rating'] = trim($ratingString);
  }
  $videoData['video_category'] = 'Category: ' . $videoEntry->getVideoCategory();

  $videoThumbnails = $videoEntry->getVideoThumbnails();
  if (count($videoThumbnails)) {
    $videoData['thumb_url'] = $videoThumbnails[0]['url'];
  }
  $outputArray = array();
  // strip out items that are null
  foreach($videoData as $key=>$value) {
    if ($value) {
      $outputArray[$key] = $value;
    }
  }
  $memcache = getMemcache();
  if ($memcache) {
    $key = 'video-' . $videoId;
    $metadata_expiration = $GLOBALS['ueber-activity-viewer-php_config']['metadata_expiry_time'];
    $memcache->set($key, $outputArray, MEMCACHE_COMPRESSED, $metadata_expiration);
  }
  return $outputArray;
}

/**
 * Get the URL for the AuthSub login page.
 *
 * @return string The URL
 */
function createLoginUrl() {
  $next = "http://{$_SERVER['SERVER_NAME']}{$_SERVER['PHP_SELF']}";
  $scope = 'http://gdata.youtube.com';
  $secure = false;
  $session = true;
  return Zend_Gdata_AuthSub::getAuthSubTokenUri($next, $scope, $secure, $session);
}

/**
 * Add a username to the DB using their single-use AuthSub token.
 *
 * @param string $token The single-use AuthSub token of the user to be added.
 * @return void
 */
function addUsername($token) {
  $httpClient = Zend_Gdata_AuthSub::getHttpClient($token);
  $yt = new Zend_Gdata_YouTube($httpClient, 'YT-UeberActivityViewer', 
    $GLOBALS['ueber-activity-viewer-php_config']['client_id'],
    $GLOBALS['ueber-activity-viewer-php_config']['dev_key']);
  $yt->setMajorProtocolVersion(2);

  try {
    $userProfile = $yt->getUserProfile('default');
  } catch (Zend_Gdata_Exception $e) {
    error_log("Error getting userProfile: " . $e->getMessage());
    return null;
  }
  unset($yt);
  if (!$userProfile) {
    error_log("UserProfile is null.");
    return null;
  }
  $username = $userProfile->getUsername();
  $userhash = null;
  // get hash
  if ($username) {
    $yt = getYouTubeService();

    try {
      $activitiesFeed = $yt->getFeed('http://gdata.youtube.com/feeds/api/users/' .
        $username . '/events');
    } catch (Exception $e) {
      echo "Error retrieving user events feed for $username | " . $e->getMessage();
    print_r($yt);
    }
    $updatesLink = $activitiesFeed->getLink('updates');
    $hashHref = $updatesLink->getHref();
    $userhash = substr($hashHref, (strpos($hashHref, '#')+1));
    unset($yt);
  } else {
    echo "Could not get user profile for token $token.";
    error_log("Could not get user profile for token $token.");
    header('Location: ' . "http://{$_SERVER['SERVER_NAME']}{$_SERVER['PHP_SELF']}");
  }
  
  $mysqli = new mysqli(
    $GLOBALS['ueber-activity-viewer-php_config']['mysql_hostname'],
    $GLOBALS['ueber-activity-viewer-php_config']['mysql_username'],
    $GLOBALS['ueber-activity-viewer-php_config']['mysql_password'],
    $GLOBALS['ueber-activity-viewer-php_config']['mysql_database'],
    $GLOBALS['ueber-activity-viewer-php_config']['mysql_port'],
    $GLOBALS['ueber-activity-viewer-php_config']['mysql_socket']);
  if (mysqli_connect_errno()) {
    error_log("Connect failed: " .  mysqli_connect_error());
    return null;
  }
  $username = $mysqli->real_escape_string($username);
  $userhash = $mysqli->real_escape_string($userhash);
  
  $statement = $mysqli->prepare(
      "INSERT IGNORE INTO user (username, hash) VALUES (?,?)");
  $statement->bind_param('ss', $username, $userhash);
  $statement->execute();
  $statement->close();
  $mysqli->close();

  header('Location: ' . "http://{$_SERVER['SERVER_NAME']}{$_SERVER['PHP_SELF']}");
}

/**
 * Return a new instance of a v2 YouTube service object
 * @return Zend_Gdata_YouTube YouTube service object
 */
function getYouTubeService() {
  $yt = new Zend_Gdata_YouTube(null, 'YT-UeberActivityViewer', 
    $GLOBALS['ueber-activity-viewer-php_config']['client_id'],
    $GLOBALS['ueber-activity-viewer-php_config']['dev_key']);
  $yt->setMajorProtocolVersion(2);
  return $yt;
}

/**
 * The main loop for the application
 */
function handleRequest() {
  if (isset($_GET['token'])) {
    addUsername($_GET['token']);
  } else if (isset($_GET['action'])) {
    echo retrieveFeed($_GET['page']);
  }
}

handleRequest();
?>