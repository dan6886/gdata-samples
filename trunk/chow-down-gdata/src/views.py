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

""" View implementations to provide data to the configured URLs in the website.

These view handlers process requests and gather data to render to the end 
user.  The end of this file specifies how URLs are mapped to view handlers.
"""

# Python imports
import logging
import urllib

# Google App Engine imports.
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

# Local imports
from providers import restaurants
import controller
import utils
import settings
import models
  
class LoginView(controller.TemplateRenderer):
  """ Displays a login form to the user and processes the submitted info."""
  def get_template(self):
    """ Contains the login form. """
    return "login.html"
    
  @utils.require_loggedout_or_redirect("/")
  def get(self):
    """ Displays available login options to the user. """
    self.render()
    
  def post(self):
    """ Handles the login post from a user. """
    params = self.require_parameters("user_name", "password")
    self.request.users.authenticate(**params)
    self.redirect("/")


class LogoutView(controller.TemplateRenderer):
  """ Clears a user's session and logs them out of Friend Connect."""
  def get_template(self):
    """ Contains JavaScript to log the user out of Friend Connect. """
    return "logout.html"
    
  @utils.require_login_or_redirect("/login")
  def get(self):
    """ Ends the user's 'session' and redirects back to the login page. """
    if self.request.session.has_key("viewer"):
      del self.request.session["viewer"]
    self.request.session.kill()
    self.set_cookie(settings.SESSION_COOKIE_NAME, "", -1)
    self.render()


class RegisterView(controller.TemplateRenderer):
  """ Displays a register form and handles the submitted data. """
  def get_template(self):
    """ Contains the registration form. """
    return "register.html"
    
  def get(self):
    """ Displays a form that the user may use to register. """
    self.render()
    
  def post(self):
    """ Handles the registration post from a user. """
    params = self.require_parameters("user_name", "password", "password_again")
    params["thumbnail_image"] = self.request.get("thumbnail_image", None)
    self.request.users.register(**params)
    self.redirect("/")
    return


class JsonFriendsView(controller.JsonRenderer):
  """ Displays a page of the user's friends as JSON data. """
  __friends = None
  __count = 0
  __start = 0
  
  def __populate_data(self):
    """ Get data about the viewer's friends. """
    if self.__friends is None:
      try:
        self.__count = int(self.request.get("count"))
      except:
        self.__count = settings.FRIEND_PAGE_SIZE
        
      try:
        self.__start = int(self.request.get("start"))
      except:
        self.__start = 0
        
      self.__friends = self.request.users.get_viewer_friends(self.__start, 
                                                             self.__count)
      label_provider = restaurants.LabelProvider()
      if self.__friends:
        for friend in self.__friends:
          labels = label_provider.get_by_user(friend)
          if labels:
            friend.labels = labels

  def get_headers(self):
    """ Get headers for this request.  
    
    Returns:
      Three custom headers are returned to indicate metadata about the current
      page of friends - X-Start-Next indicates the start index of the next page
      of friends, X-Start-Prev indicates the start index of the previous page
      of friends, and X-Count indicates how many total friends are available.
      If a next or previous page does not exist, the returned values will be
      an empty string, so that a template can check for these easily.

      These values are returned as headers so that Ajax requests can be easily
      parsed to create urls for the next and previous pages of friends, without
      needing to parse DOM.  This isn't that useful for JSON requests, but
      template handlers which inherit from this class will use this feature.
      TODO: Consider refactoring this into AjaxFriendsView, where it is 
      actually used. (Ensure all subclasses which need these headers inherit
      from AjaxFriendsView instead).
    """
    headers = super(JsonFriendsView, self).get_headers()
    self.__populate_data()
    if self.__friends:
      headers.update({
        "X-Start-Next" : self.__friends.next_start(self.__count),
        "X-Start-Prev" : self.__friends.prev_start(self.__count),
        "X-Count" : self.__count,
      })
    return headers
    
  def get_data(self):
    """ Get data for this request.
    
    Returns:
      The list of the viewer's friends, as well as parameters indicating
      the start for the next page of data, the previous page of data, and
      the total number of friends in the entire data set.  
    """
    data = super(JsonFriendsView, self).get_data()
    self.__populate_data()
    if self.__friends:
      data.update({ 
        "viewer_friends" : self.__friends, 
        "friends_next_start" : self.__friends.next_start(self.__count),
        "friends_prev_start" : self.__friends.prev_start(self.__count),
        "friends_count" : self.__count
      })
    return data
    
  @utils.require_login_or_redirect("/login")
  def get(self):
    """ Renders the page of data. """
    self.render()


