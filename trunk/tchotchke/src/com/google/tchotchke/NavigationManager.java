package com.google.tchotchke;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.Map;
import java.util.logging.Logger;

import javax.servlet.http.HttpServletRequest;

/**
 * The NavigationManager is a simple class that allows the widget to redirect
 * users to different "views" of itself by altering the query parameters
 * that are carried over.
 *
 */
public class NavigationManager {
  
  // An enum of all valid query parameters
  private enum ValidQueryParameter {
    page, articleId
  }
  
  private static final Logger log = Logger.getLogger(NavigationManager.class
      .getName());
  
  private HttpServletRequest request;
  
  public NavigationManager(HttpServletRequest request) {
    this.request = request;
  }

  /**
   * 
   * @return The URL to the logout servlet
   */
  public String getLogoutLink() {
    return generateUrl("/logout");
  }

  /**
   * 
   * @return The URL to the servlet where video metadata is POSTed to
   */
  public String getVideoMetaDataLink() {
    return generateUrl("/uploadVideo");
  }
  
  /**
   * 
   * @return The URL to the main screen listing approved videos for the 
   *   current article ID.
   */
  public String getVideoWidgetLink() {
    return getVideoWidgetLink(null);
  }

  /**
   * 
   * @param params Specific URL parameters (key/value) to include in the URL.
   * @return The URL to the main screen listing approved videos for the 
   *   current article ID.
   */
  public String getVideoWidgetLink(Map<String, String> params) {
    return generateUrl("/", params);
  }
  
  /**
   * 
   * @param params Specific URL parameters (key/value) to include in the URL.
   * @return The URL to the moderation console
   */
  public String getModerationLink(Map<String, String> params) {
    return generateUrl("/moderate", params);
  }
  
  /**
   * Create a link to a specific servlet in the application
   * @param destination URL of where to send the user, relative to the domain
   * @return The desired URL
   */
  private String generateUrl(String destination) {
    return generateUrl(destination, null);
  }

  /**
   * Create a link to a specific servlet in the program while preserving query
   * parameters.
   * 
   * @param destination URL of where to send the user, relative to the domain
   * @param extraParams Any additional one-off query parameters that should be added.
   * @return The desired URL
   */
  private String generateUrl(String destination, 
      Map<String, String> extraParams) {
    StringBuilder url = new StringBuilder(destination);
    boolean hasQueryParams = false;
    
    for (ValidQueryParameter param : ValidQueryParameter.values()) {
      String value = request.getParameter(param.name());
      if (value != null) {
        if (hasQueryParams) {
          url.append("&");
        } else {
          url.append("?");
          hasQueryParams = true;
        }

        url.append(param.name()).append("=");
        
        try {
          url.append(URLEncoder.encode(value, "UTF-8"));
        } catch (UnsupportedEncodingException e) {
          log.severe("Sky is falling. UTF-8 isn't a valid encoding.");
        }
      }
    }
    
    if(extraParams != null) {
      for (String param : extraParams.keySet()) {
        String value = extraParams.get(param);
        if (value != null) {
          if (hasQueryParams) {
            url.append("&");
          } else {
            url.append("?");
            hasQueryParams = true;
          }
          
          url.append(param).append("=");
          
          try {
            url.append(URLEncoder.encode(value, "UTF-8"));
          } catch (UnsupportedEncodingException e) {
            log.severe("Sky is falling. UTF-8 isn't a valid encoding.");
          }
        }
      }
    }

    return url.toString();
  }
}
