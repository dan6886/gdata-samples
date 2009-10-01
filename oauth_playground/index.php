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
 * Author: Eric Bidelman <e.bidelman@google.com>
 */

require_once('playground.php');
?>

<html>
<head>
<title>OAuth Playground</title>

<link type="text/css" rel="stylesheet" href="css/thickbox.css"/>
<link type="text/css" rel="stylesheet" href="css/SyntaxHighlighter.css"/>
<link type="text/css" rel="stylesheet" href="css/main.css"/>
<script type="text/javascript" src="http://code.jquery.com/jquery-latest.min.js"></script>
<script type="text/javascript" src="js/jquery.form.js"></script>
<script type="text/javascript" src="js/thickbox-compressed.js"></script>
<script type="text/javascript" src="js/main.js"></script>
<script type="text/javascript" language="javascript" src="js/syntaxHighlighter/shCore.js"></script>
<script type="text/javascript" language="javascript" src="js/syntaxHighlighter/shBrushXml.js"></script>

</head>
<body>

<form method="POST" name="oauth_form" id="oauth_form">

<table class="main" border="0" width="100%" align="center" cellspacing="10" cellpadding="0">
<tr>
  <td class="separator-bottom">
    <a href="<?php echo $callback_url ?>"><img src="images/oauth_playground_logo.jpg" border="0" /></a>
  </td>
  <td class="separator-bottom" align="right" valign="bottom"><img src="images/google.gif"></td>