class AjaxFriendsView(controller.TemplateRenderer, JsonFriendsView): 
  """ A templated version of JsonFriendsView. """
  def get_template(self):
    """ Renders the data to HTML. """
    return "ajax_friends.html"

    
class AjaxInviteFriendsView(controller.TemplateRenderer, JsonFriendsView): 
  """ A paged view of friend data meant for the invite friends popup view. """
  def get_template(self):
    """ Renders the data to a format needed for the invite view. """
    return "ajax_friends_invite.html"
    
  def post(self):
    """ Handles the response from the invite form.
    
    This method adds a posted list of comma separated friend guids to a given 
    invite.  Both of these identifiers come from the POST request.
    """
    params = self.require_parameters("label_id")
    invited_ids = self.request.get("invited_ids", None)
    if invited_ids:
      invited_ids = invited_ids.split(",")
    else:
      invited_ids = []
    logging.info("invited_ids: %s" % invited_ids)
    label = restaurants.LabelProvider().get_by_key(params["label_id"])
    if label and label.user == self.request.users.get_viewer():
      label.invited_guids = invited_ids
      label.put()
    self.render()


class JsonRestaurantSearchView(controller.JsonRenderer): 
  """ Displays the results of a restaurant search. """   
  def get(self):
    """ Takes a search from the querystring and renders the results as JSON."""
    params = self.require_parameters("term", "location")
    provider = restaurants.RestaurantProvider()
    result = provider.search(params["term"], params["location"])
    self.render({
      "restaurants" : result,
    })
    

class AjaxRestaurantSearchView(controller.TemplateRenderer, 
                               JsonRestaurantSearchView): 
  """ Renders the results of a restaurant search to a template. """
  def get_template(self):
    """ Presents search results as HTML. """
    return "ajax_restaurant_search.html"

class JsonRestaurantInfoView(controller.JsonRenderer): 
  """ Displays the results of a restaurant search. """   
  def get(self):
    """ Takes a search from the querystring and renders the results as JSON."""
    params = self.require_parameters("restaurant_id")
    provider = restaurants.RestaurantProvider()
    #result = provider.restaurant_info(params["restaurant_id"])
    result = provider.get_restaurant(params["restaurant_id"])
    self.render({
      "restaurant" : result,
    })

class AjaxRestaurantInfoView(controller.TemplateRenderer, JsonRestaurantInfoView): 
  """ Renders info about a restaurant to a template. """
  def get_template(self):
    """ Presents info about a restaurant as HTML. """
    return "ajax_restaurant_info.html"


