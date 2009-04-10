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

""" Implements a request handler infrastructure with modular rendering classes.

The following classes are exported:
  UserVisibleError: An exception which may be displayed to the user.
  RequiredFieldsError: Exception thrown when a request is missing parameters.
  RequestHandler: Base class from which all request handlers inherit.
  JsonRenderer: RequestHandler subclass which prints JSON output.
  TemplateRenderer: RequestHandler subclass which renders a template file.
"""

# Standard imports 
import os
import time
import urllib
import hashlib
import logging
import wsgiref.handlers
from email.Utils import formatdate

# Django imports
from django.utils import simplejson

# Google App Engine imports
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template

# Local imports
from providers import users
from providers import sessions
from providers import restaurants
import settings
import utils
import models

##### Errors #####

class UserVisibleError(Exception): 
  """ An exception which may be displayed to the user.
  
  The message of this exception is suitable for displaying to an end user.
  """
  pass

class RequiredFieldsError(Exception):
  """ Exception thrown when a request is missing parameters. 
  
  Attributes:
    fields: A dictionary containing the fields which were missing as keys, with
        the value True for each key.  This makes for easy access in a template,
        where you may use a construct like:
        
        <input name='password' 
               class='{% if error.fields.password %}required{% endif %}' />
        
        by passing this exception to the template as "error".
  """
  fields = {}
  
  def __init__(self, fields):
    """ Assigns the list of error fields to this object. 
    
    Args:
      fields: A list of fields which were required and are missing.
    """
    for field in fields:
      self.fields[field] = True

##### Request Handlers #####