</tr>
<tr>
<td id="settings-menu" width="490" valign="top" rowspan="2">

  <div class="panel" id="choose_scopes_panel">
    <table cellpadding="0" cellspacing="0">
    <tr>
      <td class="corner topleft"></td><td class="topmiddle"></td><td class="corner topright"></td>
    </tr>
    <tr class="middle">
      <td class="leftside">&nbsp;</td>
      <td class="title"><h3><img src="images/1.gif" style="vertical-align:top;"> Choose your Scope(s)</h3></td>
      <td class="rightside">&nbsp;</td>
    </tr>
    <tr class="middle">
      <td class="leftside">&nbsp;</td>
      <td>
        <div id="scopes_container" style="height:150px;overflow:auto;margin-bottom:10px;"></div>
        input your own: &nbsp; <input id="scope" name="scope" type="text" style="width:100%;font-size:80%;">
     </td>
      <td class="rightside">&nbsp;</td>
    </tr>
    <tr>
      <td class="corner bottomleft"></td><td class="bottommiddle"></td><td class="corner bottomright"></td>
    </tr>
    </table>
  </div>

  <div class="panel" id="oauth_parameters">
    <table cellpadding="0" cellspacing="0">
    <tr>
      <td class="corner topleft"></td><td class="topmiddle"></td><td class="corner topright"></td>
    </tr>
    <tr class="middle">
      <td class="leftside">&nbsp;</td>
      <td class="title"><h3><img src="images/2.gif" style="vertical-align:top;"> Modify the OAuth Parameters</h3></td>
      <td class="rightside">&nbsp;</td>
    </tr>
    <tr class="middle">
      <td class="leftside">&nbsp;</td>
      <td>
        <h4>oauth_signature_method</h4>
        <select name="sig_method" id="sig_method">
        <?php
        foreach ($SIG_METHODS as $name => $method) {
          print "<option value='$name'>$name</option>";
        }
        ?>
        </select>

        <h4>oauth_consumer_key</h4>
        <input type="text" name="consumer_key" value="<?php echo isset($_SESSION['consumer_key']) ? $_SESSION['consumer_key'] : 'googlecodesamples.com'; ?>" />

        <span id="consumer_secret_container" style="display:none;">
          <h4>consumer secret</h4>
          <input type="text" name="consumer_secret" id="consumer_secret" value="<?php echo isset($_SESSION['consumer_secret']) ?  $_SESSION['consumer_secret'] : $consumer->secret; ?>"/>

          <h4>oauth_token_secret</h4>
          <input type="text" name="token_secret" id="token_secret" value="<?php echo isset($_SESSION['token_secret']) ?  $_SESSION['token_secret'] : $token_secret; ?>"/>
        </span>

        <h4>oauth_timestamp</h4>
        <input type="text" name="timestamp" id="timestamp" value="" readonly="readonly" class="disabled"/>

        <h4>oauth_nonce</h4>
        <input type="text" name="nonce" id="nonce" value="" readonly="readonly" class="disabled"/>

        <h4>oauth_token &nbsp; <span id="tokenType" style="font-size:small;"><?php echo isset($_SESSION['access_token']) ?  'access token' : ''; ?></span></h4>
        <input type="text" name="oauth_token" id="oauth_token" value="<?php echo isset($_SESSION['access_token']) ?  $_SESSION['access_token'] : $oauth_token->key; ?>"/>

        <p id="ownPrivKey"><a href="#TB_inline?width=580&height=310&inlineId=privKey" class="thickbox popupLink" title="Enter a private key in .PEM format<p><b>Note:</b> This feature requires you to have previously uploaded a <br>public certificate to <a href='https://www.google.com/accounts/ManageDomains' target='_blank'>Google</a> under the domain you specified <br>for <code>oauth_consumer_key</code>.</p>">use your own private key</a></p>
      </td>
      <td class="rightside">&nbsp;</td>
    </tr>
    <tr>
      <td class="corner bottomleft"></td><td class="bottommiddle"></td><td class="corner bottomright"></td>
    </tr>
    </table>
  </div>

  <div class="panel" style="margin-bottom:0;">
    <table cellpadding="0" cellspacing="0">
    <tr><td class="corner topleft"></td><td class="topmiddle"></td><td class="corner topright"></td></tr>
    <tr class="middle">
      <td class="leftside">&nbsp;</td>
      <td class="title"><h3 style="float:left;">Get the Token</h3><span style="float:right;">Advanced? <input type="checkbox" id="advanced_check"></span></td>
      <td class="rightside">&nbsp;</td>
    </tr>
    <tr class="middle">
      <td class="leftside">&nbsp;</td>
      <td>
        <span id="endpoint_container" style="display:none;">Server: <input type="text" id="host" name="host" value="https://www.google.com/accounts" style="width:275px;"/></span>
        <input type="text" id="token_endpoint" name="token_endpoint" value="/accounts/OAuthGetRequestToken" style="display:none;"/>
        <table>
        <tr>
          <td valign="top"><img src="images/3.gif"></td><td><strong>Get a Request Token:</strong>
          <span class="button">
            <span class="first-child">
            <button type="submit" name="action" value="request_token" id="request_token_button" disabled="disabled">Request token</button>
            </span>
          </span>
          <div id="xoauth_displayname_container" style="display:none;margin-top:10px;"><strong>xoauth_displayname</strong>: <input type="text" id="xoauth_displayname" name="xoauth_displayname" value=""/></div>
          </td>
        </tr>
        <tr>
          <td valign="top"><img src="images/4.gif"></td><td><strong>Authorize the Request Token:</strong> 
          <span class="button">
            <span class="first-child">
            <button type="submit" name="action" value="authorize" id="authorize_token_button" disabled="disabled">Authorize</button>
            </span>
          </span>
        </tr>
        <tr>
          <td valign="top"><img src="images/5.gif"></td><td><strong>Upgrade to an Access Token:</strong> 
          <span class="button">
            <span class="first-child">
            <button type="submit" name="action" value="access_token" id="access_token_button" disabled="disabled">Access token</button>
            </span>
          </span>
        </tr>
        </table>

        <div id="token_ops">
          <span><h4>Token management:</h4></span>
          <span><a href="" id="get_token_link">get token info</a> <a href="" id="revoke_token_link">revoke token</a> <a href="" id="start_over_link">start over</a></span>
        </div>
      </td>
      <td class="rightside">&nbsp;</td>
    </tr>
    <tr>
      <td class="corner bottomleft"></td><td class="bottommiddle"></td><td class="corner bottomright"></td>
    </tr>
    </table>

  </div>

