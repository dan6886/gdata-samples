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
require_once 'get_activity.php';
?>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
"http://www.w3.org/TR/html4/loose.dtd">
  <head>
  <title>&Uuml;ber activity viewer</title>
  <link href="css/ueber-activity-viewer.css" rel="stylesheet" type="text/css">
  <link href="css/ext/thickbox.css" rel="stylesheet" type="text/css" media="screen">
  <META http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <script type="text/javascript" src="js/ext/jquery-1.3.2.min.js"></script>
  <script type="text/javascript" src="js/ext/thickbox-compressed.js"></script>
  <script type="text/javascript" src="js/ext/swfobject.js"></script>
  <script type="text/javascript" src="js/ueber-activity-viewer-frontend.js"></script>
  <script type="text/javascript">
    $(document).ready(function(){
      ytUAV.getActivities();
    });
  </script>
</head>
<body>
  <div id="container">
    <h1>&Uuml;ber Activity Viewer</h1>
    <div id="login">
      <?php echo '<a href="' . createLoginUrl() . '">(add yourself)</a>'; ?>
    </div><br/>
    <div id="status"></div>
  <div id = "feed_output"></div>
</div>
  <a id="play_video" href="#TB_inline?height=366&amp;width=425&amp;inlineId=videobox" class="thickbox"></a>
  <!-- hidden div to render the embedded player -->
  <div id="videobox"></div>
</body>
</html>
