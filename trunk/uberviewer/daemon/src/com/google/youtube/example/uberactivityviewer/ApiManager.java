package com.google.youtube.example.uberactivityviewer;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;

import com.google.gdata.client.youtube.YouTubeService;
import com.google.gdata.data.youtube.UserEventFeed;
import com.google.gdata.util.NotModifiedException;
import com.google.gdata.util.ServiceException;

public class ApiManager {
  
  private YouTubeService service;
  
  private final String activityFeedUrlPrefix = "http://gdata.youtube.com/feeds/api/users/";
  private final String activityFeedUrlSuffix = "/events";

  public ApiManager(ConfigData config) {
    service = new YouTubeService(config.getClientId(), config.getDevKey());
  }

  public UserEventFeed getActivityFeed(String username, String etag, String publishedMin) throws ApiException, NotModifiedException {
    
    UserEventFeed feed = null;
    
    try {
      StringBuffer url = new StringBuffer(activityFeedUrlPrefix);
      url.append(username).append(activityFeedUrlSuffix);
      if(publishedMin != null) {
        url.append("?published-min=");
        url.append(publishedMin);
      }
      feed = service.getFeed(new URL(url.toString()), UserEventFeed.class, etag);
    } catch (MalformedURLException e) {
      throw new ApiException("Hard-coded activity URL malformed!", e);
    } catch (IOException e) {
      throw new ApiException("I/O error when communicating with API", e);
    } catch(NotModifiedException e) { 
      throw e;
    } catch (ServiceException e) {
      throw new ApiException("Problem retrieving activity feed from API", e);
    }
    return feed;
  }

}