</td>
<td id="dataViewsTD" valign="top">
  <h3>Signature base string</h3>
  <pre id="base_string" class="dataView"></pre>

  <h3>Request/Response</h3>
  <pre id="http_response" class="xml:nogutter" name="code"></pre>

  <div id="html_link"></div>
</td>
</tr>
<tr>
<td valign="top">
  <div class="panel" id="input_feed">
    <table cellpadding="0" cellspacing="0">
    <tr>
      <td class="corner topleft"></td><td class="topmiddle"></td><td class="corner topright"></td>
    </tr>
    <tr class="middle">
      <td class="leftside">&nbsp;</td>
      <td class="title">
        <h4><img src="images/6.gif" style="vertical-align:middle;"> Enter a Google Data API feed &nbsp; <u>OR</u> &nbsp; discover 
        <span class="button">
          <span class="first-child">
          <button type="submit" name="action" id="discovery" value="discovery" onclick="this.value='discovery';" title="Discover which authenticated feeds are accessible by your token">available feeds</button>
          </span>
        </span>
        </h4>
      </td>
      <td class="rightside">&nbsp;</td>
    </tr>
    <tr class="middle">
      <td class="leftside">&nbsp;</td>
      <td>
        <div style="float:left;margin-right:8px;text-align:right;">
        <select id="http_method" name="http_method">
          <option value="GET" selected="selected">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
        <br>
        <a href="#TB_inline?width=685&height=610&inlineId=postData" class="thickbox popupLink" title="Enter POST/PUT data" style="font-size:90%;">enter post data</a>
        </div>
        <input type="text" id="feedUri" name="feedUri" value="<?php echo $feedUri; ?>"/> 
        <span class="button">
          <span class="first-child">
          <button type="submit" name="action" id="execute" value="execute" onclick="this.value='execute';" title="Query a feed">execute</button>
          </span>
        </span>
        <div style="margin:10px 0 5px 0;clear:both;">Syntax highlight response? <input type="checkbox" id="syntaxHighlight"/> &nbsp; <strong>|</strong> &nbsp;
        Stick <strong>oauth_*</strong> params in: <input type="radio" name="oauth_params_loc" checked="checked" value="header">Authorization header
         &nbsp; <input type="radio" name="oauth_params_loc" value="query">URL as params</div>
        <div>
          <strong>POST/PUT Content-Type</strong>: &nbsp;
          <input type="radio" name="content-type" checked="checked" value="Content-Type: application/atom+xml">application/atom+xml 
          &nbsp;
          <input type="radio" name="content-type" value="Content-Type: application/json">application/json
          &nbsp;
          <input type="radio" name="content-type" value="Content-Type: text/csv">text/csv
          &nbsp;
          <input type="radio" name="content-type" value="Content-Type: text/plain">text/plain
        </div>
        <div>
 	  GData-Version:
          <input id="gdata-version" name="gdata-version" value="2.0" style="width:40px;">
	  <!--<select name="gdata-version">
	    <option value="1.0">1.0</option>
	    <option value="2.0" selected="selected">2.0</option>
	  </select>-->
	</div>
      </td>
      <td class="rightside">&nbsp;</td>
    </tr>
    <tr>
      <td class="corner bottomleft"></td><td class="bottommiddle"></td><td class="corner bottomright"></td>
    </tr>
    </table>
  </div>
</td>
</tr>
</table>

<div id="postData"> 
  <textarea name="postData" class="large"></textarea>
</div>

<div id="privKey">
  <textarea name="privKey" class="small"><? echo isset($_SESSION['privKey']) ? $_SESSION['privKey'] : '' ?></textarea>
</div>

</form>

</body>
</html>
