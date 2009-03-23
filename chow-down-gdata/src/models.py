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

""" Data models used by this application.

The following classes are exported:
  User: Represents a basic user object.
  FriendConnectUser: Represents a user linked to a Friend Connect account.
  UserList: Represents a paged subset of a list of users.
  Restaurant: Represents information about a restaurant.
  Label: Represents a user's selection of a restaurant to try.
"""

# Python imports
import datetime
import logging
import hashlib

# AppEngine imports
from google.appengine.ext import db
from google.appengine.ext.db import Key
from google.appengine.ext.db import polymodel

# Local imports
import settings

    
class User(polymodel.PolyModel):
  """ Represents a basic user object.
  
  This object represents the core amount of information that can be stored in
  the database about a given user.  Locally registered users default to this
  type of object, but may be upgraded later if they combine accounts with a
  FriendConnectUser.
  
  Attributes:
    thumbnail_image: The filename (no path) of a thumbnail for this user.
    password_hash: A hashed version of the user's password.
    provider_id: A string representing an external ID representing this user.
    user_name: A login name for the user.
  """
  thumbnail_image = db.StringProperty()
  password_hash = db.StringProperty()
  provider_id = db.StringProperty()
  user_name = db.StringProperty()
  
  @staticmethod
  def create_key_name(user_name):
    """ Gets a string to identify this user in the data store. 
    
    Returns:
      A string safe to use as a key in the App Engine datastore.
    """
    return "user|%s" % user_name
    
  @property
  def display_name(self):
    """ Gets a human readable string to identify this user.
    
    Returns:
      The user's user_name.
    """
    return self.user_name

  @property
  def thumbnail_url(self):
    """ Gets the URL of the thumbnail for this user. 
    
    Returns:
      A string that can be placed in a HTML img tag's src attribute.
    """
    return settings.URL_TEMPLATE_THUMBNAIL % self.thumbnail_image
    
  @property
  def guid(self):
    """ Gets a site-unique identifier for this user.
    
    Returns:
      A string that uniquely identifies this user on this site, across all
      user providers.  This string can be used to retrieve the user's data store
      record later on.
    """
    return str(self.key().id_or_name())

  @property
  def user_type(self):
    """ Gets a string identifying the type of user this is.
    
    Returns:
      The lowercased classname of this user object.  Because User will be 
      subclassed, this will help identify Friend Connect users vs. normal 
      registered users.
    """
    return self.__class__.__name__.lower()

  def __eq__(self, other):
    """ Comparison operator for two user objects. 
    
    Args:
      other: Another User object to compare this User to.
      
    Returns:
      True if the two objects represent the same user (by provider ID).
      If the argument passed to this function does not have a provider ID, the
      behavior of this function defaults to a normal object comparison.
    """
    if hasattr(other, "provider_id"):
      return self.provider_id == other.provider_id
    return super(User, self).__eq__(other)

  def json(self):
    """ Gets a representation of this object that can be JSON serialized.
    
    Returns:
      A dict containing information about this user for the purposes of 
      outputting to JSON.
    """
    return {
      "user_name" : self.user_name,
      "provider_id" : self.provider_id,
      "display_name" : self.display_name,
      "thumbnail_url" : self.thumbnail_url,
    }  
  
