<?php
/**
 * upload.php
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 *
 * @copyright  Copyright (c) 2010 Google Inc.
 * @license    Apache 2.0
 * @author     Jeff Pickhardt <jeffpickhardt@google.com>
 */

  /**
   * This file is needed to interact with version 3.0 of the Google Docs API.
   * See also: http://code.google.com/p/gdata-samples/source/browse/trunk/doclist/OCRDemo/DocsBeta.php
   */
  require_once 'DocsBeta.php'; //'Zend/Gdata/Docs.php';
  require_once 'Zend/Oauth/Consumer.php';

  /****** CONFIGURE THESE SETTINGS ******/
  $CONSUMER_KEY = 'example.com';
  $CONSUMER_SECRET = 'INSERT_YOUR_DOMAINS_OAUTH_CONSUMER_SECRET';
  $UPLOAD_TO_USER = 'username@' . $CONSUMER_KEY;
  /**
   * For more information about managing OAuth keys and secrets, see:
   * http://www.google.com/support/a/bin/answer.py?hl=en&answer=162105
   */
  $TEST_MODE = false; // If you want to skip uploading to Google, set $TEST_MODE to true.

  /**
   * Authenticate to the Google Docs API using OAuth.
   * 
   * @param  string $consumerKey The OAuth consumer key used to authenticate to Google.
   * @param  string $consumerSecret The OAuth consumer secret used to authenticate to Google.
     *
   * @return Zend_Oauth_Client object
   */
   function AuthenticateToGoogle($consumerKey, $consumerSecret) {
        $oauthOptions = array(
            'requestScheme' => Zend_Oauth::REQUEST_SCHEME_HEADER,
            'version' => '1.0',
            'signatureMethod' => 'HMAC-SHA1',
            'consumerKey' => $consumerKey,
            'consumerSecret' => $consumerSecret
        );

        //$consumer = new Zend_Oauth_Consumer($oauthOptions);
        $token = new Zend_Oauth_Token_Access();
        $httpClient = $token->getHttpClient($oauthOptions);

        return $httpClient;
   }

  /**
   * Authenticates to Google, then builds and returns a Zend_GData_Docs object
   *
   * @param  string $consumerKey The OAuth consumer key used to authenticate to Google.
   * @param  string $consumerSecret The OAuth consumer secret used to authenticate to Google.
   *
   * @return Zend_GData_Docs object
   */
   function BuildDocsClient($consumerKey, $consumerSecret) {
     $httpClient = AuthenticateToGoogle($consumerKey, $consumerSecret);
     $docsClient = new Zend_Gdata_Docs($httpClient, 'ajax_file_uploader-1.1');
     return $docsClient;
   }

  /**
   * Upload a given file to Google via the Zend_GData_Docs client $client and
   * return the document object.
   * 
   * @param  Zend_GData_Docs $client The Zend_GData_Docs client variable.
   * @param  string $fileLocation The location of the file to upload.
   * @param  string $fileName The name of the file upon uploading.
   * @param  string $mimeType The desired mime type of the file to upload.
   * @param  string $user This user's Google Docs will receive the uploaded file.
   *
   * @return Zend Google Document object
   */
  function UploadDocument($client, $fileLocation, $fileName, $mimeType, $user) {
    $newDocument = $client->uploadFile($fileLocation, $fileName, $mimeType,
        'https://docs.google.com/feeds/default/private/full?xoauth_requestor_id=' .
        urlencode($user));
    return $newDocument;
  }

  function BuildError($error) {
    $errorMessage = $error->getMessage();
    $errorMessage = str_replace("'", "\\'", $errorMessage);
    $errorMessage = str_replace('"', "\\'", $errorMessage);
    $errorMessage = str_replace("\n", ' ', $errorMessage);
    $errorMessage = str_replace("#", '', $errorMessage);
    $errorMessage = str_replace("<", '&lt;', $errorMessage);
    $errorMessage = str_replace(">", '&gt;', $errorMessage);
    return '{"statusCode": "1", "errorMessage": "' . $errorMessage . '"}';
  }

  // Now, perform the main processing.
  if ($TEST_MODE) {
      $response = '{"statusCode": "0", "url": "test_mode.html"}';
  } else {
      try {
          // First, build the Zend_GData_Docs client.
          $docs  = BuildDocsClient($CONSUMER_KEY, $CONSUMER_SECRET);

          try {
              // Next, upload the document.
              $newDocument = null;
              $newDocument = UploadDocument($docs,
                                            $_FILES['uploadedFile']['tmp_name'],
                                            $_FILES['uploadedFile']['name'],
                                            $_FILES['uploadedFile']['type'],
                                            $UPLOAD_TO_USER);
              if ($newDocument != null) {
                  $alternateLink = '';
                  foreach ($newDocument->link as $link) {
                      if ($link->getRel() === 'alternate') {
                          $alternateLink = $link->getHref();
                      }
                  }
                  // If you get here, it was a success! The doc link is stored in $alternateLink
                  $response = '{"statusCode": "0", "url": "' . $alternateLink . '"}';
              }
          } catch (Zend_Gdata_App_HttpException $error) {
              $response = BuildError($error);
          }
      } catch (Zend_Gdata_App_AuthException $error) {
          $response = BuildError($error);
      }
  }

  // Finally, respond to the parent frame's javascript with a JSON response.
?>
<script type="text/javascript">window.top.window.stopUpload('<?php echo $response; ?>');</script>