class RequestHandler(webapp.RequestHandler):
  """ Base class from which all request handlers inherit.
  
  The request handlers in views.py should inherit from RequestHandler or a
  subclass of RequestHandler.  Subclasses should override get_data and 
  get_headers as needed.
  """
  
  def initialize(self, request, response):
    """ Adds users, session, and the current view to each request. """
    super(RequestHandler, self).initialize(request, response)
    self.request.view = self._get_view_name()
    self.request.session = self._get_session_provider()
    self.request.users = self._get_user_provider()

  def _get_user_provider(self):
    """ Returns the appropriate user provider.
    
    Returns:
      A user.UserProvider subclass which provides access to the current user
      and their friends (if available).
    """
    if self.request.cookies.has_key(settings.FRIENDCONNECT_COOKIE_NAME):
      st = self.request.cookies[settings.FRIENDCONNECT_COOKIE_NAME]
      return users.FCAuthProvider(st, self.request.session)
    else:
      return users.TwoLeggedProvider(self.request.session)
    
  def _get_view_name(self):
    """ Gets the name of the current view.
    
    Returns:
      The current 'view' name, which is taken from the first portion of the 
      request path.  For example, if http://example.com/users/add 
      is reqeuested, this will return 'users'.  This value is mostly needed for
      templates, in order to indicate which section the user is currently 
      visiting.
    """
    view = self.request.path_info_peek().rstrip(".html")
    return view
    
  def _get_session_provider(self):
    """ Returns an initialized session provider.
    
    This method will attempt to continue an existing session based off of 
    cookie data in the request.  If multiple sessions are found, this method
    will attempt to obtain viewers for each session.  If multiple viewers 
    are found, their accounts will be merged, so this function has 
    significant side effects in certain cases!
    
    If no session is found, then a new session is created.
    
    Returns:
      A session provider that can be used to store data for the current viewer
      across several requests.
    """   
    local_session = None
    remote_session = None
    cookies = self.request.cookies
    
    cookie = settings.SESSION_COOKIE_NAME
    if cookies.has_key(cookie):
      logging.info("Continuing local session (%s)" % cookies[cookie])
      local_session = sessions.SessionProvider(cookies[cookie])
    
    cookie = settings.FRIENDCONNECT_COOKIE_NAME
    if cookies.has_key(cookie):
      key = hashlib.sha1(cookies[cookie]).hexdigest()
      logging.info("Continuing remote session (%s)" % key)
      remote_session = sessions.SessionProvider(key)
    
    if remote_session and local_session:
      remote_viewer = remote_session["viewer"]
      local_viewer = local_session["viewer"]
      if remote_viewer:
        logging.info("Remote viewer: %s" % remote_viewer.display_name)
      if local_viewer:
        logging.info("Local viewer: %s" % local_viewer.display_name)
      if remote_viewer and local_viewer:
        logging.info("Logged in twice, merging accounts")
        # TODO: Move this logic somewhere else and remove the restaurants import
        restaurants.LabelProvider().move_user_data(local_viewer, remote_viewer)
        remote_viewer.merge(local_viewer)
        
        local_session.kill()
        local_session = None
        self.set_cookie(settings.SESSION_COOKIE_NAME, "", -1)
        self.redirect("/")
    
    if not remote_session and not local_session:
      local_session = sessions.SessionProvider()
      cookie_value = urllib.quote_plus(local_session.key)
      self.set_cookie(settings.SESSION_COOKIE_NAME, cookie_value)
      logging.info("Starting local session (%s)" % local_session.key)
      
    # TODO: Prefer the local session if a gfc viewer does not exist
    return remote_session or local_session
      
  def error(self, status=500, message=None):
    """ Raise an error message with the appropriate HTTP status code.
    
    Args:
      status: HTTP status code to respond with.
      message: Text to display to the end user.
    """
    self.response.clear()
    self.response.set_status(status, message)
    self.response.out.write(message)
    
  def handle_exception(self, exception, debug):
    """ Handles UserVisibleErrors in a reasonable way.
    
    This method is called whenever App Engine detects an unhandled exception.
    In the case of a UserVisibleError, this method takes care of sending the
    message to display to the end user.  Otherwise, the base class exception
    handler method is called.
    
    Args:
      exception: The exception which was raised
      debug: Used by App Engine
    """
    if isinstance(exception, UserVisibleError):
      self.message_user(str(exception))
      logging.info("UserVisibleError: " + str(exception))
    else:
      logging.critical("Unhandled exception: %s" % exception)
    super(RequestHandler, self).handle_exception(exception, debug)
  
  def message_user(self, message):
    """ Sends a message to the end user. 
    
    User targeted messages that the application generates should not always
    be directly output, in case of a redirect, or if the message is generated
    too late to be inserted into a template.  This method keeps track of such
    messages in the current session, so that they can be displayed next time
    a template is rendered.
    """
    message_queue = self.request.session["message_queue"]
    if not message_queue:
      message_queue = []
    message_queue.append(message)
    self.request.session["message_queue"] = message_queue
    
  def render(self, response_data={}, response_headers={}):
    """ Called by subclasses to display data to the end user.
    
    Raises:
      NotImplementedError: There is no default way to display data so this 
          method is not implemented.
    
    Args:
      response_data: Data intended to be rendered for this response.
      response_headers: Headers intended to be sent with this response.
    """
    raise NotImplementedError("A renderer was not defined")

  def set_cookie(self, key, value, max_age=None):
    """ Sets a browser cookie.
    
    If no max_age is set, then the cookie is a session cookie.  Note that this
    method should only be called once per response, or else each subsequent
    call will wipe out the previous key/value pair sent.  
    
    Args:
      key: The key to use for this cookie.
      value: The value to store in the cookie.
      max_age: Time in seconds that this cookie should be stored for.
    """
    cookie_data = [
      "%s=%s" % (key, value),
      "path=%s" % settings.SESSION_COOKIE_PATH,
    ]
    if max_age is not None:
      rfcdate = formatdate(time.time() + max_age)
      expires = '%s-%s-%s GMT' % (rfcdate[:7], rfcdate[8:11], rfcdate[12:25])
      cookie_data.extend(["max_age=%s" % max_age, "expires=%s" % expires])

    cookie_str = "; ".join(cookie_data)
    self.response.headers["Set-Cookie"] = cookie_str
    logging.debug("Set cookie: %s" % cookie_str)
    
  def get_data(self):
    """  Returns data that should be sent for every request.
    
    Checks the message queue.  If there's messages to be sent to the end user,
    this returns the messages and empties the message queue.
    
    Returns:
      A dictionary that may contain the key "messages" containing any messages 
      to be sent to the end user in the form of a list.
    """
    data = {}
    if self.request.session.has_key("message_queue"):
      data["messages"] = self.request.session["message_queue"]
      del self.request.session["message_queue"]
    return data
    
  def get_headers(self):
    """ Returns headers that should be sent for every request.
    
    Returns:
      An empty dictionary since there are no default headers to return.
      Otherwise, this would return a dict where the key is the header name
      and the value is the header string for any headers to include.
    """
    return {}

  def require_parameters(self, *params):
    """ Sets certain parameters to be required in the current request.
    
    Raises:
      UserVisibleError: If any of the specified parameters are missing from 
          the request, this will be raised, containing the parameters which
          are missing from the request.
          
    Args:
      params: Every parameter required is specified as an argument to this 
          method, so if you want to require "password" and "user_name", call
          require_parameters("password", "user_name");
          
    Returns:
      A dict containing the parameters which were required and found in the
      request.  If you required "password" and "user_name" and both values
      were present in the request, you would get the following structure back:
      {
        "password" : value of the password parameter,
        "user_name" : value of the user_name parameter,
      }
    """
    missing = []
    found = {}
    for param in params:
      value = self.request.get(param, "")
      if value == "":
        missing.append(param)
      else:
        found[param] = value

    if len(missing) > 0:
      raise RequiredFieldsError(missing)

    return found
        
    
