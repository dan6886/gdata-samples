#!/usr/bin/python2.5

#Copyright 2010 Google Inc.
#
#Licensed under the Apache License, Version 2.0 (the "License");
#you may not use this file except in compliance with the License.
#You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
#Unless required by applicable law or agreed to in writing, software
#distributed under the License is distributed on an "AS IS" BASIS,
#WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#See the License for the specific language governing permissions and
#limitations under the License.

"""A simple demo of handling a resumable video upload to the YouTube GData API."""

__author__ = 'gmcsorley@google.com (Gareth P. McSorley)'

import httplib
import logging
import os
import re
import time
import urllib
import urllib2
from optparse import OptionParser

def Authenticate(username, password):
  """Authenticate and return the auth token.

  Args:
    username: user to login as
    password: password

  Returns:
    a gaia Auth token
  """
  parameters = {"Email" : username,
                "Passwd" : password,
                "source" : "upload_test",
                "service" : "youtube",
                "accountType" : "HOSTED_OR_GOOGLE"}
  response = urllib2.urlopen("https://www.google.com/youtube/accounts/ClientLogin",
                             urllib.urlencode(parameters))
                             
  try:
    for line in response:
      if (line.startswith('Auth')):
        token = line[5:-1]  # make sure we eliminate the trailing \n
        break
  finally:
    response.close()
  return token

def GetResumableUploadURL(authheader, devkey, frontend, username, filename):
  """ Attempt to obtain the resumable upload url.

  Args:
    authheader: the auth header to use.
    devkey: the developer key to use for the upload.
    frontend: the frontend to be used for the upload.
    username: the account where the video should be uploaded.
    filename: the name of the file to be uploaded.

  Returns:
    The HTTP response.
  """
  connection = httplib.HTTPConnection(frontend)
  connection.set_debuglevel(0)
  connection.connect()
  upload_url = "http://%s/resumable/feeds/api/users/%s/uploads?prettyprint=true" % (frontend, username)
  connection.putrequest("POST", upload_url)
  connection.putheader("Authorization", authheader)
  connection.putheader("X-GData-Key", "key=%s" % devkey)
  connection.putheader("GData-Version", "2.0")
  connection.putheader("Content-length", 0)
  connection.putheader("Slug", filename.split("/")[-1])
  connection.endheaders()
  response = connection.getresponse()
  return response

def UploadFileContent(frontend, url, f):
  """ Upload the given file to the resumable URL. Will attmept to resume the uplod if the current
      file position is not at the beginning of the file.

  Args:
   frontend: the server to connect to.
   url: the resumable upload url to use.
   f: the file to upload.

  Returns:
    The HTTP response.
  """
  headers = {}
  # If we're not at the start of the file, then this is a resume so we need to set
  # the Content-Range header.
  if f.tell() != 0L:
    filesize = os.path.getsize(f.name)
    headers["Content-Range"] = "bytes %d-%d/%d" % (f.tell(), filesize - 1, filesize)
  connection = httplib.HTTPConnection(frontend)
  connection.request("PUT", url, f.read(), headers)
  response = connection.getresponse()
  connection.close()
  return response

def QueryUploadStatus(frontend, url):
  """ Query the resumabel URL to find out the current state..

  Args:
   frontend: the server to connect to.
   url: the resumable upload url to query.

  Returns:
    The HTTP response.
  """
  headers = {"Content-Range": "bytes */*"}
  connection = httplib.HTTPConnection(frontend)
  connection.request("POST", url, headers=headers)
  response = connection.getresponse()
  connection.close()
  return response

def DisplayHttpResponse(response):
  """ Pretty print an HTTP response.

  Args:
	response: the HTTP response (this should be a 308 response).

  Returns:
    The next byte which should be uploaded to resume the upload.
  """
  print "%d %s" % (response.status, response.reason)
  for item in response.getheaders():
	  print "%s: %s" % item
  print "\n%s\n" % response.read()

def ExtractResumePoint(response):
  """ Determine the next byte to be uploaded from a Resume Incomplete response.

  Args:
	response: the HTTP response (this should be a 308 response).

  Returns:
    The next byte which should be uploaded to resume the upload.
  """
  return re.findall("bytes=0-(\d+)", response.getheader("Content-Range"))[0]

def IsResumable(response):
  """ Determine if a particular HTTP response can be resumed or not.

  Args:
    response: the http response.

  Returns:
    True if it's worth attempting to resume, False otherwise.
  """
  if response == None:
    return True
  return response.status == 308 or response.status / 100 == 5

def main():
  parser = OptionParser()
  parser.add_option("-s", "--use-stage", action = "store_true", dest = "use_stage",
                    default = False, help = "Use staging server for upload.")
  parser.add_option("-u", "--username", dest="username",
                    help = "User name")
  parser.add_option("-d", "--devkey", dest="devkey",
                    help = "The developer key to use for this upload.")
  parser.add_option("-p", "--password", dest="password",
                    help = "Password")
  parser.add_option("-a", "--auth-header", dest="auth_header",
					help = "The contents of the authentication header.")
  parser.add_option("-f", "--filename", dest="filename",
                    help = "Path to the file to be uploaded.")
  (options, args) = parser.parse_args()
  if options.username == None:
	print "You must provide a username."
	return
  if options.auth_header == None and options.password == None:
    print "If you don't provide an authentication header, you must specify a username and password to proceed."
    return
  if options.devkey == None:
    print "You must specify a Developer Key."
    return
  if options.filename == None:
	  print "You must specify a file to be uploaded."
	  return

  if options.auth_header == None:
    options.auth_header = "GoogleLogin auth=%s" % Authenticate(options.username, options.password)
    frontend = "uploads.gdata.youtube.com"
  if options.use_stage:
	  frontend = "uploads.stage.gdata.youtube.com"
  upload_response = GetResumableUploadURL(options.auth_header, options.devkey, frontend, options.username, options.filename)
  if upload_response.status != 200:
	  print "Unable to initiate upload. Response from server:"
	  DisplayHttpResponse(upload_response)
	  return
  upload_url = upload_response.getheader("location")
  f = open(options.filename, "r")
  done = False
  while not done:
    response = UploadFileContent(frontend, upload_url, f)
    if IsResumable(response):
      response = QueryUploadStatus(frontend, upload_url)
      if response.status == 308:	
	      resumepoint = ExtractResumePoint(response)
	      f.seek(resumepoint + 1)
      elif response.status/100 != 2:
		    print "Error during file upload, unable to resume. Response from server:"
		    DisplayHttpResponse(response)
		    done = True
    if response.status/100 == 2:
	    print "Upload successful."
	    print response.getheader("location")
	    done = True

if __name__ == "__main__":
  main()