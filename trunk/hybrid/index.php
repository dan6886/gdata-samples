<?php
// Loads OAuth, OpenID, Zend libraries and common utility functions.
require_once 'common.inc.php';

// Setup OAuth consumer with our "credentials"
$consumer = new OAuthConsumer($CONSUMER_KEY, $CONSUMER_SECRET, NULL);

$request_token = @$_REQUEST['openid_ext2_request_token'];
if ($request_token) {
  $data = array();
  $httpClient = new Zend_Gdata_HttpClient();
  $access_token = getAccessToken($request_token);

  // Query the Documents API ===================================================
  $feedUri = 'http://docs.google.com/feeds/documents/private/full';
  $params = array(
    'max-results' => 50,
    'strict' => 'true'
  );
  $req = OAuthRequest::from_consumer_and_token($consumer, $access_token,
                                               'GET', $feedUri, $params);
  $req->sign_request($SIG_METHOD, $consumer, $access_token);

  // Note: the Authorization header changes with each request
  $httpClient->setHeaders($req->to_header());
  $docsService = new Zend_Gdata_Docs($httpClient);

  $query = $feedUri . '?' . implode_assoc('=', '&', $params);
  $feed = $docsService->getDocumentListFeed($query);
  $data['docs']['html'] = listEntries($feed);
  $data['docs']['xml'] = $feed->saveXML();
  // ===========================================================================

  // Query the Spreadsheets API ================================================
  $feedUri = 'http://spreadsheets.google.com/feeds/spreadsheets/private/full';
  $params = array('max-results' => 50);
  $req = OAuthRequest::from_consumer_and_token($consumer, $access_token, 'GET',
                                               $feedUri, $params);
  $req->sign_request($SIG_METHOD, $consumer, $access_token);

  // Note: the Authorization header changes with each request
  $httpClient->setHeaders($req->to_header());
  $spreadsheetsService = new Zend_Gdata_Spreadsheets($httpClient);

  $query = $feedUri . '?' . implode_assoc('=', '&', $params);
  $feed = $spreadsheetsService->getSpreadsheetFeed($query);

  $data['spreadsheets']['html'] = listEntries($feed);
  $data['spreadsheets']['xml'] = $feed->saveXML();
  // ===========================================================================

  // Query Google's Portable Contacts API ======================================
  $feedUri = 'http://sandbox.gmodules.com/api/people/@me/@all';
  $req = OAuthRequest::from_consumer_and_token($consumer, $access_token, 'GET',
                                               $feedUri, NULL);
  $req->sign_request($SIG_METHOD, $consumer, $access_token);

  // Portable Contacts isn't GData, but we can use send_signed_request() from
  // common.inc.php to make an authenticated request.
  $data['poco'] = send_signed_request($req->get_normalized_http_method(),
                                      $feedUri, $req->to_header(), NULL, false);
  // ===========================================================================
}

switch(@$_REQUEST['openid_mode']) {
  case 'checkid_setup':
  case 'checkid_immediate':
    $identifier = $_REQUEST['openid_identifier'];
    if ($identifier) {
      $fetcher = Auth_Yadis_Yadis::getHTTPFetcher();
      list($normalized_identifier, $endpoints) =
          Auth_OpenID_discover($identifier, $fetcher);

      if (!$endpoints) {
        debug('No OpenID endpoint found.');
      }

      $uri = '';
      foreach ($openid_params as $key => $param) {
        $uri .= $key . '=' . urlencode($param) . '&';
      }
      header('Location: ' . $endpoints[0]->server_url . '?' . rtrim($uri, '&'));
    } else {
      debug('No OpenID endpoint found.');
    }
    break;
  case 'cancel':
    debug('Sign-in was cancelled.');
    break;
  case 'associate':
    // TODO
    break;
}

/**
 * Upgrades an OAuth request token to an access token.
 *
 * @param string $request_token_str An authorized OAuth request token
 * @return string The access token
 */
function getAccessToken($request_token_str) {
  global $consumer, $SIG_METHOD;

  $token = new OAuthToken($request_token_str, NULL);

  $token_endpoint = 'https://www.google.com/accounts/OAuthGetAccessToken';
  $request = OAuthRequest::from_consumer_and_token($consumer, $token, 'GET',
                                                   $token_endpoint);
  $request->sign_request($SIG_METHOD, $consumer, $token);

  $response = send_signed_request($request->get_normalized_http_method(),
                                  $token_endpoint, $request->to_header(), NULL,
                                  false);

  // Parse out oauth_token (access token) and oauth_token_secret
  preg_match('/oauth_token=(.*)&oauth_token_secret=(.*)/', $response, $matches);
  $access_token = new OAuthToken(urldecode($matches[1]),
                                 urldecode($matches[2]));

  return $access_token;
}

