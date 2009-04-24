package com.google.tchotchke;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.logging.Logger;

import com.google.gdata.client.youtube.YouTubeService;
import com.google.gdata.data.youtube.FormUploadToken;
import com.google.gdata.data.youtube.UserProfileEntry;
import com.google.gdata.data.youtube.VideoEntry;
import com.google.gdata.util.ServiceException;

public class YouTubeApiManager {

  private YouTubeService service = null;
  private static final String userEntry = "http://gdata.youtube.com/feeds/api/users/default";
  private static final Logger log = Logger.getLogger(YouTubeApiManager.class
      .getName());

  public YouTubeApiManager() {
    service = new YouTubeService(System
        .getProperty("com.google.tchotchke.YTClientID"), System
        .getProperty("com.google.tchotchke.YTDeveloperKey"));
  }

  public void setToken(String token) {
    service.setAuthSubToken(token);
  }

  public String getCurrentUsername() {
    try {

      log.info("Attempting to get username from YouTube");
      UserProfileEntry profile = service.getEntry(new URL(userEntry),
          UserProfileEntry.class);

      return profile.getUsername();
    } catch (Exception e) {
      log.warning("Fetching username failed: " + e.getMessage());
      return null;
    }
  }

  public FormUploadToken getFormUploadToken(VideoEntry newEntry)
      throws ServiceException, IOException {
    try {
      URL uploadUrl = new URL("http://gdata.youtube.com/action/GetUploadToken");
      return service.getFormUploadToken(uploadUrl, newEntry);
    } catch (MalformedURLException e) {
      log.severe("Hard-coded URL fails to parse!");
    }
    return null;
  }

}
