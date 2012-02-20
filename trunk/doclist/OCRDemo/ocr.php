<?php
require_once 'Zend/Loader.php';
Zend_Loader::loadClass('Zend_Gdata');
Zend_Loader::loadClass('Zend_Gdata_AuthSub');

// Docs.php has yet to be updated with v3.0 features. DocsBeta.php can be used
// as a replacement for.
require_once 'DocsBeta.php';  

session_start();

$authSubURL = '';

try {
  // Extract single-use token from URL or use their existing session token.
  $token = isset($_SESSION['sessionToken']) ? $_SESSION['sessionToken'] :
                                              @$_GET['token'];
  $docs  = setupDocsClient($token);

  // Upload document and redirect to Google Docs on success
  if (@$_REQUEST['command'] == "uploadDocument") {
    try {
      $newDocumentEntry = uploadDocument(
          $docs, $_FILES['uploadedFile']['tmp_name'],
          $_FILES['uploadedFile']['name'], $_FILES['uploadedFile']['type']);

      if ($newDocumentEntry !== null) {
        $alternateLink = '';
        foreach ($newDocumentEntry->link as $link) {
          if ($link->getRel() === 'alternate') {
            $alternateLink = $link->getHref();
          }
        }

        header("Location: $alternateLink");
        exit();
      }
    } catch (Zend_Gdata_App_HttpException $e) {
      echo '<div class="error">' .
           '<b>Error processing document:</b><br>' .
           $e->getMessage() .
           "</div>";
      exit(1);
    }
  }

  startHTML();
  switch (@$_REQUEST['command']) {
    case 'logout':
      logout();
      break;
    default:
      if ($docs) {
        displayUploadMenu();
      }
  }
  endHTML();
} catch (Zend_Gdata_App_AuthException $e) {
  echo '<div class="error">Error: Unable to authenticate. Please check your token.</div>';
  exit(1);
}

function setupDocsClient($token = null) {
  global $authSubURL;

  $docsClient = null;

  // Fetch a new AuthSub token?
  if (!$token && !isset($_SESSION['sessionToken'])) {
    $next = 'http://' . $_SERVER['HTTP_HOST'] . $_SERVER['PHP_SELF'];
    $scope = 'https://docs.google.com/feeds/';
    $secure = 0;
    $session = 1;
    $permission = 1;  // 1 - allows posting notices && allows reading profile data
    $authSubURL =  Zend_Gdata_AuthSub::getAuthSubTokenUri($next, $scope, $secure, $session);

  } else if (isset($_SESSION['sessionToken'])) {
    $httpClient = new Zend_Gdata_HttpClient();
    $httpClient->setAuthSubToken($_SESSION['sessionToken']);
    $docsClient = new Zend_Gdata_Docs($httpClient, 'google-OCRPHPDemo-v0.1');

  } else {
    $httpClient = new Zend_Gdata_HttpClient();
    $_SESSION['sessionToken'] = Zend_Gdata_AuthSub::getAuthSubSessionToken(trim($token), $httpClient);
    $httpClient->setAuthSubToken($_SESSION['sessionToken']);
    $docsClient = new Zend_Gdata_Docs($httpClient, 'google-OCRPHPDemo-v0.1');
  }
  return $docsClient;
}

function uploadDocument($client, $fileLocation, $fileName, $mimeType) {
  $newDocumentEntry = null;

  if (($mimeType == "image/gif") || ($mimeType == "image/jpeg") ||
      ($mimeType == "image/jpg") || ($mimeType == "image/png")) {
    $newDocumentEntry = $client->uploadFile($fileLocation, $fileName, $mimeType,
        'https://docs.google.com/feeds/default/private/full?ocr=true');
  } else {
    echo "<div class='error'>";
    echo "<h1>Invalid file</h1>";
    echo "Please chose a JPG, GIF or PNG file not larger than 10 MB/25 mega pixel.";
    echo "</div>";
  }
  return $newDocumentEntry;
}

