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
 * Author: Jeff Fisher <api.jfisher@google.com>
 */

import wsgiref.handlers
import urllib

from google.appengine.api import urlfetch
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext import db
from google.appengine.ext.webapp import template

import os

#This enables logging only on the development server
if os.environ['SERVER_SOFTWARE'] == 'Development/1.0':
  DEBUG = True
else:
  DEBUG = False
  
class RemoveToken(webapp.RequestHandler):
  def get(self):
    user = users.get_current_user()
    token = self.request.get('token')
    
    if user and token:
      tokens = AuthSubToken.all()
      tokens.filter("user = ", user)
      tokens.filter("token = ", token)
      if tokens[0]:
        tokens[0].delete()
    
    self.redirect('/')
  
class MainPage(webapp.RequestHandler):
  def get(self):
    
    self.response.headers['Content-Type'] = 'text/html'
    
    if users.get_current_user():
      url = users.create_logout_url(self.request.uri)
      url_linktext = 'Logout'
    else:
      url = users.create_login_url(self.request.uri)
      url_linktext = 'Login'
      
    template_values = { 
      'url': url,
      'url_linktext': url_linktext,
      'self_link' : self.request.uri,
    }
    
    if users.get_current_user():
      if self.request.get('token'):
        token = exchangeSessionToken(self.request.get('token'))
        newToken = AuthSubToken()
        newToken.token = token
        newToken.user = users.get_current_user()
        newToken.scope = self.request.get('scope')
        if token:
          newToken.put()
        self.redirect('/')
      template_values['logged_in'] = True
      tokens = AuthSubToken.all()
      tokens.filter("user = ", users.get_current_user())
      template_values['tokens'] = tokens
    
    
    
    path = os.path.join(os.path.dirname(__file__), 'index.html')
    self.response.out.write(template.render(path, template_values))
  
  def post(self):
    next = self.request.get('next')
    scope = self.request.get('scope')
    self.redirect(generateAuthSubUrl(next, scope))

class FeedFetcher(webapp.RequestHandler):
  
  def post(self):
    self.get();
  
  def get(self):
    
    
    url = self.request.get('feed')
    token = self.request.get('token')
    cl_token = self.request.get('cl_token')
    method = self.request.get('method')
    payload = self.request.get('request_body')
    
    if not method:
      method = "GET"
    
    self.response.headers['Content-Type'] = 'text/plain'
    
    if not url:
      self.response.out.write('Need to specify a feed parameter.')
      return
    
    headers = {}
    headers['Content-Type'] = 'application/atom+xml'
    
    if token and token != 'None': 
      headers['Authorization'] = 'AuthSub token="%s"' % token
    elif cl_token:
      headers['Authorization'] = 'GoogleLogin auth=%s' % cl_token
    
    if self.request.get('v2'):
      headers['GData-Version'] = '2'
      
    if self.request.get('youtube'):
      
      headers['X-GData-Client'] = 'ytapi-Google-AtomViewer-mqdfuljp-0'
      
      yt_key = self.request.get('youtube_key')
      if yt_key:
        headers['X-GData-Key'] = ("key=\"%s\"" % yt_key)
      else:
        headers['X-GData-Key'] = ('key="AI39si7HRK08D14UwBKpcmElNUDxZ7xU-ytbQ3e'
        'DFC6ZGmnh969bHD0uV9pudq6NI4VTjCutrJsfFAb6hKBlBiUoDtUpXj-iNQ"')
    
    result = urlfetch.fetch(url, payload=payload, headers=headers, method=method)
    
    
    if result.headers['content-type'].startswith('application/atom+xml') \
      and self.request.get('display_browser'):
      self.response.headers['Content-Type'] = 'text/xml'
      self.response.out.write(result.content.replace(
        'http://www.w3.org/2005/Atom', 
        'http://www.w3.org/2005/atom', 1))
    else:
      self.response.headers['Content-Type'] = 'text/html'
      template_values = {}
      template_values['response'] = result
      path = os.path.join(os.path.dirname(__file__), 'feed.html')
      self.response.out.write(template.render(path, template_values))
  
      
  
class AuthSubToken(db.Model):
  scope = db.StringProperty()
  token = db.StringProperty()
  user = db.UserProperty()

def generateAuthSubUrl(next, scope, secure = '0', session = '1'):
  
  servlet = 'https://www.google.com/accounts/AuthSubRequest'
  
  next = "%s?scope=%s" % (next, scope)
  
  params = urllib.urlencode({'next': next, 'scope':scope, 'secure': secure,
    'session': session})
    
  return "%s?%s" % (servlet, params)
  
def exchangeSessionToken(token):
  
  url = "https://www.google.com/accounts/AuthSubSessionToken"
  
  headers = { 'Authorization' : 'AuthSub token="%s"' % token }
  
  result = urlfetch.fetch(url, headers=headers)
  
  sessionToken = None
  
  for response_line in result.content.splitlines():
    if response_line.startswith('Token='):
      sessionToken = response_line.lstrip('Token=')
    
  return sessionToken
    

def main():
  application = webapp.WSGIApplication([('/', MainPage),
                                        ('/getFeed', FeedFetcher),
                                        ('/removeToken', RemoveToken)], 
                                        debug=DEBUG)
  wsgiref.handlers.CGIHandler().run(application)
    
if __name__ == "__main__":
  main()

