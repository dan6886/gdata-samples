--Introduction--

This directory contains files for an asynchronous Javascript upload to Google Docs implementation.

It is free for use under the Apache 2.0 open source license.

The main files to reference are (1) upload.php and (2) upload_file.html.

(1) upload.php
This PHP script uploads a POSTed file to Google Docs. The script first authenticates to Google Docs
through OAuth, then uploads the POSTed file to a particular user's Google Docs account.

(2) upload_file.html
This HTML file contains an ascynhronous uploader to Google Docs.  Instead of making an AJAX request,
the actual implementation has user POST a form to an iFrame contained in the main page.  The iFrame
loads the upload.php script, which uploads the file to Google Docs, then outputs some Javascript.
The Javascript outputted calls a function in the parent frame to alert the parent frame to the upload's
status.  Note that since this implementation uses cross-frame Javascript, both the parent and the child
URLs should be under the same domain (security-conscious browsers will otherwise prevent cross-frame
Javascript).



--Details on the Copyright, License, and Author--

Licensed under the Apache License, Version 2.0 (the "License"); you may not
use this file except in compliance with the License. You may obtain a copy of
the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
License for the specific language governing permissions and limitations under
the License.

@copyright  Copyright (c) 2010 Google Inc.
@license    Apache 2.0
@author     Jeff Pickhardt <jeffpickhardt@google.com>