function download($client, $url, $format=null) {
  $token = $client->getHttpClient()->getAuthSubToken();
  $opts = array(
    'http' => array(
      'method' => 'GET',
      'header' => "GData-Version: 3.0\r\n".
                  "Authorization: AuthSub token=\"$token\"\r\n"
    )
  );
  $context = stream_context_create($opts);
  if ($url != null) {
    $url =  $url . "&exportFormat=$format";
  }
  return file_get_contents($url, false, $context);
}

/**
 * Display the menu for running in a web browser.
 *
 * @return void
 */
function displayUploadMenu()
{
  ?>
  <br>
  <table width="400" border="0"><tr><td style="background-color:#FFFF9B;padding:20px;border:1px solid #ccc;">
  <h4>Please choose a JPG, GIF, or PNG to be OCR'ed.</h4>
  <p>Please note that the operation can currently take up to 40 seconds.</p>
    <p>
      A number of limitations:
      <ul>
        <li><em>Files must be fairly high-resolution</em> -- rule of thumb is 10 pixel character height.</li>
        <li><em>Maximum file size</em>: 10MB, maximum resolution: 25 mega pixel</li>
        <li><em>The larger the file, the longer the OCR operation will take</em> (500K: ~15s, 2MB: ~40s, 10MB: forever)</li>
      </ul>
    </p>
  <form method="post" enctype="multipart/form-data" id="uploadForm" onsubmit="return submitForm(this);">
     <input type="hidden" name="command" value="uploadDocument" />
     <input name="uploadedFile" type="file" />
     <input type="hidden" name="MAX_FILE_SIZE" value="1000000000" />
     <input id="submitBtn" style="font-weight:bold" type="submit" value="Start OCR import"
         onclick="document.getElementById('submitBtn').disabled=true; document.getElementById('submitBtn').value='Please wait...';document.getElementById('uploadForm').submit();" />
  </form>
  </td></tr></table>
  <p>
    <h4>An example file (right click and download, then input into form above):</h4>
    <a href="HTTP.jpg"><img src="HTTP.jpg" width="100"></a>
  </p>
  <?php
}

/**
 * Log the current user out of the application.
 *
 * @return void
 */
function logout()
{
  session_destroy();
  ?>
  <p>Logout successful.</p>
  <?php
}

/* HTML header */
function startHTML()
{
  global $authSubURL;

?>
<html>
<head>
<title>DocList API OCR Demo</title>
<style type="text/css">
* {
  font-family:arial;
  font-size:12px;
}
body {
  padding:10px;
  margin:10px;
}
.boxlink {
  color:navy;
  border:1px solid #ccc;
  padding:5px;
  background-color:#BACEFF;
}
h1,h3,h3,h4 {
  padding:0;
  margin:0;
}
form {
  width:400px;
}
input[type='file'] {
  background-color:#eee;
  border: 1px solid #ccc;
  padding:8px;
}
img {
  border:1px solid #ccc;
  margin:10px;
}
.error {
  width:200px;
  border:2px solid red;
  padding:10px;
  margin-bottom:20px;
}
#info {
  color:#666;
  margin: 20px 0px 10px 0px;
  width:500px;
  line-height:135%;
}
</style>
</head>

<body>
<?php if (isset($_SESSION['sessionToken'])): ?>
  <a class="boxlink" href="?command=logout">Logout from Google Docs</a>
<?php else: ?>
  <a class="boxlink" href="<?php echo $authSubURL ?>">Sign in to Google Docs</a>
<?php endif; ?>

<div id="info">
This example application showcases the OCR feature of the
<a target="_blank" href="http://code.google.com/apis/documents/docs/3.0/developers_guide_protocol.html#OCR">Documents List Data API</a>.
It allows you to upload an image and start an <a target="_blank" href="http://en.wikipedia.org/wiki/Optical_character_recognition">OCR</a>
operation on it. The extracted text is converted into a new Google Document.<br>
</div>

<?php
}

/* HTML footer */
function endHTML()
{
?>
</body>
</html>
<?php
}