class FriendConnectUser(User):
  """ Represents a user linked to a Friend Connect account.
  
  Overrides many of the User properties to pull data from an OpenSocial
  Person object which is used to initialize this class.  The Person object
  is not represented as an attribute that is storable in the App Engine
  data store, so writing this user to the data store and retrieving it will
  wipe out most of the information associated with this record.  The purpose
  of this design is so that data from Friend Connect is not stored in the 
  App Engine data store but rather in a memory caching mechanism, falling back
  to requesting the person by ID number from Friend Connect if they do not
  exist in memory.  See users.py for the implementation of the rest of this
  infrastructure.  
  
  If this object is pulled directly from the data store and not initialized, 
  it will fall back to behavior defined by the base User object.  
  """
  __person = None
  
  @staticmethod
  def from_person(person):
    """ Creates a FriendConnectUser instance from an OpenSocial Person.
    
    If the FriendConnectUser does not already exist in the data store, it will 
    be created by calling this method.
    
    Args:
      person: An OpenSocial Person object returned by the OpenSocial client
          library.
    
    Returns:
      A FriendConnectUser, or None if no person was supplied.
    """
    if not person:
      return None

    params = {
      "key_name" : User.create_key_name(person.get_id()),
      "provider_id" : person.get_id(),
    }
    user = FriendConnectUser.get_or_insert(**params)
    user.__person = person
    return user
    
  @property
  def user_type(self):
    """ Gets a string representing the type of user this represents. 
    
    It is useful to differentiate between a FriendConnectUser which has 
    associated Person data, and one which has been pulled from the data store
    and does not have Person data attached.  This method checks for the 
    second case and appends a label if Person data is not available.
    
    Returns:
      The string "friendconnectuser" if Person data is available, or 
      "loggedout_friendconnectuser" if not.
    """
    user_type = super(FriendConnectUser, self).user_type
    if self.__person:
      return user_type
    else:
      return "loggedout_%s" % user_type
    
  @property
  def display_name(self):
    """ Gets a human readable identifier for this user. 
    
    Returns:
      The OpenSocial Person's display name, or the default User behavior if that
      is not available.
    """
    if self.__person:
      return self.__person.get_display_name()
    else:
      return super(FriendConnectUser, self).display_name
  
  @property
  def profile_url(self):
    """ Gets an URL that links to this user's profile page.
    
    Returns:
      A string that can be used as a HTML anchor element's href attribute.
    """
    if self.__person:
      return self.__person.get_field("profileUrl")
    else:
      return super(FriendConnectUser, self).profile_url
    
  @property
  def thumbnail_url(self):
    """ Gets an URL to an image which represents this User. 
    
    Returns:
      A string that can be used as a HTML img element's src attribute.
    """
    if self.__person:
      return self.__person.get_field("thumbnailUrl")
    else:
      return super(FriendConnectUser, self).thumbnail_url
      
  def json(self):
    """ Gets a JSON-encodable object that represents this user.
    
    Returns:
      An dict that can be encoded to JSON with this user's information.
    """
    user_json = super(FriendConnectUser, self).json()
    user_json.update({
      "profile_url" : self.profile_url,
    })
    return user_json
    
  def merge(self, other):
    """ Combines two user accounts.
    
    The case when a user registers for an account yet later logs in via another
    user provider must be addressed by combining user accounts in some way.
    This site copies the registered user's data to Friend Connect user's 
    record and saves the Friend Connect user's account.
    
    When a regular User is merged with a FriendConnectUser, the regular User
    is deleted.
    
    When a FriendConnectUser is merged with another FriendConnectUser (in the
    unlikely case where a user registers, connects their account to a Friend
    Connect login, signs out, signs back in again with their username and 
    password instead of using Friend Connect, and connects their account to a
    different Friend Connect account) the local user data which was originally
    copied to the first Friend Connect account is deleted and both objects are
    saved.
    
    Note that this method does not take care of merging other data from the 
    database - it is still neccessary to update any associated Labels 
    between the two user accounts.
    
    Args:
      other: Another User whose data will be added to this account.  The 
          supplied user will be deleted from the data store or have fields
          wiped out by this operation.
    """
    if isinstance(other, User):
      self.user_name = other.user_name
      self.thumbnail_image = other.thumbnail_image
      self.password_hash = other.password_hash
      
      if type(other) == User:
        other.delete()
        logging.info("Merging standard User")
      
      if type(other) == FriendConnectUser:
        other.thumbnail_image = None
        other.password_hash = None
        other.user_name = other.provider_id
        db.put(other)
        logging.info("Merging friend connect user")

      db.put(self)
      
  