class TemplateRenderer(RequestHandler):
  """ An implementation of RequestHandler which renders output to a template.
  
  This class injects several variables needed for template rendering,
  such as the data required to initialize Friend Connect's JavaScript APIs,
  and keys to the various APIs used by this site.
  """
  
  def handle_exception(self, exception, debug):
    """ Handles exceptions that can be rendered to a template.
    
    Since this class renders to a template, we can automatically render 
    if we get a UserVisibleError (need to display an error to the user) or 
    a RequiredFieldsError (likely need to highlight missing data from a form)
    """
    if isinstance(exception, UserVisibleError):
      self.message_user(str(exception))
      logging.info("UserVisibleError: " + str(exception))
      self.render()
    elif isinstance(exception, RequiredFieldsError):
      data = { "errors" : { "fields" : exception.fields }}
      self.render(data)      
    else:
      super(RequestHandler, self).handle_exception(exception, debug)
    
  def get_template(self):
    """ Specifies which template file should be rendered. 
    
    Subclasses should override this method to return the name of a file in the
    src/templates directory.  The default template rendered is "error.html".
    
    Returns:
      The filename (no path) of a template to render from the src/templates
      directory.
    """
    return "error.html"
  
  def get_data(self):
    """ Adds additional data to each render call.
    
    Adds data needed by templates (usually base.html) to each render.
    
    Returns:
      The data returned by the get_data method of any base classes plus
      several key/value pairs usable by a template.
    """
    data = super(TemplateRenderer, self).get_data() 
    data.update({
      "viewer" : self.request.users.get_viewer(),
      "userprovider" : self.request.users.__class__.__name__.lower(),
      "view" : self.request.view or "index",
      "base_url" : self.request.host_url,
      "maps_api_key" : settings.MAPS_API_KEY,
      "analytics_id" : settings.ANALYTICS_ID,
      "site_title" : settings.SITE_TITLE,
      "friendconnect" : {
        "parent_url" : settings.FRIENDCONNECT_PARENT_URL,
        "base_domain" : settings.FRIENDCONNECT_BASE_DOMAIN,
        "rpc_url" : settings.FRIENDCONNECT_RPC_URL,
        "site_id" : settings.FRIENDCONNECT_SITE_ID,
      },
    })
    return data
    
  def get_headers(self):
    """ Adds template-specific headers to each render.
    
    Since the templates are HTML based, this sets the content type of the 
    returned data to text/html.
    
    Returns:
      The header structure returned by any base classes' get_headers calls, 
      with a Content-Type header set to text/html.  A charset is explicitly 
      set for security reasons.
    """
    headers = super(TemplateRenderer, self).get_headers()
    headers.update({
      "Content-Type" : "text/html;charset=UTF-8",
    })
    return headers

    
  def render(self, response_data={}, response_headers={}):
    """ Combines the data from this request with a template and outputs.
    
    Renders the specified template with the supplied parameters and outputs
    the result to the user.  Some parameters are automatically injected into
    the template. 
    """
    merged_headers = self.get_headers()
    merged_headers.update(response_headers)
    for header_name, header_value in merged_headers.iteritems():
      self.response.headers.add_header(header_name, str(header_value))
      
    merged_data = self.get_data()
    merged_data.update(response_data)
    template_name = self.get_template()
    path = os.path.join(os.path.dirname(__file__), "templates", template_name)
    
    self.response.out.write(webapp.template.render(path, merged_data))

    
class JsonRenderer(RequestHandler):
  """ An implementation of RequestHandler which renders output to JSON.
  
  This class takes all data for this request and attempts to serialize it to
  JSON.  The resulting JSON string is output to the user.
  """
  
  def _encode(self, obj):
    """ Method used by simplejson to encode model types to JSON.

    This method is called by simplejson when it cannot otherwise convert
    an object to JSON.  The convention used by this model is that if an object
    has a method named "json", the result of calling that method will be output
    as the representation for the object.  
    
    Raises:
      TypeError: Raised if the object does not have a method named json.
    """
    if hasattr(obj, "json") and callable(getattr(obj, "json")):
      return obj.json()
    raise TypeError(repr(obj) + " is not JSON serializable")
    
  def render(self, response_data={}, response_headers={}):
    """ Serializes the data from this request to JSON and outputs.
    
    Since the version of simplejson used by App Engine is a bit out of date,
    this has to monkey patch the _encode method into the simplejson library.
    (Future versions had support for setting this explicitly.)
    """
    merged_headers = self.get_headers()
    merged_headers.update(response_headers)
    for header_name, header_value in merged_headers.iteritems():
      self.response.headers.add_header(header_name, str(header_value))

    encoder = simplejson.JSONEncoder()
    encoder.default = self._encode   # Monkey patching is fun :)
    merged_data = self.get_data()
    merged_data.update(response_data)
    json = encoder.encode(merged_data)
    self.response.out.write(json)
    
  def get_headers(self):
    """ Adds JSON-specific headers to each render.
    
    I want the JSON to be human readable in a browser, so I'm returning 
    text/plain here even though application/json would be more appropriate.
    """
    headers = super(JsonRenderer, self).get_headers()
    headers.update({
      "Content-Type" : "text/plain;charset=UTF-8",
    })
    return headers
    
    
    
