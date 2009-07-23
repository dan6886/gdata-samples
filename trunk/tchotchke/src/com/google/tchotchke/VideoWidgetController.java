package com.google.tchotchke;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import com.google.tchotchke.model.VideoSubmission;

/**
 * Controller class for VideoWidget.jsp that contains many convenience functions
 * that you don't really want to inline inside of a JSP page.
 * 
 * This is the basic page that will display approved videos to a user for a
 * given article and provide pagination through them.
 */
public class VideoWidgetController {

  // Helper class for doing URL redirecting
  private NavigationManager navMan;

  private HttpServletRequest request;

  // The current page of results for the given article
  private List<VideoSubmission> submissions;

  // The app engine index for the next page of results
  private String nextStart;

  // The app engine index for the previous page of results
  private String prevStart;

  /**
   * Initialize self and retrieve the first page of videos.
   * @throws IOException
   */
  public VideoWidgetController(HttpServletRequest req) throws IOException {
    this.request = req;
    this.navMan = new NavigationManager(req);
    fetchVideoSubmissions();
  }

  /**
   * Retrieve approved videos from the datastore.
   * @throws IOException
   */
  private void fetchVideoSubmissions() throws IOException {

    DatastoreManager dm = new DatastoreManager();

    // key off the query parameter articleId
    String articleId = request.getParameter("articleId");

    if (articleId == null) {
      return;
    }

    String startIndex = request.getParameter("startIndex");

    try {
      submissions = dm.getVideoSubmissionsForArticle(articleId,
          DatastoreManager.DEFAULT_PAGE_SIZE, true, startIndex, false);
      if (submissions.size() == DatastoreManager.DEFAULT_PAGE_SIZE) {
        nextStart = submissions.get(submissions.size() - 1).getCreatedIndex();
      }
  
      if (startIndex != null) {
        List<VideoSubmission> prevResults = dm
            .getVideoSubmissionsForArticle(articleId,
                DatastoreManager.DEFAULT_PAGE_SIZE, true, startIndex, true);
        if (prevResults.size() > 0) {
          prevStart = prevResults.get(prevResults.size() - 1).getCreatedIndex();
        }
      }
    }
    catch (Exception e) {
      return;
    }
  }

  /**
   * Convenience method for the JSP page to loop over all video submissions.
   * @return A page of video submissions for the current article
   */
  public List<VideoSubmission> getVideoSubmissions() {

    // trim off the last member, it is just there to give us the start index of
    // the next page
    if (submissions != null
        && submissions.size() == DatastoreManager.DEFAULT_PAGE_SIZE) {
      return submissions.subList(0, submissions.size() - 2);
    } else {
      return submissions;
    }
  }

  /**
   * Convenience method for the JSP page to get a JavaScript variable containing
   * a list of approved YouTube videos to display to the user.
   * @return A comma separated string of YouTube video IDs
   */
  public String getVideoSubmissionsAsString() {
    StringBuilder sb = new StringBuilder();
    boolean first = true;
    List<VideoSubmission> subs = getVideoSubmissions();
    if (subs == null) {
      return "";
    }
    for (VideoSubmission sub : subs) {
      if (first) {
        first = false;
      } else {
        sb.append(",");
      }
      sb.append(sub.getVideoId());
    }
    return sb.toString();
  }

  /**
   * Check if there are more videos to display.
   * @return true if there are more videos to display
   */
  public boolean hasNextPage() {
    return (nextStart != null);
  }

  /**
   * 
   * @return A URL to the next page of results
   */
  public String getNextPageUrl() {
    Map<String, String> params = new HashMap<String, String>();
    params.put("startIndex", nextStart);
    return navMan.getVideoWidgetLink(params);
  }

  /**
   * 
   * @return true if there is a previous page of videos to display
   */
  public boolean hasPrevPage() {
    return (prevStart != null);
  }

  /**
   * 
   * @return A URL to get back to the previous page of results
   */
  public String getPrevPageUrl() {
    Map<String, String> params = new HashMap<String, String>();
    params.put("startIndex", prevStart);
    return navMan.getVideoWidgetLink(params);
  }
}
