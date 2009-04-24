package com.google.tchotchke;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import com.google.tchotchke.model.VideoSubmission;

public class VideoWidgetController {

  private NavigationManager navMan;

  private HttpServletRequest request;

  private List<VideoSubmission> submissions;

  private String nextStart;

  private String prevStart;

  /**
   * @param session
   * @throws IOException
   */
  public VideoWidgetController(HttpServletRequest req) throws IOException {
    this.request = req;
    this.navMan = new NavigationManager(req);
    fetchVideoSubmissions();
  }

  private void fetchVideoSubmissions() throws IOException {

    DatastoreManager dm = new DatastoreManager();

    String articleId = request.getParameter("articleId");

    if (articleId == null) {
      return;
    }

    String startIndex = request.getParameter("startIndex");

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

  public boolean hasNextPage() {
    return (nextStart != null);
  }

  public String getNextPageUrl() {
    Map<String, String> params = new HashMap<String, String>();
    params.put("startIndex", nextStart);
    return navMan.getVideoWidgetLink(params);
  }

  public boolean hasPrevPage() {
    return (prevStart != null);
  }

  public String getPrevPageUrl() {
    Map<String, String> params = new HashMap<String, String>();
    params.put("startIndex", prevStart);
    return navMan.getVideoWidgetLink(params);
  }

}