class JsonRestaurantsView(controller.JsonRenderer):  
  """ Renders the list of the user's chosen restaurants to JSON. """  
  def get_data(self):
    """ Returns the list of restaurants tagged to this user.
    
    Searches the data store to return data about the user's bookmarked 
    restaurants, as well as which restaurants the user has been invited to.
    
    Additionally, the invited friends list and owner for each restaurant 
    bookmark returned is populated with data before being rendered, so owners
    and invitees can be rendered.
    
    Returns:
      A dict containing the restaurant data for this user.
    """
    data = super(JsonRestaurantsView, self).get_data()
    provider = restaurants.LabelProvider()
    viewer = self.request.users.get_viewer()
    labels = provider.get_by_user(viewer)
    for label in labels:
      invitees = self.request.users.get_users_by_key_name(label.invited_guids)
      if invitees:
        label.invitees = invitees.itervalues()
        
    invites = provider.get_by_invitee(viewer)
    if invites:
      for invite in invites:
        invite.user = self.request.users.get_user_by_key_name(invite.user.guid)
      
    data.update({
      "labels" : labels,
      "invites" : invites,
    })
    return data
    
  def get(self):
    """ Display the restaurant data. """
    self.render()
    
  def post(self):
    """ Adds a new restaurant bookmark for the current user. """
    params = self.require_parameters("restaurant_id")
    viewer = self.request.users.get_viewer()
    label_provider = restaurants.LabelProvider()
    restaurant_provider = restaurants.RestaurantProvider()
    restaurant = restaurant_provider.get_restaurant(params["restaurant_id"])
    label_provider.set(viewer, restaurant, "try")
    self.render()
    
  def delete(self):
    """ Deletes a restaurant bookmark from the current user's list. """
    viewer = self.request.users.get_viewer()
    label_provider = restaurants.LabelProvider()
    params = self.require_parameters("key")
    label = label_provider.get_by_key(params["key"])
    if label and label.user == viewer:
      label.delete()
    self.render()


class AjaxRestaurantsView(controller.TemplateRenderer, JsonRestaurantsView):
  """ Renders the user's restaurant data to a template. """
  def get_template(self):
    """ Presents restaurant data as HTML. """
    return "ajax_restaurants.html"
    

class VanillaView(controller.TemplateRenderer):
  """ Renders template files without any additional data or processing."""
  __filename = "error.html"
    
  def get(self, template_filename):
    """ Renders a file as a template. 
    
    This is an easy way to quickly map an URL to a template.  In the URL 
    binding, a regex is used to parse the template filename.  If the file
    exists, it is rendered with the default data set.  This is an easy way
    to add login/logout controls to what would otherwise normally be a static
    file.
    
    Args:
      template_filename: The filename of the template to render, bound from
          a capturing regular expression below.
    """
    self.__filename = template_filename
    self.render()
    
  def get_template(self):
    """ Returns the template that was set in the get method. """
    return self.__filename


class IndexView(AjaxFriendsView, AjaxRestaurantsView):  
  """ Composite view of the user's friends and their restaurants. 
  
  Instead of repeating the same code to fetch friends or restaurants for the
  current user, this class takes advantage of Python's multiple inheritance
  to pull both sets of data and combine them.
  """ 
  def get_template(self):
    """ Renders all of the user's data to HTML.
    
    This template actually references the templates for AjaxFriendsView
    and AjaxRestaurantsView, so that the rendering code is also not repeated."""
    return "index.html"

  @utils.require_login_or_redirect("/login")
  def get(self, extra=""):
    """ Renders the main view for the application. """
    self.render()
  

##### URL Bindings #####


if __name__ == '__main__':
  handlers = [ 
      ('/(rpc_relay\.html)', VanillaView),
      ('/(canvas\.html)', VanillaView),
      ('/(members\.html)', VanillaView),
      ('/login', LoginView),
      ('/logout', LogoutView),
      ('/register', RegisterView),
      ('/ajax/friends', AjaxFriendsView),
      ('/json/friends', JsonFriendsView),
      ('/invite/friends', AjaxInviteFriendsView),
      ('/ajax/restaurants/search', AjaxRestaurantSearchView),
      ('/ajax/restaurants/restaurant_info', AjaxRestaurantInfoView),
      ('/ajax/restaurants', AjaxRestaurantsView),
      ('/json/restaurants', JsonRestaurantsView),
      ('/(.*)', IndexView),
  ]
  run_wsgi_app(webapp.WSGIApplication(handlers, debug=settings.DEBUG))