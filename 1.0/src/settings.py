# Copyright 2009 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

""" Settings required for the operation of this site.

Most of these parameters are self-explanatory.  Many of these will not need
to be changed if you just want to run a local copy of The Chow Down, with the
exception of the Maps and Analytics API keys, and the FriendConnect site
identifier and consumer key and secret.  To change those settings, follow
the instructions listed in customsettings.py.default.
"""

try:
  import customsettings
except ImportError:
  raise RuntimeError("""
      This site is configured incorrectly. 
      Please rename the file named customsettings.py.default to 
      customsettings.py and change the values to match your own configuration.
      """)

# Site settings
SITE_TITLE = "The Chow Down"
DEBUG = False
CACHE_TIME = 3600
FRIEND_PAGE_SIZE = 2        
URL_TEMPLATE_THUMBNAIL = "/static/profilephotos/%s"
SEARCH_RESULTS = 5

# Session settings
SESSION_TIMEOUT = 3600
SESSION_COOKIE_PATH = "/"
SESSION_COOKIE_NAME = "sessid"

# Keys for services
MAPS_API_KEY = customsettings.MAPS_API_KEY
ANALYTICS_ID = customsettings.ANALYTICS_ID

# Production settings
FRIENDCONNECT_SITE_ID = customsettings.FRIENDCONNECT_SITE_ID
FRIENDCONNECT_CONSUMER_KEY = customsettings.FRIENDCONNECT_CONSUMER_KEY
FRIENDCONNECT_CONSUMER_SECRET = customsettings.FRIENDCONNECT_CONSUMER_SECRET
FRIENDCONNECT_PARENT_URL = "/"
FRIENDCONNECT_BASE_DOMAIN = "www.google.com"
FRIENDCONNECT_RPC_URL = "http://friendconnect.gmodules.com/ps/api/rpc" 
FRIENDCONNECT_COOKIE_NAME = "fcauth%s" % FRIENDCONNECT_SITE_ID