/**
 * Creates an HTML list of each <entry>'s title.
 *
 * @param Zend_Gdata_Feed $feed A Gdata feed object
 * @return string The HTML of entries
 */
function listEntries($feed) {
  $str = '<ul>';
  foreach($feed->entries as $entry) {
    // Find the URL of the HTML view of the document.
    foreach ($entry->link as $link) {
      if ($link->getRel() === 'alternate') {
        $alternateLink = $link->getHref();
      }
    }
    $str .= "<li><a href=\"{$alternateLink}\" target=\"new\">{$entry->title->text}</a></li>";
  }
  $str .= '</ul>';

  return $str;
}
?>

<html>
<head>
<title>Google Hybrid Protocol Demo (OpenID + OAuth)</title>
<link href="hybrid.css" type="text/css" rel="stylesheet"/>
<script src="http://code.jquery.com/jquery-latest.min.js"></script>
<script type="text/javascript">
function toggle(id, type) {
  if (type === 'list') {
    $('pre.' + id).hide();
    $('div.' + id).show();
  } else {
    $('div.' + id).hide();
    $('pre.' + id).show();
  }
}
</script>
</head>
<body>

<h3><span class="google"><span>G</span><span>o</span><span>o</span><span>g</span><span>l</span><span>e</span></span> Hybrid Protocol (<a href="http://openid.net">OpenID</a> + <a href="http://oauth.net">OAuth</a>) Demo</h3>

<div style="float:left;"><img src="hybrid_logo.png"/></div>
<div>
<form method="POST" action="<?php echo $_SERVER['PHP_SELF'] ?>">
<fieldset><legend><small><b>Enter an OpenID:</b></small></legend>
  <input type="hidden" name="openid_mode" value="checkid_setup">
  <input type="text" name="openid_identifier" id="openid_identifier" size="40" value="google.com/accounts/o8/id" /> <input type="submit" value="login" />
  <br>
  Sign in with a
  <a href="<?php echo $_SERVER['PHP_SELF'] . '?openid_mode=checkid_setup&openid_identifier=google.com/accounts/o8/id' ?>"><img height="16" width="16" align="absmiddle" style="margin-right: 3px;" src="gfavicon.gif" border="0"/><span class="google"><span>G</span><span>o</span><span>o</span><span>g</span><span>l</span><span>e</span> Account</span></a>
</fieldset>
</form>
</div>

<?php if(@$_REQUEST['openid_mode'] === 'id_res'): ?>
  <p>Welcome: <strong><?php echo $_REQUEST['openid_ext1_value_email'] ?></strong></p>
<?php endif; ?>

<div style="margin-left:140px;">
<?php if ($request_token && $access_token): ?>
  Access token: <?php echo $access_token->key; ?><br>
<?php else: ?>
  <h4 style="margin-top:5.5em;">You are not authenticated</h4>
<?php endif; ?>

<?php if (@$data['docs']): ?>
  <h4>Your Google Docs:</h4>
  [ <a href="javascript:toggle('docs_data', 'list');">list</a> | <a href="javascript:toggle('docs_data', 'xml');">xml</a> ]
  <div class="docs_data"><?php echo $data['docs']['html']; ?></div>
  <pre class="data_area docs_data" style="display:none;"><?php echo xml_pp($data['docs']['xml'], true); ?></pre>
<?php endif; ?>

<?php if (@$data['spreadsheets']): ?>
  <h4>Your Google Spreadsheets:</h4>
  [ <a href="javascript:toggle('spreadsheets_data', 'list');">list</a> | <a href="javascript:toggle('spreadsheets_data', 'xml');">xml</a> ]
  <div class="spreadsheets_data"><?php echo $data['spreadsheets']['html']; ?></div>
  <pre class="data_area spreadsheets_data" style="display:none;"><?php echo xml_pp($data['spreadsheets']['xml'], true); ?></pre>
<?php endif; ?>

<?php if (@$data['poco']): ?>
  <h4>Your OpenSocial Portable Contacts Data:</h4>
  <pre class="data_area"><?php echo json_pp($data['poco']); ?></pre>
<?php endif; ?>
</div>
</body>
</html>
