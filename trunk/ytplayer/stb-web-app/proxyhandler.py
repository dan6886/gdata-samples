import webapp2
from google.appengine.api import urlfetch

class ProxyHandler(webapp2.RequestHandler):
  def post(self):
    url = "https://accounts.google.com" + self.request.get('path')
    response = urlfetch.fetch(url=url,
        payload=self.request.body,
        method=urlfetch.POST,
        headers={'Content-Type': 'application/x-www-form-urlencoded'})
    self.response.status = response.status_code
    self.response.headers['Content-Type'] = 'application/json'
    self.response.write(response.content)