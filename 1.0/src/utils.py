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

""" Utility methods for the general functionality of this application.

The following methods are exported:
  cache_set: Sets an object to a memory cache.
  cache_get: Gets an object from a memory cache.
  cache_delete: Deletes an object from a memory cache.
  cache: Decorator which caches the result of the method which it decorates.
  require_login_or_redirect: Redirects the user if they are not logged in.
  require_loggedout_or_redirect: Redirects the user if they are logged in.
"""

# Python imports
import logging

# AppEngine imports
from google.appengine.api import memcache
from google.appengine.ext import db

# Local imports
import settings
import models
  
##### Utility Methods #####

def cache_set(data, *args, **kwargs):
  """ Sets an object to a memory cache.

  Args:
    data: The data to cache.
    time: If specified, sets the time that this object may be held in the cache.
    args: Any non-keyword arguments are concatenated and used as the cache key.
  """
  time = settings.CACHE_TIME if not kwargs.has_key("time") else kwargs["time"]
  cache_key = "|".join(args)
  logging.debug("Set cache:  %s (%s seconds)" % (cache_key, time))
  memcache.set(cache_key, data, time)
  return data

def cache_get(*args):
  """ Gets an object from a memory cache.
  
  Args:
    data: The data to cache.
    time: If specified, sets the time that this object may be held in the cache.
    args: Any non-keyword arguments are concatenated and used as the cache key.
  """
  cache_key = "|".join(args)
  data = memcache.get(cache_key)
  if data is None:
    logging.debug("Cache miss: %s" % cache_key)
  else:
    logging.debug("Cache hit:  %s" % cache_key)
  return data
  
def cache_delete(*args):
  """ Deletes an object from a memory cache.

  Args:
    args: Any non-keyword arguments are concatenated and used as the cache key.
  """
  cache_key = "|".join(args)
  logging.debug ("Cache delete: %s" % cache_key)
  return memcache.delete(cache_key)
        
##### Decorators #####

def cache(key_format, time=settings.CACHE_TIME):
  """ Decorator which caches the result of the method which it decorates.
  
  Stores the output of the method this decorates in memcache. Based off of the
  pattern submitted by bcannon (modified by jorisp) at http://is.gd/6rAw
  
  Args: 
    key_format: A string containing placeholder tokens in the form of %s.  
        Tokens will be substituted with the values of any non-keyword arguments
        to the decorated method, in the order in which they appear.  If the
        argument is a data store object, its data store key will be used as 
        the token replacement.
    time: Optional argument specifying how long in seconds the result should
        be cached for.
    
  Returns:
    The result of calling the decorated method with the supplied arguments,
    from the cache if available, otherwise, from calling the method directly.
  """
  def method_decorator(method):
    def method_wrapper(*args, **kwargs):
      key_args = []
      for arg in args[0:key_format.count('%')]:
        if hasattr(arg, "key") and hasattr(arg.key(), "id_or_name"):
          key_args.append(arg.key().id_or_name())
        else:
          key_args.append(str(arg))
      data = cache_get(key_format % tuple(key_args))
      if data:
        return data
      data = method(*args, **kwargs)
      return cache_set(key, data, time)
    return method_wrapper
  return method_decorator
  
def require_login_or_redirect(url):
  """ Redirects the user if they are not logged in.

  This is intended to decorate a method on a webapp.RequestHandler subclass.
  
  Args:
    url: The url to redirect the user to if they are not logged in.
  """
  def method_decorator(method):
    def method_wrapper(self, *args, **kwargs):
      if not self.request.users.get_viewer():  # Can be False or None
        self.redirect(url)
        return
      return method(self, *args, **kwargs)
    return method_wrapper
  return method_decorator
  
def require_loggedout_or_redirect(url):
  """ Redirects the user if they are logged in.
    
  This is intended to decorate a method on a webapp.RequestHandler subclass.
  
  Args:
    url: The url to redirect the user to if they are logged in.
  """
  def method_decorator(method):
    def method_wrapper(self, *args, **kwargs):
      if self.request.users.get_viewer():  # Can be False or None
        self.redirect(url)
        return
      return method(self, *args, **kwargs)
    return method_wrapper
  return method_decorator

 