# Copyright 2011 Google Inc.
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

import os

from gdata.alt import appengine
from gdata.service import RequestError
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp import util
from oauth2client.appengine import OAuth2Decorator
import gdata.auth
import gdata.youtube.service
import httplib2

# HACK to use the Python GData client library with OAuth 2 tokens.
# We use the methods that deal with AuthSub tokens.
gdata.auth.AUTHSUB_AUTH_LABEL = "OAuth "

class MainHandler(webapp.RequestHandler):
  # The client_id and client_secret are copied from the API Access tab on
  # the Google APIs Console <http://code.google.com/apis/console>
  oauth2_decorator = OAuth2Decorator(
    client_id="393574119402-j7j47oiq9894nh64s1l2bekblg82fa78.apps.googleusercontent.com",
    client_secret="CWHlVj8perPEvYUi30ZdP9Fo",
    scope="http://gdata.youtube.com")

  # This decorator ensures that whenever this page is served, we have a valid
  # OAuth 2 token for the user.
  @oauth2_decorator.oauth_required
  def handle_exception(self, exception, debug_mode):
    """Handle OAuth 2 token expirations by forcing a refresh.

    For newer Google APIs, refreshes are handled automatically by the client
    library, but for GData APIs, we need to explicitly force this behavior.
    """
    if (isinstance(exception, RequestError) and
        exception.args[0]["status"] == 401):
      body = exception.args[0]["body"]
      if "Token invalid - Invalid AuthSub token." in body:
        self.oauth2_decorator.credentials._refresh(httplib2.Http().request)
        self.redirect(self.request.url)
        return

    webapp.RequestHandler.handle_exception(self, exception, debug_mode)

  # This decorator ensures that whenever this page is served, we have a valid
  # OAuth 2 token for the user.
  @oauth2_decorator.oauth_required
  def get(self):
    yt_service = gdata.youtube.service.YouTubeService()
    appengine.run_on_appengine(yt_service, store_tokens=False,
                               single_user_mode=True, deadline=10)
    yt_service.SetAuthSubToken(self.oauth2_decorator.credentials.access_token)

    video_feed = yt_service.GetYouTubeUserFeed(username="default")
    videos = []
    for video_entry in video_feed.entry:
      video = dict(
        id=(video_entry.id.text.split('/'))[-1],
        title=video_entry.title.text,
        description=video_entry.media.description.text,
        thumbnail_url=video_entry.media.thumbnail[1].url
      )
      videos.append(video)

    params = dict(
      logout_url=users.create_logout_url(self.request.uri),
      videos=videos
    )

    path = os.path.join(os.path.dirname(__file__), 'templates', 'index.html')
    self.response.out.write(template.render(path, params))


def main():
  application = webapp.WSGIApplication([('/', MainHandler)], debug=True)
  util.run_wsgi_app(application)


if __name__ == '__main__':
  main()