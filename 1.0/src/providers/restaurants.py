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

""" Code related to the fetching and bookmarking of restaurant information.

The following classes are exported:
  LabelProvider: Provides methods to work with saving bookmarks and invites.
  RestaurantProvider: Delivers restaurant data from a web service.
"""

# Python imports
import urllib
import logging

# AppEngine imports
from google.appengine.ext import db
from google.appengine.api import urlfetch

# Django imports
from django.utils import simplejson

# GData Python Client imports
import gdata.youtube.service
import gdata.photos.service
import gdata.urlfetch

# Set request handling to gdata.urlfetch
gdata.service.http_request_handler = gdata.urlfetch

# Local imports
import utils
import models
import hashlib
import settings

class LabelProvider(object):
  """ Provides methods to work with saving bookmarks and invites.
  
  Provides some convenience methods for working with label data structures.
  It may be desirable to refactor this class to be static methods on the 
  Label data model sometime in the future.
  """
  def get_by_user(self, user):
    """ Get labels created by the specified user.
    
    Currently this method only returns the last 100 labels.  This could be 
    refactored to be more flexible and allow paging.
    
    Args:
      user: A models.User object.
      
    Returns:
      A list of models.Label objects, created by the specified user and sorted
      by last modified first.
    """
    query = models.Label.gql("where user=:1 order by updated desc", user)
    return query.fetch(100)
    
  def get_by_invitee(self, user):
    """ Get labels where the specified user has been marked as an invitee.
    
    Currently this method only returns the last 100 labels. This could be
    refactored to be more flexible and allow paging.
    
    Args:
      user: A models.User object.
      
    Returns:
      A list of models.Label objects, where the specified user is in the 
      invited user list.  
      TODO: Sort this list by updated date.
    """
    if hasattr(user, "guid"):
      query = models.Label.gql("where invited_guids = :1", user.guid)
      return query.fetch(100)
    return None
    
  def get_by_key(self, key):
    """ Gets a label by its data store key.
    
    Returns:
      The data store entry corresponding with the specified key.  
    """
    return db.get(key)

  def set(self, user, restaurant, text):
    """ Creates a new label if one does not already exist.
    
    If the restaurant passed in to this method has not been saved to the data
    store (only cached in memory), it will be stored to enforce the reference
    property on the resulting label.
    
    Args:
      user: The user who created this label.
      restaurant: The restaurant which is being labeled.
      text: A text description for the label.  
      
    Returns:
      If a label with the same user, restaurant, and text exists, the data 
      store entry for that label.  Otherwise, the newly created label. 
    """
    label = models.Label.gql("where user=:1 and restaurant=:2 and text=:3",
                             user, restaurant, text).get()
    if label:
      return label
                             
    key_name = "label|%s|%s|%s" % (user.provider_id, restaurant.restaurant_id,
                                   hashlib.sha1(text).hexdigest())
    params = {
      "key_name" : key_name,
      "restaurant" : restaurant,
      "user" : user,
      "text" : text,              
    }
    db.put(restaurant)  # May just be locally cached
    return models.Label.get_or_insert(**params) 
    
  def move_user_data(self, from_user, to_user):
    """ Moves all label data from one user to another user account.
    
    Used in cases where two accounts merge, this migrates all label data
    from the first account to the second account.  This includes changing 
    the owner on any labels created by the first user, and updating any
    invites which specify the first user, to the second user.
    
    Args:
      from_user: The user where data is being migrated from.
      to_user: The user who data will be migrated to.
    """
    query = models.Label.gql("where user=:1", from_user)
    for label in query:
      if label.invited_guids:
        label.invited_guids.remove(to_user.guid)
      label.user = to_user
      label.put()
    
    query = models.Label.gql("where invited_guids = :1", from_user.guid)
    for label in query:
      label.invited_guids.remove(from_user.guid)
      label.invited_guids.append(to_user.guid)
      label.put()
    
    
