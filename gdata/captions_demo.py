#!/usr/bin/python
# -*- coding: utf-8 -*-
#
# Copyright 2011 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Demonstration of the YouTube API's captions features.

This script retrieves the ASR captions track for a video in your YouTube
account, translates it into Pig Latin, and then uploads it back to YouTube.
"""

__author__ = "jeffy@google.com (Jeffrey Posnick)"

import httplib2
import json
import optparse
import os
import sys

from apiclient.discovery import build
from oauth2client.file import Storage
from oauth2client.client import OAuth2WebServerFlow
from oauth2client.tools import run
from pysrt import SubRipFile

class Error(Exception):
  """Custom Exception subclass."""
  pass

class CaptionsDemo(object):
  """A class to interact with the YouTube Captions API."""

  # CONSTANTS
  # The client id, secret, and developer key are copied from
  # the Google APIs Console <http://code.google.com/apis/console>
  CLIENT_ID = "209139100509.apps.googleusercontent.com"
  CLIENT_SECRET = "N7mQzEhtdwcaniYfbENiVber"
  
  # Register for a YouTube API developer key at
  # <http://code.google.com/apis/youtube/dashboard/>
  YOUTUBE_DEVELOPER_KEY = ("AI39si5GEgLYKzZxKfv9cue2iKk82oD7SvAIaCxVkgyT9lqKCg"
                           "d4DIFnGWKWIa3aFj05IhBT2hZ7pHkxGqJXM48ptOmS8ngsLg")

  # Hardcoded YouTube API constants.
  OAUTH_SCOPE = "https://gdata.youtube.com"
  CAPTIONS_URL_FORMAT = ("http://gdata.youtube.com/feeds/api/videos/%s/"
                         "captions?alt=json")
  CAPTIONS_CONTENT_TYPE = "application/vnd.youtube.timedtext; charset=UTF-8"
  CAPTIONS_TITLE = "Pig Latin"
  CAPTIONS_LANGUAGE_CODE = "en"

  def __init__(self, video_id):
    """Inits CaptionsDemo with the command line arguments."""
    self.video_id = video_id

  def Authenticate(self):
    """Handles OAuth2 authentication.

    The YouTube API requires authenticated access to retrieve the ASR captions
    track and to upload the new translated track.
    We rely on the OAuth2 support in the Google API Client library.
    """
    # Use a file in the user's home directory as the credential cache.
    storage = Storage("%s/%s-oauth" % (os.path.expanduser("~"), sys.argv[0]))
    self.credentials = storage.get()
    if self.credentials is None or self.credentials.invalid:
      # If there are no valid cached credentials, take the user through the
      # OAuth2 login flow, and rely on the client library to cache the
      # credentials once that's complete.
      flow = OAuth2WebServerFlow(
        client_id=self.CLIENT_ID,
        client_secret=self.CLIENT_SECRET,
        scope=self.OAUTH_SCOPE,
        user_agent=sys.argv[0])
      self.credentials = run(flow, storage)

  def SetupHttpRequestObject(self):
    """Creates an httplib2 client and request headers for later use.

    There are certain request headers that all YouTube API requests need to
    include, so we set them up once here.
    The Google API Client library takes care of associating the OAuth2
    credentials with a httplib2.Http object.
    """
    self.headers = {
      "GData-Version": "2",
      "X-GData-Key": "key=%s" % self.YOUTUBE_DEVELOPER_KEY
    }
    self.http = self.credentials.authorize(httplib2.Http())

  def GetAsrTrackUrl(self):
    """Retrieves URL for the ASR track.

    The YouTube API has a REST-ful interface for retrieving a list of captions
    tracks for a given video. We request that list in a JSON response, and then
    loop through the captions tracks until we find the ASR. We save the unique
    URL for the track.

    Raises:
      Error: The ASR caption track info could not be retrieved.
    """
    url = self.CAPTIONS_URL_FORMAT % self.video_id
    response_headers, body = self.http.request(url, "GET", headers=self.headers)

    if response_headers["status"] == "200":
      json_response = json.loads(body)
      for entry in json_response["feed"]["entry"]:
        if ("yt$derived" in entry and
            entry["yt$derived"]["$t"] == "speechRecognition" and
            entry["content"]["xml$lang"] == self.CAPTIONS_LANGUAGE_CODE):
          # This will only be set for the ASR track.
          self.track_url = entry["content"]["src"]
    else:
      raise Error("Received HTTP response %s when requesting %s." %
                  (response_headers["status"], url))

    if self.track_url is None:
      raise Error("Could not find the ASR captions track for this video.")

  def GetSrtCaptions(self):
    """Retrieves and parses the actual ASR captions track's data.

    Given the URL of an ASR captions track, this retrieves it in the SRT format
    and uses the pysrt library to parse it into a format we can manipulate.

    Raises:
      Error: The ASR caption track could not be retrieved.
    """
    response_headers, body = self.http.request("%s?fmt=srt" % self.track_url,
                                               "GET", headers=self.headers)

    if response_headers["status"] == "200":
      self.srt_captions = SubRipFile.from_string(body)
    else:
      raise Error("Received HTTP response %s when requesting %s?fmt=srt." %
                  (response_headers["status"], self.track_url))

  def TranslateWord(self, word):
    """Translates a given word into its Pig Latin equivalent.
    
    Native Pig Latin speakers--please forgive any errors in this algorithm!
    This is used for purposes of demonstration only.
    
    Args:
      word: A word to translate to Pig Latin.
    """
    vowels = "aeiouy"
    if word.isalpha():
      if word[0] in vowels:
        return word + "way"
      else:
        return word[1:] + word[0] + "ay"
    else:
      return word
    
  def TranslateSetence(self, sentence):
    """Translates a sentence into its Pig Latin equivalent.
    
    Naively breaks up the sentence into words, and calls TranslateWord on each.
    Then attempst to reconstruct the sentence and capitalize everything.
    
    Args:
      sentence: A sentence to translate to Pig Latin.
    """
    translated_words = []
    for word in sentence.split():
      translated_words.append(self.TranslateWord(word))
      
    translated_sentence = " ".join(translated_words)
    return translated_sentence.capitalize()
      

  def TranslateCaptions(self):
    """Uses the Google Translation API to translate the captions track.

    The Google API Client library is used to call the Translation API.
    Once the translation is done, the caption items are assigned the new
    translations, and the SubRipFile object is serialized into a string.
    """
    self.translated_captions_body = ""
    for srt_caption_item in self.srt_captions:
      # We want just the text (not the timecodes) for the ASR captions.
      # Each caption item might be more than one sentence, but this is good
      # for our purposes.
      sentence = srt_caption_item.text.strip()
      srt_caption_item.text = self.TranslateSetence(sentence) + "\n"
      self.translated_captions_body += unicode(srt_caption_item).encode("utf-8")

  def UploadTranslatedCaptions(self):
    """Uploads the newly translated captions data via the YouTube API.

    The YouTube API will detect the captions data is in SRT format.

    Raises:
      Error: The ASR caption track could not be uploaded.
    """
    self.headers["Content-Type"] = self.CAPTIONS_CONTENT_TYPE
    self.headers["Content-Language"] = self.CAPTIONS_LANGUAGE_CODE
    self.headers["Slug"] = self.CAPTIONS_TITLE
    url = self.CAPTIONS_URL_FORMAT % self.video_id
    response_headers, body = self.http.request(url,
                                               "POST",
                                               body=self.translated_captions_body,
                                               headers=self.headers)

    if response_headers["status"] != "201":
      raise Error("Received HTTP response %s when uploading captions to %s." %
                  (response_headers["status"], url))

  def main(self):
    """Handles the entire program execution."""
    try:
      self.Authenticate()
      self.SetupHttpRequestObject()
      self.GetAsrTrackUrl()
      self.GetSrtCaptions()
      self.TranslateCaptions()
      self.UploadTranslatedCaptions()
    except Error, e:
      print "The captions were not successfully translated and submitted."
      print e
    else:
      print "The captions were successfully translated and submitted."

if __name__ == "__main__":
  opt_parser = optparse.OptionParser()
  opt_parser.add_option("--video-id", help="A YouTube video id in your account.")
  options, arguments = opt_parser.parse_args()

  if options.video_id is not None:
    captions_demo = CaptionsDemo(video_id=options.video_id)
    captions_demo.main()
  else:
    opt_parser.print_help()
    sys.exit(1)
