from proxyhandler import ProxyHandler
import webapp2

application = webapp2.WSGIApplication([
    ('/proxy', ProxyHandler)
], debug=True)