class UserList(list):
  """ Represents a paged subset of a list of users.
  
  Results from the OpenSocial API calls can be paged to only return a small
  subset of what may be a large list of users.  This class mimics the response
  structure of such a list by adding properties to show the paging information
  associated with this data.
  
  Attributes:
    start: The zero-based start position of where the first element of this list 
        is indexed inside of the larger list.
    end: The zero-based end position of where the last element of this list is
        indexed inside of the larger list.
    total: The total number of entries in the larger list.
  """
  start = 0
  end = 0
  total = 0
  
  def next_start(self, count):
    """ Returns the zero-based start index for the next page of this list.
    
    Args:
      count: The number of records in each page.
      
    Returns:
      A number indicating the next start position if there is another page
      available in the master list, an empty string otherwise.
    """
    if self.end < self.total:
      return self.start + count
    return ""

  def prev_start(self, count):
    """ Returns the zero-based start index for the previous page of this list.
    
    Args:
      count: The number of records in each page.
      
    Returns:
      A number indicating the start position of the previous page in the master
      list if there is a previous page available, an empty string otherwise.
    """
    if self.start > 0:
      new_start = max(0, self.start - count)
      return new_start
    return ""

  def json(self):
    """ Gets a JSON-encodable object that represents this list.
    
    Returns:
      An dict that can be encoded to JSON with this list's information.
    """
    return {
      "start" : self.start,
      "end" : self.end,
      "total" : self.total,
      "users" : list(self),
    }
    
  def __new__(cls, data=[]):
    """ Used for inheriting from the native list type. """
    return list.__new__(cls, data)


class Restaurant(db.Model):
  """ Represents information about a restaurant.
  
  Attributes:
    restaurant_id: A string identifier of this restaurant to the data provider.
    name: A human readable name for this restaurant.
    updated: The last time this record was updated in the data store.
    address: The street address for this restaurant.
    city: The city where this restaurant is located.
    state: The state in which this restaurant is located.
    rating_average: The average of all ratings of this restaurant from 0.0-5.0
    rating_count: The number of ratings for this restaurant.
    url: A business URL for this restaurant.
    location: A lat, lng pair indicating the geo coordinates of this restaurant.
    caregories: A list of strings identifying the types of cuisine this 
        restaurant offers.
  """
  restaurant_id = db.StringProperty()
  name = db.StringProperty()
  updated = db.DateTimeProperty(auto_now=True)
  address = db.StringProperty()
  city = db.StringProperty()
  state = db.StringProperty()
  rating_average = db.FloatProperty()
  rating_count = db.IntegerProperty()
  url = db.LinkProperty()
  location = db.GeoPtProperty()
  categories = db.StringListProperty()
  
  def json(self):
    """ Gets a JSON-encodable object that represents this restaurant.
    
    Returns:
      An dict that can be encoded to JSON with this restaurant's information.
    """
    return {
      "restaurant_id" : self.restaurant_id,
      "name" : self.name,
    }


class Label(db.Model):
  """ Represents a user's selection of a restaurant to try.
  
  Attributes:
    user: The User who has created the selection.
    restaurant: Which restaurant was selected.
    text: A description for the label.
    updated: When the label was last updated in the data store.
    invited_guids: A list of strings corresponding to the User.guid values for
        any users who were invited by the creator of this label to eat at
        the restaurant.
  """
  user = db.ReferenceProperty(User)
  restaurant = db.ReferenceProperty(Restaurant)
  text = db.StringProperty()
  updated = db.DateTimeProperty(auto_now=True)
  invited_guids = db.StringListProperty()
    
  def json(self):
    """ Gets a JSON-encodable object that represents this label.
    
    Returns:
      An dict that can be encoded to JSON with this label's information.
    """
    return {
      "user" : self.user,
      "restaurant" : self.restaurant,
      "text" : self.text,
    }