class RestaurantProvider(object):
  """ Provides data about restaurants from the YQL web service.
  
  The public interface from this class could be adopted to support other
  restaurant providers.  Yahoo! local search was chosen because it provides
  rating data and has fairly permissive quota limits.
  """
  def __init__(self):
    """ Constructor.
    
    Sets which fields will be requested from the YQL query.
    """
    self.restaurant_fields = ", ".join([
        "id", "Title", "Address", "City", "State", "Rating.AverageRating", 
        "Rating.TotalRatings", "BusinessUrl", "Categories", "Latitude", 
        "Longitude"])
        
  def _cache_restaurant(self, restaurant):
    """ Stores a restaurant in the memory cache.
    
    Args:
      restaurant: The object to store in the cache.  The restaurant id is used
          as a cache key.
    """
    utils.cache_set(restaurant, "restaurant", restaurant.restaurant_id)
    
  def _cache_get_restaurant(self, restaurant_id):
    """ Gets a restaurant from the cache.
    
    Args:
      restaurant_id: The id of the restaurant to retrieve from the cache.
      
    Returns:
      The data for the restaurant with the corresponding ID, if it existed in
      the cache, else None.
    """
    return utils.cache_get("restaurant", restaurant_id)
    
  def _convert_result_to_restaurant(self, result):
    """ Converts a YQL search result to a models.Restaurant object.
    
    Args:
      result: The dict returned by a YQL search.
      
    Returns:
      An initialized (but not saved) models.Restaurant instance with the 
      appropriate properties set to the data from the search result.
    """
    try:
      rating_average = float(result["Rating"]["AverageRating"])
    except ValueError:
      rating_average = -1.0
      
    try:
      rating_count = int(result["Rating"]["TotalRatings"])
    except ValueError:
      rating_count = 0
      
    location = db.GeoPt(result["Latitude"], result["Longitude"])
    
    categories = []
    if isinstance(result["Categories"]["Category"], list):
      for category in result["Categories"]["Category"]:
        categories.append(category["content"])
    else:
      categories.append(result["Categories"]["Category"]["content"])
    
    params = {
      "key_name" : "restaurant|%s" % result["id"],
      "restaurant_id" : result["id"],
      "name" : result["Title"],
      "address" : result["Address"],
      "city" : result["City"],
      "state" : result["State"],
      "rating_average" : rating_average,
      "rating_count" : rating_count,
      "url" : result["BusinessUrl"],
      "location" : location,
      "categories" : categories
    }
    
    return models.Restaurant(**params)
    
  def _yql_query(self, query):
    """ Performs a query on the YQL web service interface.
    
    Args:
      query: A string query in the YQL query syntax.
      
    Returns:
      If a result was returned, a dict representing the data structure which
      was passed back.  None otherwise.
    """
    query_hash = hashlib.sha1(query).hexdigest()
    result = utils.cache_get("yql_query", query_hash)
    if result is None:
      logging.info("Fetching yql query: %s" % query)
      query = urllib.quote_plus(query)
      url = "http://query.yahooapis.com/v1/public/yql?q=%s&format=json" % query
      response = simplejson.loads(urlfetch.fetch(url).content)["query"]
    
      if response is None or int(response["count"]) == 0:
        return None
        
      # Result set is inconsistent if there is only one result
      if int(response["count"]) == 1:
        result = [response["results"]["Result"]]
      else:
        result = response["results"]["Result"]
        
      utils.cache_set(result, "yql_query", query_hash) 
    return result
    
  def _yql_restaurant_search(self, term, location):
    """ Performs a Yahoo! local search, limiting results to restaurants only.
    
    This uses the category code for "Restaurants" in the Yahoo! local search
    API to limit results, otherwise searching would return all kinds of local
    businesses.
    
    The number of search results are limited to keep this code simple.  A 
    more sophisticated implementation would allow paging.
    
    Args:
      term: The search term to use.
      location: A string representing the location to search in.
    
    Returns:
      A list of models.Restaurant objects corresponding to the results of the
      query, or None if no restaurants were found.
    """
    query_params = {
      "query" : term,
      "location" : location,
      "category" : "96926236", # Code for 'Restaurants'
      "limit" : settings.SEARCH_RESULTS,
      "offset" : 0,
      "fields" : self.restaurant_fields,
    }
          
    query = " ".join([
      'select %(fields)s from local.search where',
      'query="%(query)s"',
      'and location="%(location)s"',
      'and category="%(category)s"',
      'limit %(limit)s',
      'offset %(offset)s',
    ]) % query_params

    result = self._yql_query(query)

    if result is None:
      restaurants = None
    else:
      restaurants = map(self._convert_result_to_restaurant, result)
    return restaurants
    
  def _yql_restaurant_get(self, restaurant_id):
    """ Gets a single restaurant's data.
    
    This method performs a query for a single restaurant, returning the results
    from the Yahoo! local search.
    
    Args:
      The ID of the restaurant to fetch.
      
    Returns:
      The models.Restaurant object with the data corresponding to the restaurant
      with the given ID number, or None if no results were found.
    """
    params = {
      "id" : restaurant_id,
      "fields" : self.restaurant_fields,
    }
    
    query = 'select %(fields)s from local.search(1) where id=%(id)s' % params      
    result = self._yql_query(query)
    if result:
      return self._convert_result_to_restaurant(result)
    return None
  
  def restaurant_info(self, restaurant_id, cache_metadata=True):
    """ Fetch information about a particular restaurant by using the YouTube
    Data API and the Picasa Web Albums API.
    
    This method makes use of the Python Client Library (v1.2.4).
    
    Args:
      The ID of the restaurant for which to fetch data.
      
    Returns:
      The models.Restaurant object with additional properties that contain data
      fetched from either API.
     """
    restaurant = self.get_restaurant(restaurant_id)
    metadata_has_been_searched = False
    try:
      metadata_has_been_searched = restaurant.metadata_has_been_searched
    except AttributeError:
      pass
    if metadata_has_been_searched is True:
      # We already did the retrieval below so just return the restaurant
      logging.info(
        "YT and Picasa data found in cache for restaurant %s" % restaurant_id); 
      return restaurant

    # Search the YouTube API using the Gdata Python Client
    gdata_youtube_client = gdata.youtube.service.YouTubeService();
    # Construct a query object
    query = gdata.youtube.service.YouTubeVideoQuery()
    # Set the search term and the number of results to retrieve
    query.vq = "%s %s" % (restaurant.name, restaurant.city)
    video_feed = gdata_youtube_client.YouTubeQuery(query)
    logging.info(
      "Searching YouTube for videos for restaurant %s" % restaurant_id)
    restaurant.has_video = False
    if len(video_feed.entry) > 0:
      # We only care about the first entry
      video_entry = video_feed.entry[0]
      if video_entry is not None:
        restaurant.has_video = True
        restaurant.video_title = video_entry.title.text
        restaurant.video_author_name = video_entry.author[0].name.text
        restaurant.video_description = video_entry.media.description.text

        # Look for the URL to the embedded YouTube Player
        swf_url = video_entry.GetSwfUrl()
        if swf_url:
          restaurant.player = """
            <object width="425" height="350">
              <param name="movie" value="%s"></param>
              <embed src="%s" type="application/x-shockwave-flash"
              width="425" height="350"></embed></object>""" % (swf_url, swf_url)
      
    # Search the Picasa Web Albums API using the Gdata Python Client
    gdata_picasawebalbums_client = gdata.photos.service.PhotosService()
    query_parameters = map(urllib.quote, [restaurant.name, restaurant.city]);
    photo_feed = gdata_picasawebalbums_client.GetFeed(
      "/data/feed/api/all?q=%s%%20%s&max-results=10&thumbsize=32c" %
        (query_parameters[0], query_parameters[1]))
    logging.info(
      "Searching Picasa Web Albums for images on restaurant %s" % restaurant_id)

    restaurant.has_photos = False
    # A temporary list to hold the photo data while it is being parsed
    temp_photos = []
    if len(photo_feed.entry) > 0:
      restaurant.has_photos = True
      for photo_entry in photo_feed.entry:
        temp_photos.append(self._process_picasa_photo_data(photo_entry))
      restaurant.photos = temp_photos
    # Remember whether we searched the YT and PWA APIs for metadata
    restaurant.metadata_has_been_searched = True

    if cache_metadata is True:
      self._cache_restaurant(restaurant)
    return restaurant
  
  def _process_picasa_photo_data(self, photo_entry):
    """ Process data retrieved from the PicasaWebAlbums API.
    
    This method takes the gdata.photos.PhotoEntry object and creates a stock
    dictionary out of it, keeping only metadata that is relevant to this
    application.
    
    Args:
      photo_entry: A gdata.photos.PhotoEntry object.
      
    Returns:
      A dictionary with relevant metadata. 
    """
    photo = {}
    photo['author_uri'] = photo_entry.author[0].uri.text
    photo['author_name'] = photo_entry.author[0].name.text
    photo['title'] = photo_entry.media.title.text or ''
    photo['description'] = photo_entry.media.description.text or ''
    photo['keywords'] = ''
    if photo_entry.media.keywords is not None:
      photo['keywords'] = photo_entry.media.keywords.text
    
    # This could be handled more elegantly in a later version
    photo['published'] = photo_entry.published.text[:10]
    for link in photo_entry.link:
      if link.rel == 'alternate':
        photo['alt_link_href'] = link.href
    thumbnail = photo_entry.media.thumbnail[0]
    photo['thumbnail_url'] = thumbnail.url
    photo['thumbnail_width'] = thumbnail.width
    photo['thumbnail_height'] = thumbnail.height
    return photo
  
  def search(self, term, location):
    """ Performs a search for restaurants in a specific location.
    
    Results returned from this method will be models.Restaurant instances, but
    not necessarily written to the data store, to prevent the store being
    flooded with every search result.  This way, we only store restaurants that
    have been bookmarked by at least one user.
    
    Args:
      term: The search term to use.
      location: A string representing the location to search in.
    
    Returns:
      A list of models.Restaurant objects corresponding to the results of the
      query, or None if no restaurants were found.
    """
    restaurants = self._yql_restaurant_search(term, location)
    if restaurants:
      for restaurant in restaurants:
        self._cache_restaurant(restaurant)
    return restaurants
    
  def get_restaurant(self, restaurant_id):
    """ Gets a single restaurant by ID.
    
    Args:
      The ID of the restaurant to fetch.
      
    Returns:
      The models.Restaurant object with the data corresponding to the restaurant
      with the given ID number, or None if no results were found.
    """
    restaurant = self._cache_get_restaurant(restaurant_id)
    if restaurant is None:
      restaurant = self._yql_restaurant_get(restaurant_id)
      self.cache_restaurant(restaurant)
    return restaurant
